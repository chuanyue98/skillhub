/**
 * SkillHub 同步脚本
 *
 * 数据流：sources.json（仓库列表）
 *   → GitHub REST API 取仓库元数据 + git tree 定位所有 SKILL.md
 *   → raw.githubusercontent.com 拉内容（不走 API 配额）
 *   → gray-matter 解析 frontmatter
 *   → 写入 SQLite（data/skills.db，本机权威存储，可做分析/增量）
 *   → 导出 public/data/skills.json 快照（网页运行时数据源，提交进仓库）
 *
 * 运行：npm run sync
 * 建议：设置 GITHUB_TOKEN 环境变量（未设置时仓库 API 仅 60 次/小时）
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import matter from "gray-matter";
import type { SkillSnapshot, SkillScore } from "../src/lib/types";
import { scoreSkill } from "../src/lib/score";

const ROOT = join(import.meta.dirname, "..");
const DB_PATH = join(ROOT, "data", "skills.db");
const OUT_PATH = join(ROOT, "public", "data", "skills.json");
const SOURCES_PATH = join(ROOT, "sources.json");
const API = "https://api.github.com";

/** 单个 SKILL.md 正文大小上限，防止把仓库里的巨型文件灌进 DB */
const MAX_SKILL_BYTES = 200_000;

interface Source {
  repo: string;
  note?: string;
  /** 官方来源标记（如 anthropics、vercel-labs），页面展示 Official 徽章 */
  official?: boolean;
}

interface RepoInfo {
  fullName: string;
  description: string;
  stars: number;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
}

interface SkillRow {
  repo_full_name: string;
  path: string;
  name: string;
  description: string;
  body: string;
  tags: string;
  author: string | null;
  version: string | null;
  license: string | null;
  score: number;
  score_detail: string;
  repo_description: string;
  stars: number;
  html_url: string;
  updated_at: string;
  official: number;
}

const token = process.env.GITHUB_TOKEN;

/** 单请求超时，防止某个连接挂起拖死整个同步 */
const TIMEOUT_MS = 20_000;

/** 带认证头的 GitHub REST 请求 */
async function githubGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skillhub-sync",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function openDb(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      full_name      TEXT PRIMARY KEY,
      description    TEXT,
      stars          INTEGER,
      html_url       TEXT,
      default_branch TEXT,
      updated_at     TEXT,
      last_synced_at TEXT,
      official       INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS skills (
      repo_full_name TEXT NOT NULL REFERENCES repos(full_name),
      path           TEXT NOT NULL,
      name           TEXT NOT NULL,
      description    TEXT,
      body           TEXT,
      tags           TEXT,       -- JSON 数组
      author         TEXT,
      version        TEXT,
      license        TEXT,
      score          INTEGER NOT NULL DEFAULT 0,
      score_detail   TEXT,       -- JSON：SkillScore 明细
      PRIMARY KEY (repo_full_name, path)
    );
  `);

  // 迁移：老库补上质量评分列（CREATE TABLE IF NOT EXISTS 不会加列）
  const skillCols = db.prepare(`PRAGMA table_info(skills)`).all() as unknown as {
    name: string;
  }[];
  if (!skillCols.some((c) => c.name === "score")) {
    db.exec(`ALTER TABLE skills ADD COLUMN score INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE skills ADD COLUMN score_detail TEXT`);
    console.log("ℹ️ 迁移：skills 表已补 score / score_detail 列");
  }
  // 迁移：老库补上官方来源标记列
  const repoCols = db.prepare(`PRAGMA table_info(repos)`).all() as unknown as {
    name: string;
  }[];
  if (!repoCols.some((c) => c.name === "official")) {
    db.exec(`ALTER TABLE repos ADD COLUMN official INTEGER NOT NULL DEFAULT 0`);
    console.log("ℹ️ 迁移：repos 表已补 official 列");
  }
  return db;
}

function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`非法仓库名: ${fullName}（应为 owner/repo）`);
  return { owner, repo };
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return raw.split(/[,\s]+/).filter(Boolean);
  return [];
}

async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo | null> {
  try {
    const data = await githubGet<{
      full_name?: string;
      description?: string | null;
      stargazers_count?: number;
      html_url?: string;
      default_branch?: string;
      pushed_at?: string | null;
    }>(`/repos/${owner}/${repo}`);
    return {
      fullName: data.full_name ?? `${owner}/${repo}`,
      description: data.description ?? "",
      stars: data.stargazers_count ?? 0,
      htmlUrl: data.html_url ?? "",
      defaultBranch: data.default_branch ?? "main",
      updatedAt: data.pushed_at ?? "",
    };
  } catch (err) {
    console.warn(`  ⚠️ 获取仓库信息失败，跳过：${(err as Error).message}`);
    return null;
  }
}

async function listSkillPaths(
  owner: string,
  repo: string,
  branch: string
): Promise<string[]> {
  try {
    const data = await githubGet<{ tree?: { type?: string; path?: string }[] }>(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return (data.tree ?? [])
      .filter((entry) => entry.type === "blob" && entry.path?.endsWith("SKILL.md"))
      .map((entry) => entry.path!)
      .sort();
  } catch (err) {
    console.warn(`  ⚠️ 获取 git tree 失败：${(err as Error).message}`);
    return [];
  }
}

/** 并发受限的 map：固定 worker 数，避免几百个 raw 请求排队拖慢同步 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** 内容走 raw 域名，不受 GitHub API 速率限制 */
async function fetchRaw(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const text = await res.text();
    return Buffer.byteLength(text, "utf8") > MAX_SKILL_BYTES ? null : text;
  } catch {
    return null;
  }
}

async function sync(): Promise<void> {
  const sources = JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as Source[];
  if (!sources.length) {
    console.error("❌ sources.json 为空，先添加要聚合的仓库");
    process.exit(1);
  }
  if (!token) {
    console.log("ℹ️ 未设置 GITHUB_TOKEN：仓库 API 按 60 次/小时未认证配额；内容走 raw 不限流");
  }

  const db = openDb();
  const now = new Date().toISOString();

  const upsertRepo = db.prepare(`
    INSERT INTO repos (full_name, description, stars, html_url, default_branch, updated_at, last_synced_at, official)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(full_name) DO UPDATE SET
      description = excluded.description,
      stars = excluded.stars,
      html_url = excluded.html_url,
      default_branch = excluded.default_branch,
      updated_at = excluded.updated_at,
      last_synced_at = excluded.last_synced_at,
      official = excluded.official
  `);
  const upsertSkill = db.prepare(`
    INSERT INTO skills (repo_full_name, path, name, description, body, tags, author, version, license, score, score_detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(repo_full_name, path) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      body = excluded.body,
      tags = excluded.tags,
      author = excluded.author,
      version = excluded.version,
      license = excluded.license,
      score = excluded.score,
      score_detail = excluded.score_detail
  `);

  let totalSkills = 0;
  for (const { repo: fullName, official } of sources) {
    const { owner, repo } = parseRepo(fullName);
    console.log(`\n📦 ${fullName}`);

    const info = await fetchRepoInfo(owner, repo);
    if (!info) continue;
    upsertRepo.run(
      info.fullName,
      info.description,
      info.stars,
      info.htmlUrl,
      info.defaultBranch,
      info.updatedAt,
      now,
      official ? 1 : 0
    );

    const paths = await listSkillPaths(owner, repo, info.defaultBranch);
    if (!paths.length) {
      console.log("  （未找到 SKILL.md）");
      continue;
    }

    // 并行拉取+解析（内容走 raw 不限流），结果顺序与 paths 一致
    const parsed = await mapLimit(paths, 8, async (path) => {
      const raw = await fetchRaw(owner, repo, info.defaultBranch, path);
      if (raw === null) {
        console.warn(`  ⚠️ 跳过 ${path}（拉取失败或超过 ${MAX_SKILL_BYTES / 1024}KB）`);
        return null;
      }
      let data: Record<string, unknown>;
      let content: string;
      try {
        ({ data, content } = matter(raw));
      } catch {
        console.warn(`  ⚠️ 跳过 ${path}（frontmatter 不是合法 YAML）`);
        return null;
      }
      const name = String(data.name ?? slugify(dirname(path).split("/").pop() ?? path)).trim();
      const description = String(data.description ?? "").trim();
      if (!name || !description) {
        console.warn(`  ⚠️ 跳过 ${path}（缺 name 或 description）`);
        return null;
      }
      const tags = normalizeTags(data.tags);
      const score = scoreSkill({
        name,
        description,
        body: content,
        tags,
        author: data.author ? String(data.author) : null,
        version: data.version ? String(data.version) : null,
        license: data.license ? String(data.license) : null,
        repoDescription: info.description,
        repoStars: info.stars,
        repoUpdatedAt: info.updatedAt,
      });
      return {
        path,
        name,
        description,
        content,
        tags: JSON.stringify(tags),
        author: data.author ? String(data.author) : null,
        version: data.version ? String(data.version) : null,
        license: data.license ? String(data.license) : null,
        score,
      };
    });

    for (const skill of parsed) {
      if (!skill) continue;
      upsertSkill.run(
        info.fullName,
        skill.path,
        skill.name,
        skill.description,
        skill.content,
        skill.tags,
        skill.author,
        skill.version,
        skill.license,
        skill.score.total,
        JSON.stringify(skill.score)
      );
      totalSkills++;
      console.log(`  ✅ ${skill.name} (${skill.path})`);
    }
  }

  exportSnapshot(db);
  printStats(db);
  console.log(`\n🎉 同步完成：${sources.length} 个仓库，${totalSkills} 个技能`);
}

function exportSnapshot(db: DatabaseSync): void {
  const rows = db
    .prepare(
      `SELECT s.*, r.description AS repo_description, r.stars, r.html_url, r.updated_at, r.official
       FROM skills s JOIN repos r ON r.full_name = s.repo_full_name
       ORDER BY r.stars DESC, s.name ASC`
    )
    .all() as unknown as SkillRow[];

  // 同一 id（repo + name）去重：合集仓库里重名技能常有多份镜像 SKILL.md，
  // 保留路径更短（更规范）且正文更全的一份，避免页面 key 冲突与重复详情页
  const deduped = new Map<string, SkillRow>();
  const better = (a: SkillRow, b: SkillRow): boolean =>
    a.path.length < b.path.length ||
    (a.path.length === b.path.length &&
      (a.body?.length ?? 0) > (b.body?.length ?? 0));
  for (const row of rows) {
    const key = `${row.repo_full_name}/${row.name}`;
    const cur = deduped.get(key);
    if (!cur || better(row, cur)) deduped.set(key, row);
  }
  const dropped = rows.length - deduped.size;

  const skills: SkillSnapshot[] = [...deduped.values()].map((row) => {
    const name = row.name;
    const install = `npx skills add ${row.repo_full_name} --skill ${name}`;
    return {
      id: `${row.repo_full_name}/${name}`,
      name,
      description: row.description,
      body: row.body,
      tags: JSON.parse(row.tags) as string[],
      author: row.author ?? undefined,
      version: row.version ?? undefined,
      license: row.license ?? undefined,
      path: row.path,
      install,
      score: JSON.parse(row.score_detail) as SkillScore,
      official: row.official === 1,
      repo: {
        fullName: row.repo_full_name,
        description: row.repo_description,
        stars: row.stars,
        htmlUrl: row.html_url,
        updatedAt: row.updated_at,
      },
    };
  });

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(skills, null, 2) + "\n");
  const suffix = dropped > 0 ? `（去重 ${dropped} 个重名）` : "";
  console.log(`\n📄 导出 ${skills.length} 个技能${suffix} → ${OUT_PATH}`);
}

function printStats(db: DatabaseSync): void {
  const repos = db.prepare("SELECT COUNT(*) AS n FROM repos").get() as { n: number };
  const skills = db.prepare("SELECT COUNT(*) AS n FROM skills").get() as { n: number };
  const tags = db.prepare("SELECT tags FROM skills").all() as unknown as { tags: string }[];
  const counts = new Map<string, number>();
  for (const row of tags) {
    for (const tag of JSON.parse(row.tags) as string[]) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const scored = db
    .prepare("SELECT score, score_detail FROM skills")
    .all() as unknown as { score: number; score_detail: string }[];
  const levels = { A: 0, B: 0, C: 0, D: 0 };
  let sum = 0;
  for (const row of scored) {
    levels[(JSON.parse(row.score_detail) as SkillScore).level]++;
    sum += row.score;
  }
  const avg = scored.length ? (sum / scored.length).toFixed(1) : "0";

  console.log(`\n📊 SQLite (${DB_PATH})：${repos.n} 个仓库，${skills.n} 个技能`);
  console.log(`   热门标签：${top.map(([t, n]) => `${t}(${n})`).join("  ") || "无"}`);
  console.log(`   质量评分：平均 ${avg} 分  A(${levels.A}) B(${levels.B}) C(${levels.C}) D(${levels.D})`);
}

sync().catch((err) => {
  console.error("❌ 同步失败：", err);
  process.exit(1);
});
