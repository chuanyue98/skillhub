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
  /** SKILL.md 的 Markdown 正文 */
  body: string;
  tags: string[];
  author?: string;
  version?: string;
  license?: string;
  /** SKILL.md 在仓库里的路径 */
  path: string;
  /** 一键安装命令：npx skills add owner/repo --skill name */
  install: string;
  repo: RepoMeta;
  /** 质量评分（0-100），由 sync 脚本计算 */
  score: SkillScore;
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
