/**
 * 技能质量评分（0-100）
 *
 * 四个维度加权：description 质量 30 + 元数据完整度 25 + 正文结构 30 + 来源信誉 15。
 * 每个维度拆成若干可解释的评分项，便于详情页展示明细，也便于日后调整权重。
 * 纯函数、无 IO，同步脚本与（将来的）提交审核都能复用。
 */
import type { ScoreLevel, SkillScore, ScoreItem } from "./types";

export interface ScoreInput {
  name: string;
  description: string;
  body: string;
  tags: string[];
  author?: string | null;
  version?: string | null;
  license?: string | null;
  repoDescription: string;
  repoStars: number;
  repoUpdatedAt?: string;
}

/** description 里出现这些词说明描述是占位/模板，不是真内容 */
const PLACEHOLDER_RE = /(todo|tbd|lorem|placeholder|fixme|待补充|占位|xxx)/i;

/** 行为动词：描述里含这些词说明说明了「能干什么」 */
const ACTION_VERBS = [
  "use",
  "create",
  "generate",
  "build",
  "analyze",
  "convert",
  "summarize",
  "extract",
  "transform",
  "write",
  "read",
  "manage",
  "test",
  "deploy",
  "scan",
  "refactor",
  "search",
  "fetch",
  "make",
  "help",
];

/** 版本号是 semver 才算规范 */
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9a-zA-Z.-]+)?(\+[0-9a-zA-Z.-]+)?$/;

export function scoreLevel(total: number): ScoreLevel {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 50) return "C";
  return "D";
}

export function scoreSkill(input: ScoreInput): SkillScore {
  const items: ScoreItem[] = [];
  const { description, body, tags, version, repoStars, repoUpdatedAt } = input;

  // ── description 质量（30）──────────────────────────────
  const descLen = description.length;
  items.push({
    label: "描述长度",
    max: 15,
    points: descLen >= 120 ? 15 : descLen >= 60 ? 10 : descLen >= 20 ? 5 : 0,
  });
  const isPlaceholder =
    !description.trim() ||
    PLACEHOLDER_RE.test(description) ||
    description === input.name;
  items.push({
    label: "描述非占位",
    max: 10,
    points: isPlaceholder ? 0 : 10,
  });
  const hasVerb = ACTION_VERBS.some((v) =>
    new RegExp(`\\b${v}\\w*`, "i").test(description)
  );
  items.push({
    label: "描述说明用途",
    max: 5,
    points: hasVerb ? 5 : 0,
  });

  // ── 元数据完整度（25）─────────────────────────────────
  items.push({
    label: "标签",
    max: 10,
    points: tags.length >= 3 ? 10 : tags.length >= 1 ? 6 : 0,
  });
  items.push({ label: "作者", max: 5, points: input.author ? 5 : 0 });
  items.push({
    label: "版本",
    max: 5,
    points: version && SEMVER_RE.test(version) ? 5 : version ? 3 : 0,
  });
  items.push({ label: "许可", max: 5, points: input.license ? 5 : 0 });

  // ── 正文结构（30）─────────────────────────────────────
  const headings = (body.match(/^#{2,}\s/gm) ?? []).length;
  items.push({
    label: "正文章节",
    max: 8,
    points: headings >= 3 ? 8 : headings >= 1 ? 4 : 0,
  });
  items.push({
    label: "代码示例",
    max: 10,
    points: body.includes("```") ? 10 : 0,
  });
  const bodyLen = body.length;
  items.push({
    label: "正文篇幅",
    max: 7,
    points: bodyLen >= 800 ? 7 : bodyLen >= 300 ? 5 : bodyLen >= 100 ? 3 : 0,
  });
  items.push({
    label: "用法说明",
    max: 5,
    points: /(usage|example|示例|用法)/i.test(body) ? 5 : 0,
  });

  // ── 来源信誉（15）─────────────────────────────────────
  items.push({
    label: "仓库星数",
    max: 5,
    points: repoStars >= 5000 ? 5 : repoStars >= 1000 ? 3 : repoStars >= 100 ? 1 : 0,
  });
  items.push({
    label: "仓库描述",
    max: 5,
    points: input.repoDescription.trim() ? 5 : 0,
  });
  let recency = 0;
  if (repoUpdatedAt) {
    const ageDays = (Date.now() - new Date(repoUpdatedAt).getTime()) / 86_400_000;
    recency = ageDays <= 365 ? 5 : ageDays <= 730 ? 3 : 0;
  }
  items.push({ label: "近期活跃", max: 5, points: recency });

  const total = items.reduce((sum, item) => sum + item.points, 0);
  return { total, level: scoreLevel(total), items };
}
