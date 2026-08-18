/**
 * SkillHub 存档脚本：把零散小仓库的技能整份镜像进本仓库，防止上游消失。
 *
 * 用法：
 *   npm run vendor                       # 存档 sources.json 里所有 vendor:true 的仓库
 *   npm run vendor -- owner/repo         # 存档指定仓库（不在 sources.json 里会自动加上 vendor:true）
 *   npm run vendor -- --check            # 只体检：上游 commit 是否变了、本地存档有没有被改动/损坏
 *
 * 存档内容：含 SKILL.md 的目录下全部文件 + 仓库根的 LICENSE/NOTICE，
 * 落在 vendored/<owner>/<repo>/，并写一份 MIRROR.json（上游 commit、元数据快照、文件 sha256 清单）。
 * 原仓库链接始终保留在 MIRROR.json 与页面上——存档是备份，不是改姓。
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  MAX_FILE_BYTES,
  planMirror,
  vendorDir,
  type MirrorFile,
  type MirrorManifest,
  type TreeEntry,
} from "../src/lib/vendor";

import { logAuth, resolveToken } from "./token";

const ROOT = join(import.meta.dirname, "..");
const SOURCES_PATH = join(ROOT, "sources.json");
const API = "https://api.github.com";
const TIMEOUT_MS = 20_000;
const auth = resolveToken();
const token = auth.token;

interface Source {
  repo: string;
  note?: string;
  official?: boolean;
  /** true = 存档进本仓库（零散小仓库）；缺省 = 只引用（热门仓库实时抓取） */
  vendor?: boolean;
}

/** 带 HTTP 状态的 GitHub 错误：404 才代表仓库真没了，403/5xx 只是暂时取不到 */
class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function githubGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skillhub-vendor",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const rateLimited =
      (res.status === 403 || res.status === 429) &&
      res.headers.get("x-ratelimit-remaining") === "0";
    throw new GitHubError(
      `GitHub API ${path} → ${res.status} ${res.statusText}` +
        (rateLimited ? "（配额用尽，设置 GITHUB_TOKEN 可提到 5000 次/小时）" : ""),
      res.status
    );
  }
  return (await res.json()) as T;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** 递归列出目录下所有文件（相对 dir 的 POSIX 路径） */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full).map((p) => `${entry.name}/${p}`));
    else out.push(entry.name);
  }
  return out.sort();
}

/** 删除空目录（存档裁剪后留下的空壳） */
function pruneEmptyDirs(dir: string): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(join(dir, entry.name));
  }
  if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
}

interface RepoHead {
  fullName: string;
  description: string;
  stars: number;
  htmlUrl: string;
  branch: string;
  commit: string;
  license: string | null;
  updatedAt: string;
}

/** 上游探测结果：missing = 确认 404；unavailable = 限流/网络问题，别当成删库 */
type HeadLookup =
  | { kind: "ok"; head: RepoHead }
  | { kind: "missing" }
  | { kind: "unavailable"; message: string };

async function fetchHead(fullName: string): Promise<HeadLookup> {
  try {
    const repo = await githubGet<{
      full_name?: string;
      description?: string | null;
      stargazers_count?: number;
      html_url?: string;
      default_branch?: string;
      pushed_at?: string | null;
      license?: { spdx_id?: string } | null;
    }>(`/repos/${fullName}`);
    const branch = repo.default_branch ?? "main";
    const br = await githubGet<{ commit?: { sha?: string } }>(
      `/repos/${fullName}/branches/${branch}`
    );
    return {
      kind: "ok",
      head: {
        fullName: repo.full_name ?? fullName,
        description: repo.description ?? "",
        stars: repo.stargazers_count ?? 0,
        htmlUrl: repo.html_url ?? `https://github.com/${fullName}`,
        branch,
        commit: br.commit?.sha ?? "",
        license: repo.license?.spdx_id ?? null,
        updatedAt: repo.pushed_at ?? "",
      },
    };
  } catch (err) {
    const status = err instanceof GitHubError ? err.status : 0;
    if (status === 404 || status === 410) return { kind: "missing" };
    return { kind: "unavailable", message: (err as Error).message };
  }
}

/** 按 commit 固定版本拉取原始文件（二进制安全，raw 域名不吃 API 配额） */
async function fetchRawBuffer(
  fullName: string,
  commit: string,
  path: string
): Promise<Buffer | null> {
  const url = `https://raw.githubusercontent.com/${fullName}/${commit}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

function readManifest(fullName: string): MirrorManifest | null {
  const p = join(ROOT, vendorDir(fullName), "MIRROR.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as MirrorManifest;
}

/** 存档一个仓库：拉 tree → 规划文件 → 按 commit 下载 → 写盘 + 裁剪 + 写 MIRROR.json */
async function vendorRepo(fullName: string): Promise<boolean> {
  console.log(`\n📦 ${fullName}`);
  const lookup = await fetchHead(fullName);
  if (lookup.kind !== "ok") {
    console.warn(
      lookup.kind === "missing"
        ? "  ⚠️ 上游仓库不存在（404），无法存档"
        : `  ⚠️ 拉取上游信息失败：${lookup.message}`
    );
    return false;
  }
  const head = lookup.head;

  let tree: TreeEntry[];
  try {
    const data = await githubGet<{ tree?: TreeEntry[] }>(
      `/repos/${fullName}/git/trees/${head.commit}?recursive=1`
    );
    tree = data.tree ?? [];
  } catch (err) {
    console.warn(`  ⚠️ 拉取 git tree 失败：${(err as Error).message}`);
    return false;
  }

  const plan = planMirror(tree);
  if (!plan.keep.some((p) => p.endsWith("SKILL.md"))) {
    console.warn("  ⚠️ 仓库里没有 SKILL.md，跳过存档");
    return false;
  }
  for (const s of plan.skipped) {
    const why = s.reason === "too-large" ? `超过 ${MAX_FILE_BYTES / 1000}KB` : "超出仓库存档配额";
    console.warn(`  ⚠️ 跳过 ${s.path}（${why}）`);
  }

  const dir = join(ROOT, vendorDir(fullName));
  const downloaded = await mapLimit(plan.keep, 8, async (path) => {
    const buf = await fetchRawBuffer(fullName, head.commit, path);
    if (!buf) {
      console.warn(`  ⚠️ 下载失败：${path}`);
      return null;
    }
    return { path, buf };
  });

  const files: MirrorFile[] = [];
  for (const item of downloaded) {
    if (!item) continue;
    const target = join(dir, item.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.buf);
    files.push({ path: item.path, bytes: item.buf.byteLength, sha256: sha256(item.buf) });
  }
  if (!files.some((f) => f.path.endsWith("SKILL.md"))) {
    console.warn("  ⚠️ SKILL.md 全部下载失败，放弃本次存档");
    return false;
  }

  // 裁剪：上游已删除的文件同步从存档移除（MIRROR.json 自身除外）
  const keepSet = new Set(files.map((f) => f.path));
  for (const rel of listFiles(dir)) {
    if (rel === "MIRROR.json" || keepSet.has(rel)) continue;
    rmSync(join(dir, rel));
    console.log(`  🗑️  移除已不在上游的文件：${rel}`);
  }
  pruneEmptyDirs(dir);

  const manifest: MirrorManifest = {
    repo: head.fullName,
    htmlUrl: head.htmlUrl,
    branch: head.branch,
    commit: head.commit,
    description: head.description,
    stars: head.stars,
    license: head.license,
    updatedAt: head.updatedAt,
    mirroredAt: new Date().toISOString(),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
  writeFileSync(join(dir, "MIRROR.json"), JSON.stringify(manifest, null, 2) + "\n");

  const kb = (files.reduce((n, f) => n + f.bytes, 0) / 1024).toFixed(0);
  const skillCount = files.filter((f) => f.path.endsWith("SKILL.md")).length;
  console.log(
    `  ✅ 存档 ${files.length} 个文件（${skillCount} 个技能，${kb}KB）→ ${vendorDir(fullName)}  @ ${head.commit.slice(0, 7)}`
  );
  return true;
}

/** 体检模式：不写盘，报告上游漂移与本地存档损坏 */
async function checkRepo(fullName: string): Promise<boolean> {
  const manifest = readManifest(fullName);
  console.log(`\n🔍 ${fullName}`);
  if (!manifest) {
    console.warn("  ⚠️ 尚未存档（运行 npm run vendor 生成）");
    return false;
  }
  let ok = true;
  const dir = join(ROOT, vendorDir(fullName));
  for (const f of manifest.files) {
    const p = join(dir, f.path);
    if (!existsSync(p)) {
      console.warn(`  ❌ 缺文件：${f.path}`);
      ok = false;
      continue;
    }
    if (sha256(readFileSync(p)) !== f.sha256) {
      console.warn(`  ❌ 内容与清单不符：${f.path}`);
      ok = false;
    }
  }
  const lookup = await fetchHead(fullName);
  if (lookup.kind === "missing") {
    console.log(`  🗄️  上游仓库已消失（404）—— 存档副本仍在（${manifest.files.length} 个文件）`);
  } else if (lookup.kind === "unavailable") {
    console.log(`  ⏸️  上游本次取不到（${lookup.message}）—— 未做版本比对，存档文件已校验`);
  } else if (lookup.head.commit !== manifest.commit) {
    console.log(
      `  ⬆️  上游已更新：${manifest.commit.slice(0, 7)} → ${lookup.head.commit.slice(0, 7)}（重新运行 npm run vendor 更新存档）`
    );
  } else {
    console.log(`  ✅ 存档与上游一致 @ ${manifest.commit.slice(0, 7)}，${manifest.files.length} 个文件校验通过`);
  }
  return ok;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const explicit = args.filter((a) => !a.startsWith("--"));
  const sources = JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as Source[];

  let targets: string[];
  if (explicit.length) {
    targets = explicit;
    if (!check) {
      // 命令行点名但还没登记的仓库，自动写进 sources.json（标 vendor:true）
      let changed = false;
      for (const repo of targets) {
        const found = sources.find((s) => s.repo === repo);
        if (!found) {
          sources.push({ repo, vendor: true });
          changed = true;
          console.log(`ℹ️ sources.json 新增：${repo}（vendor: true）`);
        } else if (!found.vendor) {
          found.vendor = true;
          changed = true;
          console.log(`ℹ️ sources.json 更新：${repo} 标记为 vendor: true`);
        }
      }
      if (changed) writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2) + "\n");
    }
  } else {
    targets = sources.filter((s) => s.vendor).map((s) => s.repo);
  }

  if (!targets.length) {
    console.log("ℹ️ 没有需要存档的仓库（在 sources.json 里给零散仓库加 \"vendor\": true）");
    return;
  }
  logAuth(auth);

  let ok = 0;
  for (const repo of targets) {
    const done = check ? await checkRepo(repo) : await vendorRepo(repo);
    if (done) ok++;
  }
  console.log(
    check
      ? `\n🎉 体检完成：${ok}/${targets.length} 个存档完好`
      : `\n🎉 存档完成：${ok}/${targets.length} 个仓库\n   下一步：npm run sync（把存档内容同步进快照）`
  );
  if (check && ok < targets.length) process.exit(1);
}

main().catch((err) => {
  console.error("❌ 存档失败：", err);
  process.exit(1);
});
