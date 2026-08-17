import type { SkillSnapshot } from "./types";

/**
 * 职业/主题分类体系（参考 SkillsMP 的 occupation 思路）。
 * 每个分类按优先级匹配：路径顶层目录 > 标签 > 仓库。
 * 技能只会归入优先级最高的一个分类（general 兜底）。
 */
export interface Category {
  id: string;
  label: string;
  /** 英文标签（多语言 UI 用） */
  labelEn: string;
  emoji: string;
  description: string;
  /** 英文描述（多语言 UI 用） */
  descriptionEn: string;
  /** 越小越优先（越具体），general 最大做兜底 */
  priority: number;
  match: (s: SkillSnapshot) => boolean;
}

const inDirs = (s: SkillSnapshot, dirs: string[]): boolean =>
  dirs.includes(s.path.split("/")[0]);
/** 匹配路径前两级（如 skills/engineering/ask-matt → skills/engineering） */
const inSubdirs = (s: SkillSnapshot, subdirs: string[]): boolean =>
  subdirs.includes(s.path.split("/").slice(0, 2).join("/"));
const hasTag = (s: SkillSnapshot, tags: string[]): boolean =>
  s.tags.some((t) => tags.includes(t));
const inRepos = (s: SkillSnapshot, repos: string[]): boolean =>
  repos.includes(s.repo.fullName);

export const CATEGORIES: Category[] = [
  {
    id: "engineering",
    label: "工程研发",
    labelEn: "Engineering",
    emoji: "🛠️",
    description: "软件开发、代码审查、DevOps 与工程质量",
    descriptionEn: "Development, code review, DevOps and engineering quality",
    priority: 10,
    match: (s) =>
      inRepos(s, [
        "vercel-labs/agent-skills",
        "obra/superpowers",
        "google/skills",
        "mattpocock/skills",
        "addyosmani/agent-skills",
      ]) ||
      inDirs(s, ["engineering", "engineering-team"]) ||
      inSubdirs(s, ["skills/engineering", "skills/engineering-team"]) ||
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
    labelEn: "Marketing",
    emoji: "📣",
    description: "内容、增长、品牌与获客",
    descriptionEn: "Content, growth, brand and acquisition",
    priority: 20,
    match: (s) =>
      inRepos(s, ["coreyhaines31/marketingskills"]) ||
      inDirs(s, ["marketing-skill", "marketing"]) ||
      inSubdirs(s, ["skills/marketing", "skills/marketing-skill"]) ||
      hasTag(s, ["marketing", "growth", "brand", "seo", "content"]),
  },
  {
    id: "product",
    label: "产品管理",
    labelEn: "Product",
    emoji: "📦",
    description: "产品规划、设计与需求管理",
    descriptionEn: "Product planning, design and requirements",
    priority: 20,
    match: (s) =>
      inDirs(s, ["product-team"]) || hasTag(s, ["product", "product-management"]),
  },
  {
    id: "project-management",
    label: "项目管理",
    labelEn: "Project Mgmt",
    emoji: "📋",
    description: "项目计划、排期与执行跟踪",
    descriptionEn: "Planning, scheduling and execution tracking",
    priority: 20,
    match: (s) =>
      inDirs(s, ["project-management"]) ||
      hasTag(s, ["project-management", "pm", "planning"]),
  },
  {
    id: "bizops",
    label: "商业运营",
    labelEn: "Business Ops",
    emoji: "💼",
    description: "销售、采购、定价、供应商与运营流程",
    descriptionEn: "Sales, procurement, pricing, vendors and operations",
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
    labelEn: "Finance",
    emoji: "💰",
    description: "预算、成本、财务分析与投研",
    descriptionEn: "Budget, cost, financial analysis and investing",
    priority: 20,
    match: (s) =>
      inDirs(s, ["finance"]) ||
      hasTag(s, ["finance", "research-finance", "accounting", "budget"]),
  },
  {
    id: "research",
    label: "研究与 QA",
    labelEn: "Research & QA",
    emoji: "🔬",
    description: "市场研究、行业分析与质量保障",
    descriptionEn: "Market research, industry analysis and quality",
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
    labelEn: "Compliance",
    emoji: "🛡️",
    description: "合规、审计与风险控制",
    descriptionEn: "Compliance, audit and risk control",
    priority: 20,
    match: (s) =>
      inDirs(s, ["compliance-os"]) ||
      hasTag(s, ["compliance", "audit", "risk", "security"]),
  },
  {
    id: "productivity",
    label: "效率工具",
    labelEn: "Productivity",
    emoji: "⚡",
    description: "知识管理、文档与日常效率",
    descriptionEn: "Knowledge management, docs and daily efficiency",
    priority: 20,
    match: (s) =>
      inRepos(s, ["kepano/obsidian-skills"]) ||
      inDirs(s, ["productivity"]) ||
      inSubdirs(s, ["skills/productivity"]) ||
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
    labelEn: "Leadership",
    emoji: "🧭",
    description: "战略、组织与高管顾问",
    descriptionEn: "Strategy, organization and executive advisory",
    priority: 20,
    match: (s) => inDirs(s, ["c-level-advisor"]),
  },
  {
    id: "general",
    label: "通用技能",
    labelEn: "General",
    emoji: "🧩",
    description: "跨领域通用技能（含 Anthropic 官方库）",
    descriptionEn: "Cross-domain general skills (incl. Anthropic official)",
    priority: 100,
    // 纯兜底：任何未匹配到具体分类的技能都归这里
    match: () => true,
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
