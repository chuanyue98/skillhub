import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreLevel, scoreSkill } from "./score";
import type { ScoreInput } from "./score";

/** 构造一个「各项拉满」的输入，便于单维度测试 */
function base(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    name: "demo-skill",
    description:
      "Use this skill to analyze customer feedback and generate actionable insights from survey responses, support tickets, and product reviews across multiple channels.",
    body: [
      "# Demo Skill",
      "",
      "## When to use",
      "Use when the user asks to analyze feedback or summarize insights.",
      "",
      "## Steps",
      "1. Load the feedback data",
      "2. Run the analysis",
      "",
      "```bash",
      "npx demo-analyze --input feedback.csv",
      "```",
      "",
      "## Example",
      "> Input: a support ticket about billing",
      "",
      "## Notes",
      "See usage docs for advanced options.",
    ].join("\n"),
    tags: ["analysis", "feedback", "data"],
    author: "demo-author",
    version: "1.2.3",
    license: "MIT",
    repoDescription: "A demo repository with useful analysis tools.",
    repoStars: 12000,
    repoUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("scoreLevel 边界映射", () => {
  assert.equal(scoreLevel(85), "A");
  assert.equal(scoreLevel(84), "B");
  assert.equal(scoreLevel(70), "B");
  assert.equal(scoreLevel(69), "C");
  assert.equal(scoreLevel(50), "C");
  assert.equal(scoreLevel(49), "D");
  assert.equal(scoreLevel(0), "D");
});

test("完整高质量技能得 A 级", () => {
  const s = scoreSkill(base());
  assert.equal(s.level, "A");
  assert.ok(s.total >= 85, `总分应 ≥85，实际 ${s.total}`);
});

test("描述：空描述 → 描述维度三连零分", () => {
  const s = scoreSkill(base({ description: "" }));
  const desc = s.items.filter((i) =>
    ["描述长度", "描述非占位", "描述说明用途"].includes(i.label)
  );
  assert.equal(desc.length, 3);
  assert.ok(desc.every((i) => i.points === 0), "描述维度应全 0 分");
});

test("描述：占位文本（todo）→ 非占位 0 分", () => {
  const s = scoreSkill(
    base({ description: "TODO: fill this description later" })
  );
  const item = s.items.find((i) => i.label === "描述非占位");
  assert.equal(item?.points, 0);
});

test("描述：描述等于技能名视为占位", () => {
  const s = scoreSkill(base({ description: "demo-skill" }));
  const item = s.items.find((i) => i.label === "描述非占位");
  assert.equal(item?.points, 0);
});

test("描述长度档位：20/60/120 字符", () => {
  const s20 = scoreSkill(base({ description: "x".repeat(20) }));
  const s60 = scoreSkill(base({ description: "x".repeat(60) }));
  const s120 = scoreSkill(base({ description: "x".repeat(120) }));
  const lens = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "描述长度")?.points;
  assert.equal(lens(s20), 5);
  assert.equal(lens(s60), 10);
  assert.equal(lens(s120), 15);
});

test("版本：semver 满分、非 semver 2 分、缺失 0 分", () => {
  const semver = scoreSkill(base({ version: "2.11.1" }));
  const loose = scoreSkill(base({ version: "v1" }));
  const none = scoreSkill(base({ version: null }));
  const v = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "版本")?.points;
  assert.equal(v(semver), 3);
  assert.equal(v(loose), 2);
  assert.equal(v(none), 0);
});

test("标签：≥3 满分、1-2 个 4 分、无 0 分", () => {
  const three = scoreSkill(base({ tags: ["a", "b", "c"] }));
  const one = scoreSkill(base({ tags: ["a"] }));
  const none = scoreSkill(base({ tags: [] }));
  const tag = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "标签")?.points;
  assert.equal(tag(three), 6);
  assert.equal(tag(one), 4);
  assert.equal(tag(none), 0);
});

test("正文结构：章节/代码/篇幅/用法四项", () => {
  const s = scoreSkill(base());
  const headings = s.items.find((i) => i.label === "正文章节")?.points;
  const code = s.items.find((i) => i.label === "代码示例")?.points;
  const usage = s.items.find((i) => i.label === "用法说明")?.points;
  assert.equal(headings, 10); // ≥3 个 ##
  assert.equal(code, 13); // 含 ```
  assert.equal(usage, 7); // 含 usage/example/示例
});

test("正文篇幅档位：100/300/800 字符", () => {
  const s100 = scoreSkill(base({ body: "x".repeat(100) }));
  const s300 = scoreSkill(base({ body: "x".repeat(300) }));
  const s800 = scoreSkill(base({ body: "x".repeat(800) }));
  const len = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "正文篇幅")?.points;
  assert.equal(len(s100), 5);
  assert.equal(len(s300), 8);
  assert.equal(len(s800), 10);
});

test("来源：星数档位 100/1000/5000", () => {
  const s100 = scoreSkill(base({ repoStars: 100 }));
  const s1000 = scoreSkill(base({ repoStars: 1000 }));
  const s5000 = scoreSkill(base({ repoStars: 5000 }));
  const star = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "仓库星数")?.points;
  assert.equal(star(s100), 1);
  assert.equal(star(s1000), 3);
  assert.equal(star(s5000), 5);
});

test("来源：仓库描述为空 → 0 分", () => {
  const s = scoreSkill(base({ repoDescription: "" }));
  const item = s.items.find((i) => i.label === "仓库描述");
  assert.equal(item?.points, 0);
});

test("来源：近期活跃（1 年内更新 5 分、2 年 3 分、更久 0 分）", () => {
  const now = Date.now();
  const fresh = scoreSkill(
    base({ repoUpdatedAt: new Date(now - 100 * 86_400_000).toISOString() })
  );
  const stale = scoreSkill(
    base({ repoUpdatedAt: new Date(now - 600 * 86_400_000).toISOString() })
  );
  const ancient = scoreSkill(
    base({ repoUpdatedAt: new Date(now - 1200 * 86_400_000).toISOString() })
  );
  const rec = (s: ReturnType<typeof scoreSkill>) =>
    s.items.find((i) => i.label === "近期活跃")?.points;
  assert.equal(rec(fresh), 5);
  assert.equal(rec(stale), 3);
  assert.equal(rec(ancient), 0);
});

test("来源：repoUpdatedAt 缺失 → 0 分", () => {
  const s = scoreSkill(base({ repoUpdatedAt: undefined }));
  const item = s.items.find((i) => i.label === "近期活跃");
  assert.equal(item?.points, 0);
});

test("总分 = 所有明细项之和，且各项不超过满分", () => {
  const s = scoreSkill(base());
  const sum = s.items.reduce((acc, i) => acc + i.points, 0);
  assert.equal(s.total, sum);
  for (const item of s.items) {
    assert.ok(item.points >= 0 && item.points <= item.max, `${item.label} 越界`);
  }
  // 14 个评分项
  assert.equal(s.items.length, 14);
  // 权重结构：正文 40 > 描述 30 > 元数据 15 = 来源 15
  const byDim = (labels: string[]) =>
    s.items.filter((i) => labels.includes(i.label)).reduce((a, i) => a + i.max, 0);
  assert.equal(byDim(["描述长度", "描述非占位", "描述说明用途"]), 30);
  assert.equal(byDim(["标签", "作者", "版本", "许可"]), 15);
  assert.equal(byDim(["正文章节", "代码示例", "正文篇幅", "用法说明"]), 40);
  assert.equal(byDim(["仓库星数", "仓库描述", "近期活跃"]), 15);
});

test("空技能 → D 级且总分低", () => {
  const s = scoreSkill(
    base({
      description: "",
      body: "",
      tags: [],
      author: null,
      version: null,
      license: null,
      repoDescription: "",
      repoStars: 0,
    })
  );
  assert.equal(s.level, "D");
  assert.ok(s.total < 50, `空技能总分应 <50，实际 ${s.total}`);
});
