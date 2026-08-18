/**
 * SkillHub 同步脚本
 *
 * 数据流：sources.json（仓库列表）
 *   → 引用型仓库（热门/官方）：GitHub REST API 取元数据 + git tree 定位所有 SKILL.md，
 *     raw.githubusercontent.com 拉内容（不走 API 配额）
 *   → 存档型仓库（sources.json 标 vendor:true 的零散小仓库）：正文直接读本地 vendored/
 *     存档副本（见 scripts/vendor.ts），上游删库也照样出数据，仓库链接仍指向原 GitHub
 *   → gray-matter 解析 frontmatter
 *   → 写入 SQLite（data/skills.db，本机权威存储，可做分析/增量）
 *   → 导出 public/data/skills.json 快照（网页运行时数据源，提交进仓库）
 *
 * 运行：npm run sync
 * 建议：设置 GITHUB_TOKEN 环境变量（未设置时仓库 API 仅 60 次/小时）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import matter from "gray-matter";
import type { SkillSnapshot, SkillScore } from "../src/lib/types";
import { scoreSkill } from "../src/lib/score";
import { assignCategory } from "../src/lib/categories";
import { scanSkill } from "../src/lib/security";
import { pickBestByKey } from "../src/lib/dedup";
import {
  SITE_REPO,
  archiveUrl,
  skillFiles,
  vendorDir,
  vendorPath,
  type MirrorManifest,
} from "../src/lib/vendor";

const ROOT = join(import.meta.dirname, "..");
const DB_PATH = join(ROOT, "data", "skills.db");
const OUT_PATH = join(ROOT, "public", "data", "skills.json");
const BODIES_PATH = join(ROOT, "public", "data", "bodies.json");
const SOURCES_PATH = join(ROOT, "sources.json");
const API = "https://api.github.com";

/** 单个 SKILL.md 正文大小上限，防止把仓库里的巨型文件灌进 DB */
const MAX_SKILL_BYTES = 200_000;

interface Source {
  repo: string;
  note?: string;
  /** 官方来源标记（如 anthropics、vercel-labs），页面展示 Official 徽章 */
  official?: boolean;
  /** true = 已用 npm run vendor 存进本仓库，正文读本地存档而非上游 */
  vendor?: boolean;
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
  category: string;
  /** 存档信息 JSON（引用型仓库为 null），见 src/lib/vendor.ts */
  mirror: string | null;
}

/** 存档型仓库在 repos 表里存的那一小段 JSON */
interface RepoMirror {
  commit: string;
  mirroredAt: string;
  /** 同步时上游已无法访问 */
  upstreamGone: boolean;
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
      official       INTEGER NOT NULL DEFAULT 0,
      mirror         TEXT        -- JSON：存档信息（commit/mirroredAt/upstreamGone），引用型仓库为 NULL
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
      category       TEXT NOT NULL DEFAULT 'general',
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
  // 迁移：老库补上存档信息列
  if (!repoCols.some((c) => c.name === "mirror")) {
    db.exec(`ALTER TABLE repos ADD COLUMN mirror TEXT`);
    console.log("ℹ️ 迁移：repos 表已补 mirror 列");
  }
  // 迁移：老库补上分类列
  if (!skillCols.some((c) => c.name === "category")) {
    db.exec(`ALTER TABLE skills ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`);
    console.log("ℹ️ 迁移：skills 表已补 category 列");
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

/** 解析后的技能行（写库 + 导出快照都用它） */
interface ParsedSkill {
  path: string;
  name: string;
  description: string;
  content: string;
  tags: string;
  author: string | null;
  version: string | null;
  license: string | null;
  score: SkillScore;
  category: string;
}

/** 解析一份 SKILL.md：frontmatter → 评分 → 归类，坏数据返回 null 不中断同步 */
function parseSkill(
  raw: string,
  path: string,
  info: RepoInfo,
  official: boolean
): ParsedSkill | null {
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
  const author = data.author ? String(data.author) : null;
  const version = data.version ? String(data.version) : null;
  const license = data.license ? String(data.license) : null;
  const score = scoreSkill({
    name,
    description,
    body: content,
    tags,
    author,
    version,
    license,
    repoDescription: info.description,
    repoStars: info.stars,
    repoUpdatedAt: info.updatedAt,
  });
  const snapshot = {
    id: `${info.fullName}/${name}`,
    name,
    description,
    body: content,
    tags,
    author,
    version,
    license,
    install: `npx skills add ${info.fullName} --skill ${name}`,
    score,
    official,
    repo: {
      fullName: info.fullName,
      description: info.description,
      stars: info.stars,
      htmlUrl: info.htmlUrl,
      updatedAt: info.updatedAt,
    },
    path,
  } as SkillSnapshot;
  snapshot.category = assignCategory(snapshot);
  return {
    path,
    name,
    description,
    content,
    tags: JSON.stringify(tags),
    author,
    version,
    license,
    score,
    category: snapshot.category,
  };
}

/** 读取某个仓库的存档清单（没存档过返回 null） */
function readManifest(fullName: string): MirrorManifest | null {
  const p = join(ROOT, vendorDir(fullName), "MIRROR.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as MirrorManifest;
  } catch {
    console.warn(`  ⚠️ ${vendorDir(fullName)}/MIRROR.json 解析失败，按未存档处理`);
    return null;
  }
}

/** 从本地存档读一份 SKILL.md 正文 */
function readVendored(fullName: string, path: string): string | null {
  const p = join(ROOT, vendorPath(fullName, path));
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  return Buffer.byteLength(text, "utf8") > MAX_SKILL_BYTES ? null : text;
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
    INSERT INTO repos (full_name, description, stars, html_url, default_branch, updated_at, last_synced_at, official, mirror)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(full_name) DO UPDATE SET
      description = excluded.description,
      stars = excluded.stars,
      html_url = excluded.html_url,
      default_branch = excluded.default_branch,
      updated_at = excluded.updated_at,
      last_synced_at = excluded.last_synced_at,
      official = excluded.official,
      mirror = excluded.mirror
  `);
  const upsertSkill = db.prepare(`
    INSERT INTO skills (repo_full_name, path, name, description, body, tags, author, version, license, score, score_detail, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(repo_full_name, path) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      body = excluded.body,
      tags = excluded.tags,
      author = excluded.author,
      version = excluded.version,
      license = excluded.license,
      score = excluded.score,
      score_detail = excluded.score_detail,
      category = excluded.category
  `);

  let totalSkills = 0;
  for (const { repo: fullName, official, vendor } of sources) {
    const { owner, repo } = parseRepo(fullName);
    console.log(`\n📦 ${fullName}${vendor ? "  🗄️ 存档" : ""}`);

    const manifest = vendor ? readManifest(fullName) : null;
    if (vendor && !manifest) {
      console.warn("  ⚠️ 标了 vendor 但还没有存档副本，本次退回实时抓取（补跑 npm run vendor）");
    }

    // 存档型仓库：上游只用来刷新星数/描述，拿不到就用存档里的元数据快照兜底
    const live = await fetchRepoInfo(owner, repo);
    if (!live && !manifest) continue;
    const info: RepoInfo = live ?? {
      fullName: manifest!.repo,
      description: manifest!.description,
      stars: manifest!.stars,
      htmlUrl: manifest!.htmlUrl,
      defaultBranch: manifest!.branch,
      updatedAt: manifest!.updatedAt,
    };
    const mirror: RepoMirror | null = manifest
      ? {
          commit: manifest.commit,
          mirroredAt: manifest.mirroredAt,
          upstreamGone: live === null,
        }
      : null;
    if (mirror?.upstreamGone) {
      console.log("  🗄️ 上游已无法访问 —— 用存档副本继续同步");
    }
    upsertRepo.run(
      info.fullName,
      info.description,
      info.stars,
      info.htmlUrl,
      info.defaultBranch,
      info.updatedAt,
      now,
      official ? 1 : 0,
      mirror ? JSON.stringify(mirror) : null
    );

    const paths = manifest
      ? skillFiles(manifest)
      : await listSkillPaths(owner, repo, info.defaultBranch);
    if (!paths.length) {
      console.log("  （未找到 SKILL.md）");
      continue;
    }

    // 存档型直接读本地文件；引用型并行拉取（内容走 raw 不限流），结果顺序与 paths 一致
    const parsed = await mapLimit(paths, 8, async (path) => {
      const raw = manifest
        ? readVendored(fullName, path)
        : await fetchRaw(owner, repo, info.defaultBranch, path);
      if (raw === null) {
        console.warn(
          manifest
            ? `  ⚠️ 跳过 ${path}（存档文件缺失，重跑 npm run vendor）`
            : `  ⚠️ 跳过 ${path}（拉取失败或超过 ${MAX_SKILL_BYTES / 1024}KB）`
        );
        return null;
      }
      return parseSkill(raw, path, info, official === true);
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
        JSON.stringify(skill.score),
        skill.category
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
      `SELECT s.*, r.description AS repo_description, r.stars, r.html_url, r.updated_at, r.official, r.mirror
       FROM skills s JOIN repos r ON r.full_name = s.repo_full_name
       ORDER BY r.stars DESC, s.name ASC`
    )
    .all() as unknown as SkillRow[];

  // 同一 id（repo + name）去重：合集仓库里重名技能常有多份镜像 SKILL.md，
  // 保留路径更短（更规范）且正文更全的一份，避免页面 key 冲突与重复详情页
  const deduped = pickBestByKey(
    rows,
    (row) => `${row.repo_full_name}/${row.name}`,
    (a, b) =>
      a.path.length < b.path.length ||
      (a.path.length === b.path.length &&
        (a.body?.length ?? 0) > (b.body?.length ?? 0))
  );
  const dropped = rows.length - deduped.length;

  const skills: SkillSnapshot[] = [...deduped.values()].map((row) => {
    const name = row.name;
    const install = `npx skills add ${row.repo_full_name} --skill ${name}`;
    const mirror = row.mirror ? (JSON.parse(row.mirror) as RepoMirror) : null;
    const skillDir = dirname(row.path);
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
      category: row.category,
      security: scanSkill(row.body ?? ""),
      ...(mirror
        ? {
            mirror: {
              dir: vendorPath(row.repo_full_name, skillDir),
              commit: mirror.commit,
              mirroredAt: mirror.mirroredAt,
              archiveUrl: archiveUrl(row.repo_full_name, skillDir),
              ...(mirror.upstreamGone ? { upstreamGone: true } : {}),
            },
          }
        : {}),
      repo: {
        fullName: row.repo_full_name,
        description: row.repo_description,
        stars: row.stars,
        htmlUrl: row.html_url,
        updatedAt: row.updated_at,
      },
    };
  });

  // 备用安装命令：技能名在存档集合里唯一时，可直接从 SkillHub 仓库装存档副本
  const mirroredNames = new Map<string, number>();
  for (const s of skills) {
    if (s.mirror) mirroredNames.set(s.name, (mirroredNames.get(s.name) ?? 0) + 1);
  }
  for (const s of skills) {
    if (s.mirror && mirroredNames.get(s.name) === 1) {
      s.mirror.installFallback = `npx skills add ${SITE_REPO} --skill ${s.name}`;
    }
  }

  // 拆分快照：skills.json 只存元数据（列表页数据源，瘦身 90%+），
  // bodies.json 按 id 索引正文（详情页 / API 按需合并）。
  const meta: Omit<SkillSnapshot, "body">[] = skills.map(({ body: _body, ...rest }) => rest);
  const bodies: Record<string, string> = {};
  for (const s of skills) bodies[s.id] = s.body ?? "";

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(meta, null, 2) + "\n");
  writeFileSync(BODIES_PATH, JSON.stringify(bodies) + "\n");
  const mirrored = skills.filter((s) => s.mirror).length;
  const suffix = dropped > 0 ? `（去重 ${dropped} 个重名）` : "";
  const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;
  const metaBytes = Buffer.byteLength(JSON.stringify(meta));
  const bodyBytes = Buffer.byteLength(JSON.stringify(bodies));
  console.log(
    `\n📄 导出 ${skills.length} 个技能${suffix} → ${OUT_PATH}（${kb(metaBytes)}，瘦身 ${kb(7_000_000 - metaBytes)}）`
  );
  console.log(`   📄 正文索引 ${Object.keys(bodies).length} 条 → ${BODIES_PATH}（${kb(bodyBytes)}）`);
  if (mirrored) console.log(`   🗄️  其中 ${mirrored} 个来自本仓库存档（vendored/）`);
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
