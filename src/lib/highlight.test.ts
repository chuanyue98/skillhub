import { test } from "node:test";
import assert from "node:assert/strict";
import { highlight } from "./highlight";

test("空查询返回整段未命中", () => {
  assert.deepEqual(highlight("hello", ""), [{ text: "hello", hit: false }]);
  assert.deepEqual(highlight("hello", "   "), [{ text: "hello", hit: false }]);
});

test("单关键词命中，大小写不敏感", () => {
  assert.deepEqual(highlight("Code Review Skill", "review"), [
    { text: "Code ", hit: false },
    { text: "Review", hit: true },
    { text: " Skill", hit: false },
  ]);
});

test("无命中返回整段未命中", () => {
  assert.deepEqual(highlight("hello world", "zzz"), [
    { text: "hello world", hit: false },
  ]);
});

test("多关键词各自高亮", () => {
  assert.deepEqual(highlight("code review skill", "code skill"), [
    { text: "code", hit: true },
    { text: " review ", hit: false },
    { text: "skill", hit: true },
  ]);
});

test("同一关键词多次命中", () => {
  assert.deepEqual(highlight("a a a", "a"), [
    { text: "a", hit: true },
    { text: " ", hit: false },
    { text: "a", hit: true },
    { text: " ", hit: false },
    { text: "a", hit: true },
  ]);
});

test("重叠关键词合并区间（长词优先）", () => {
  // "css" 与 "csslint" 重叠时不应切出碎片
  const segs = highlight("use csslint now", "css csslint");
  assert.deepEqual(segs, [
    { text: "use ", hit: false },
    { text: "csslint", hit: true },
    { text: " now", hit: false },
  ]);
});

test("整段命中", () => {
  assert.deepEqual(highlight("skill", "skill"), [
    { text: "skill", hit: true },
  ]);
});

test("命中片段保留原文大小写", () => {
  const segs = highlight("SKILLHub", "skillhub");
  assert.equal(segs[0].text, "SKILLHub");
  assert.equal(segs[0].hit, true);
});
