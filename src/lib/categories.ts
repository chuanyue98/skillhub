import type { SkillSnapshot } from "./types";

/**
 * 职业/主题分类体系（参考 SkillsMP 的 occupation 思路）。
 * 每个分类按优先级匹配：路径顶层目录 > 标签 > 仓库。
 * 技能只会归入优先级最高的一个分类（general 兜底）。
 */
export interface Category {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** 越小越优先（越具体），general 最大做兜底 */
  priority: number;
  match: (s: SkillSnapshot) => boolean;
}

const inDirs = (s: SkillSnapshot, dirs: string[]): boolean =>
  dirs.includes(s.path.split("/")[0]);
const hasTag = (s: SkillSnapshot, tags: string[]): boolean =>
  s.tags.some((t) => tags.includes(t));
const inRepos = (s: SkillSnapshot, repos: string[]): boolean =>
  repos.includes(s.repo.fullName);

export const CATEGORIES: Category[] = [
  {
    id: "engineering",
    label: "工程研发",
    emoji: "🛠️",
    description: "软件开发、代码审查、DevOps 与工程质量",
    priority: 10,
    match: (s) =>
      inRepos(s, ["vercel-labs/agent-skills", "obra/superpowers"]) ||
      inDirs(s, ["engineering", "engineering-team"]) ||
      hasTag(s, [
        "engineering",
        "devops",
        "sre",
        "code-review",
        "testing",
        "observability",
        "reliability",
      ]),
  },
  {
    id: "marketing",
    label: "市场营销",
    emoji: "📣",
    description: "内容、增长、品牌与获客",
    priority: 20,
    match: (s) =>
      inDirs(s, ["marketing-skill", "marketing"]) ||
      hasTag(s, ["marketing", "growth", "brand", "seo", "content"]),
  },
  {
    id: "product",
    label: "产品管理",
    emoji: "📦",
    description: "产品规划、设计与需求管理",
    priority: 20,
    match: (s) =>
      inDirs(s, ["product-team"]) || hasTag(s, ["product", "product-management"]),
  },
  {
    id: "project-management",
    label: "项目管理",
    emoji: "📋",
    description: "项目计划、排期与执行跟踪",
    priority: 20,
    match: (s) =>
      inDirs(s, ["project-management"]) ||
      hasTag(s, ["project-management", "pm", "planning"]),
  },
  {
    id: "bizops",
    label: "商业运营",
    emoji: "💼",
    description: "销售、采购、定价、供应商与运营流程",
    priority: 20,
    match: (s) =>
      inDirs(s, ["commercial", "business-operations", "business-growth"]) ||
      hasTag(s, [
        "bizops",
        "commercial",
        "sales",
        "revenue-operations",
        "partnerships",
        "rfp",
        "pricing",
        "deal-desk",
        "procurement",
        "vendor",
        "capacity",
        "sla",
        "burn-rate",
        "operations",
        "customer-success",
      ]),
  },
  {
    id: "finance",
    label: "财务",
    emoji: "💰",
    description: "预算、成本、财务分析与投研",
    priority: 20,
    match: (s) =>
      inDirs(s, ["finance"]) ||
      hasTag(s, ["finance", "research-finance", "accounting", "budget"]),
  },
  {
    id: "research",
    label: "研究与 QA",
    emoji: "🔬",
    description: "市场研究、行业分析与质量保障",
    priority: 20,
    match: (s) =>
      inDirs(s, ["research", "research-ops", "ra-qm-team"]) ||
      hasTag(s, [
        "research",
        "market-research",
        "product-research",
        "clinical-research",
        "qa",
        "quality",
      ]),
  },
  {
    id: "compliance",
    label: "合规风控",
    emoji: "🛡️",
    description: "合规、审计与风险控制",
    priority: 20,
    match: (s) =>
      inDirs(s, ["compliance-os"]) ||
      hasTag(s, ["compliance", "audit", "risk", "security"]),
  },
  {
    id: "productivity",
    label: "效率工具",
    emoji: "⚡",
    description: "知识管理、文档与日常效率",
    priority: 20,
    match: (s) =>
      inDirs(s, ["productivity"]) ||
      hasTag(s, [
        "productivity",
        "knowledge-management",
        "documentation",
        "wiki",
        "sop",
        "markdown",
        "single-file",
      ]),
  },
  {
    id: "leadership",
    label: "高管决策",
    emoji: "🧭",
    description: "战略、组织与高管顾问",
    priority: 20,
    match: (s) => inDirs(s, ["c-level-advisor"]),
  },
  {
    id: "general",
    label: "通用技能",
    emoji: "🧩",
    description: "跨领域通用技能（含 Anthropic 官方库）",
    priority: 100,
    match: (s) =>
      inRepos(s, ["anthropics/skills"]) ||
      inDirs(s, ["skills", "template", "loop-library"]),
  },
];

/** 技能归类：取优先级最高的匹配分类，找不到归入 general */
export function assignCategory(s: SkillSnapshot): string {
  const hit = CATEGORIES.find((c) => c.match(s));
  return hit?.id ?? "general";
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
