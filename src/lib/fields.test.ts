import { test } from "node:test";
import assert from "node:assert/strict";
import { select, pickFields } from "./fields";

const skill = {
  id: "obra/superpowers/brainstorming",
  name: "brainstorming",
  description: "Run a brainstorming session",
  tags: ["ideation", "product"],
  score: { total: 88, level: "A", nested: { points: { value: 15 } } },
  repo: { fullName: "obra/superpowers", stars: 12000, htmlUrl: "https://github.com/obra/superpowers" },
  body: "# Brainstorming\n\nlong body…",
};

test("select：点路径取值", () => {
  assert.equal(select(skill, "score.total"), 88);
  assert.equal(select(skill, "repo.stars"), 12000);
  assert.equal(select(skill, "name"), "brainstorming");
});

test("select：缺失路径返回 undefined", () => {
  assert.equal(select(skill, "score.missing"), undefined);
  assert.equal(select(skill, "repo.deep.nested"), undefined);
  assert.equal(select(skill, "noSuchKey"), undefined);
  assert.equal(select(null, "a.b"), undefined);
});

test("pickFields：顶层字段", () => {
  const out = pickFields(skill, ["id", "name"]);
  assert.deepEqual(out, { id: skill.id, name: skill.name });
});

test("pickFields：点路径把嵌套对象裁剪成只剩选中键", () => {
  const out = pickFields(skill, ["score.total", "repo.stars"]);
  assert.deepEqual(out, {
    score: { total: 88 },
    repo: { stars: 12000 },
  });
});

test("pickFields：混合顶层 + 点路径 + 缺失字段（缺失的嵌套保留为空对象）", () => {
  const out = pickFields(skill, ["id", "score.total", "repo.nonexistent", "noSuch"]);
  assert.deepEqual(out, {
    id: skill.id,
    score: { total: 88 },
    repo: {},
  });
});

test("pickFields：空 fields 返回空对象", () => {
  assert.deepEqual(pickFields(skill, []), {});
});

test("pickFields：点路径嵌套两层（键取最后一段）", () => {
  const out = pickFields(skill, ["score.nested.points.value"]);
  assert.deepEqual(out, { score: { value: 15 } });
});
