import { test } from "node:test";
import assert from "node:assert/strict";
import { assignCategory } from "./categories";
import type { SkillSnapshot } from "./types";

/** 构造最小 SkillSnapshot（分类只看 path / tags / repo.fullName） */
function skill(overrides: Partial<Pick<SkillSnapshot, "path" | "tags" | "repo">> = {}): SkillSnapshot {
  return {
    id: "owner/repo/name",
    name: "name",
    description: "A test skill",
    tags: [],
    path: "skills/name/SKILL.md",
    install: "npx skills add owner/repo --skill name",
    repo: { fullName: "owner/repo", description: "", stars: 0, htmlUrl: "", updatedAt: "" },
    category: "general",
    score: { total: 0, level: "D", items: [] },
    ...overrides,
  };
}

test("仓库维度：官方/工程仓库 → engineering", () => {
  for (const repo of [
    "vercel-labs/agent-skills",
    "obra/superpowers",
    "google/skills",
    "mattpocock/skills",
    "addyosmani/agent-skills",
  ]) {
    assert.equal(
      assignCategory(skill({ repo: { ...skill().repo, fullName: repo } })),
      "engineering",
      `${repo} 应归入 engineering`
    );
  }
});

test("仓库维度：营销仓库 → marketing", () => {
  assert.equal(
    assignCategory(
      skill({ repo: { ...skill().repo, fullName: "coreyhaines31/marketingskills" } })
    ),
    "marketing"
  );
});

test("仓库维度：obsidian → productivity", () => {
  assert.equal(
    assignCategory(
      skill({ repo: { ...skill().repo, fullName: "kepano/obsidian-skills" } })
    ),
    "productivity"
  );
});

test("路径维度：顶层目录匹配", () => {
  assert.equal(assignCategory(skill({ path: "engineering/ask-matt/SKILL.md" })), "engineering");
  assert.equal(assignCategory(skill({ path: "product-team/roadmap/SKILL.md" })), "product");
  assert.equal(assignCategory(skill({ path: "marketing-skill/social/SKILL.md" })), "marketing");
  assert.equal(assignCategory(skill({ path: "project-management/track/SKILL.md" })), "project-management");
  assert.equal(assignCategory(skill({ path: "finance/budget/SKILL.md" })), "finance");
  assert.equal(assignCategory(skill({ path: "c-level-advisor/strategy/SKILL.md" })), "leadership");
});

test("路径维度：二级路径匹配（skills/xxx）", () => {
  assert.equal(
    assignCategory(skill({ path: "skills/engineering/code-review/SKILL.md" })),
    "engineering"
  );
  assert.equal(
    assignCategory(skill({ path: "skills/marketing/growth/SKILL.md" })),
    "marketing"
  );
  assert.equal(
    assignCategory(skill({ path: "skills/productivity/notes/SKILL.md" })),
    "productivity"
  );
});

test("标签维度：匹配标签归类", () => {
  assert.equal(assignCategory(skill({ tags: ["devops"] })), "engineering");
  assert.equal(assignCategory(skill({ tags: ["growth", "brand"] })), "marketing");
  assert.equal(assignCategory(skill({ tags: ["compliance"] })), "compliance");
  assert.equal(assignCategory(skill({ tags: ["research"] })), "research");
});

test("priority 越小越优先：engineering(10) 胜过 productivity(20)", () => {
  // obsidian 仓库命中 productivity（priority 20），但 devops 标签命中 engineering（priority 10）
  assert.equal(
    assignCategory(
      skill({ repo: { ...skill().repo, fullName: "kepano/obsidian-skills" }, tags: ["devops"] })
    ),
    "engineering"
  );
});

test("未知仓库 + 无标签 → general 兜底", () => {
  assert.equal(
    assignCategory(skill({ repo: { ...skill().repo, fullName: "unknown/thing" } })),
    "general"
  );
});

test("general 永远兜底（match: () => true）", () => {
  // CATEGORIES 里 general 的 priority 最大（100），具体分类都试过才轮到它
  assert.equal(assignCategory(skill({ tags: [] })), "general");
});
