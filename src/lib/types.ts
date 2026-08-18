export interface RepoMeta {
  fullName: string;
  description: string;
  stars: number;
  htmlUrl: string;
  updatedAt: string;
}

export interface SkillSnapshot {
  /** `${owner}/${repo}/${name}` 全局唯一标识 */
  id: string;
  /** 技能名（来自 frontmatter，缺省取目录名） */
  name: string;
  /** frontmatter 里的 description——这是 agent 决定何时加载技能的关键，也是搜索主字段 */
  description: string;
  /**
   * SKILL.md 的 Markdown 正文。
   * 快照拆分为 skills.json（元数据，无 body）+ bodies.json（按 id 索引正文）后，
   * 列表页拿到的技能对象不含 body；详情页 / API 按需合并。见 src/lib/skills.ts。
   */
  body?: string;
  tags: string[];
  author?: string;
  version?: string;
  license?: string;
  /** SKILL.md 在仓库里的路径 */
  path: string;
  /** 一键安装命令：npx skills add owner/repo --skill name */
  install: string;
  repo: RepoMeta;
  /** 官方来源（如 anthropics/skills、vercel-labs/agent-skills），由 sources.json 标记 */
  official?: boolean;
  /** 职业/主题分类（见 categories.ts），由 sync 脚本归类 */
  category: string;
  /** 质量评分（0-100），由 sync 脚本计算 */
  score: SkillScore;
  /** 安全扫描结果（危险命令检测），由 sync 脚本计算 */
  security?: SkillSecurity;
  /** 存档信息：该技能的文件已整份镜像进 SkillHub 仓库（零散小仓库才有） */
  mirror?: MirrorMeta;
}

/**
 * 存档元信息。热门大仓库只做引用（无此字段），零散小仓库由 `npm run vendor`
 * 把技能目录整份镜像进本仓库，上游删库也不会丢——原仓库链接仍在 repo.htmlUrl。
 */
export interface MirrorMeta {
  /** 存档目录在 SkillHub 仓库里的路径（vendored/owner/repo/技能目录） */
  dir: string;
  /** 存档对应的上游 commit sha */
  commit: string;
  /** 存档时间（ISO） */
  mirroredAt: string;
  /** 浏览存档文件的链接（指向 SkillHub 仓库） */
  archiveUrl: string;
  /** 同步时上游仓库已无法访问（删库/转私有），页面提示「正在看存档副本」 */
  upstreamGone?: boolean;
  /** 从存档安装的备用命令（技能名在存档集合里唯一时才给） */
  installFallback?: string;
}

export type ScoreLevel = "A" | "B" | "C" | "D";

/** 单个评分项的得分与满分，便于 UI 展示明细 */
export interface ScoreItem {
  label: string;
  points: number;
  max: number;
}

export interface SkillScore {
  total: number;
  level: ScoreLevel;
  items: ScoreItem[];
}

/** 安全风险等级：none 无风险，low 提示级，medium 需谨慎，high 高危 */
export type RiskLevel = "none" | "low" | "medium" | "high";

/** 单条安全警告 */
export interface SecurityWarning {
  /** 危险模式严重级别 */
  severity: Exclude<RiskLevel, "none">;
  /** 模式标识（i18n key，如 sec.pipeShell），文案见 src/lib/i18n.ts */
  code: string;
  /** 命中的原文片段（用于展示，最长 ~60 字符） */
  match: string;
}

/** 一个技能的安全扫描结果 */
export interface SkillSecurity {
  /** 综合风险等级 = 所有警告中的最高严重级别 */
  risk: RiskLevel;
  warnings: SecurityWarning[];
}
