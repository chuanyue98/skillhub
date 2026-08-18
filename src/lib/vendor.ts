/**
 * 存档（vendor）层：把零散的小仓库整份存进 SkillHub 仓库，防止上游删库/改名后技能消失。
 *
 * 收录策略：
 *   - 热门 / 官方 / 活跃的大仓库（anthropics、vercel、google…）→ 只做引用，同步时实时抓取；
 *   - 零散的个人小仓库（单技能、低星、随时可能消失）→ sources.json 标 `"vendor": true`，
 *     用 `npm run vendor` 把技能目录整份镜像到 `vendored/<owner>/<repo>/`，并保留原仓库链接。
 *
 * 这里只放纯函数（无 IO），供 scripts/vendor.ts、scripts/sync.ts 与单测复用。
 */

/** SkillHub 自身仓库，用于生成「浏览存档文件」链接与备用安装命令 */
export const SITE_REPO = "chuanyue98/skillhub";

/** 存档根目录（相对仓库根） */
export const VENDOR_ROOT = "vendored";

/** 单文件大小上限：超过就不进存档（存档是给人读的源码，不是网盘） */
export const MAX_FILE_BYTES = 1_000_000;

/** 单仓库存档总量上限，防止一个带素材的仓库把 git 仓库撑爆 */
export const MAX_REPO_BYTES = 10_000_000;

/** 仓库根目录下也一并存档的文件（署名与授权信息，缺了就没法合法转存） */
const ROOT_KEEP = /^(LICENSE|LICENCE|COPYING|NOTICE)(\.\w+)?$/i;

/** 存档清单里的单个文件记录 */
export interface MirrorFile {
  /** 相对上游仓库根的路径 */
  path: string;
  bytes: number;
  /** 内容 sha256，用于校验存档是否被改动 */
  sha256: string;
}

/** 每个被存档仓库的 MIRROR.json：既是校验清单，也是上游消失后的元数据兜底 */
export interface MirrorManifest {
  repo: string;
  htmlUrl: string;
  branch: string;
  /** 存档对应的上游 commit sha */
  commit: string;
  description: string;
  stars: number;
  license: string | null;
  /** 上游最后一次 push 时间 */
  updatedAt: string;
  /** 本次存档时间 */
  mirroredAt: string;
  files: MirrorFile[];
}

/** git tree 里的一个条目（只取用得上的字段） */
export interface TreeEntry {
  type?: string;
  path?: string;
  size?: number;
}

/** 取路径的目录部分（POSIX 语义，顶层文件返回 ""） */
export function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** 找出所有含 SKILL.md 的目录（技能自带的 scripts/references 都在同一目录下） */
export function skillDirs(paths: string[]): string[] {
  const dirs = new Set<string>();
  for (const p of paths) {
    if (p === "SKILL.md" || p.endsWith("/SKILL.md")) dirs.add(dirOf(p));
  }
  return [...dirs].sort();
}

/** 判断文件是否落在某个技能目录（或其子目录）里 */
export function inSkillDir(path: string, dirs: string[]): boolean {
  return dirs.some((d) => (d === "" ? true : path.startsWith(`${d}/`)));
}

export interface MirrorPlan {
  /** 要下载存档的文件路径 */
  keep: string[];
  /** 被跳过的文件及原因（单文件超限 / 仓库总量超限） */
  skipped: { path: string; reason: "too-large" | "repo-quota" }[];
  /** keep 的总字节数（按 tree 上报的 size 估算） */
  bytes: number;
}

/**
 * 从 git tree 规划存档内容：技能目录下的全部文件 + 仓库根的 LICENSE 类文件。
 * 按路径排序后依次装入，超出仓库配额的尾部文件被跳过（结果稳定、可复现）。
 */
export function planMirror(tree: TreeEntry[], opts?: {
  maxFileBytes?: number;
  maxRepoBytes?: number;
}): MirrorPlan {
  const maxFile = opts?.maxFileBytes ?? MAX_FILE_BYTES;
  const maxRepo = opts?.maxRepoBytes ?? MAX_REPO_BYTES;
  const blobs = tree.filter((e) => e.type === "blob" && e.path);
  const dirs = skillDirs(blobs.map((e) => e.path!));
  // SKILL.md 排在最前：万一撞上配额上限，被牺牲的也只会是附属文件
  const rank = (p: string) => (p === "SKILL.md" || p.endsWith("/SKILL.md") ? 0 : 1);
  const candidates = blobs
    .filter((e) => inSkillDir(e.path!, dirs) || ROOT_KEEP.test(e.path!))
    .sort((a, b) => rank(a.path!) - rank(b.path!) || a.path!.localeCompare(b.path!));

  const keep: string[] = [];
  const skipped: MirrorPlan["skipped"] = [];
  let bytes = 0;
  for (const entry of candidates) {
    const size = entry.size ?? 0;
    if (size > maxFile) {
      skipped.push({ path: entry.path!, reason: "too-large" });
      continue;
    }
    if (bytes + size > maxRepo) {
      skipped.push({ path: entry.path!, reason: "repo-quota" });
      continue;
    }
    keep.push(entry.path!);
    bytes += size;
  }
  return { keep, skipped, bytes };
}

/** 某个仓库的存档目录：vendored/<owner>/<repo> */
export function vendorDir(repoFullName: string): string {
  return `${VENDOR_ROOT}/${repoFullName}`;
}

/** 存档文件在 SkillHub 仓库里的路径 */
export function vendorPath(repoFullName: string, path: string): string {
  return `${vendorDir(repoFullName)}/${path}`;
}

/** 「浏览存档文件」链接：指向 SkillHub 仓库里的存档目录 */
export function archiveUrl(repoFullName: string, path: string, siteRepo = SITE_REPO): string {
  return `https://github.com/${siteRepo}/tree/main/${vendorPath(repoFullName, path)}`;
}

/** 存档是否落后于上游（commit 变了就该重新 vendor） */
export function isStale(manifest: MirrorManifest, upstreamCommit: string): boolean {
  return manifest.commit !== upstreamCommit;
}

/** 存档里的 SKILL.md 路径列表（清单里还含 scripts/LICENSE 等附属文件） */
export function skillFiles(manifest: MirrorManifest): string[] {
  return manifest.files
    .map((f) => f.path)
    .filter((p) => p === "SKILL.md" || p.endsWith("/SKILL.md"))
    .sort();
}
