import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBestByKey } from "./dedup";

interface Row {
  id: string;
  path: string;
  bodyLen: number;
}

const row = (id: string, path: string, bodyLen: number): Row => ({ id, path, bodyLen });

/** 与 sync.ts 一致的 better 规则：路径更短更优；同长时正文更长更优 */
const better = (a: Row, b: Row): boolean =>
  a.path.length < b.path.length ||
  (a.path.length === b.path.length && a.bodyLen > b.bodyLen);

test("无重复时原样返回", () => {
  const rows = [row("a", "skills/a/SKILL.md", 100), row("b", "skills/b/SKILL.md", 200)];
  const out = pickBestByKey(rows, (r) => r.id, better);
  assert.equal(out.length, 2);
});

test("同 key 保留路径更短者", () => {
  const rows = [
    row("r/n", "skills/mirrors/deep/path/n/SKILL.md", 500),
    row("r/n", "skills/n/SKILL.md", 300),
  ];
  const out = pickBestByKey(rows, (r) => r.id, better);
  assert.equal(out.length, 1);
  assert.equal(out[0].path, "skills/n/SKILL.md");
});

test("同 key 同路径长时保留正文更长者", () => {
  const rows = [
    row("r/n", "skills/n/SKILL.md", 100),
    row("r/n", "skills/n/SKILL.md", 900),
  ];
  const out = pickBestByKey(rows, (r) => r.id, better);
  assert.equal(out.length, 1);
  assert.equal(out[0].bodyLen, 900);
});

test("不同 key 互不影响", () => {
  const rows = [
    row("r/a", "skills/a/SKILL.md", 100),
    row("r/a", "skills/mirror/a/SKILL.md", 900), // 长路径，应被丢弃
    row("r/b", "skills/b/SKILL.md", 200),
  ];
  const out = pickBestByKey(rows, (r) => r.id, better);
  assert.equal(out.length, 2);
  const a = out.find((r) => r.id === "r/a");
  assert.equal(a?.path, "skills/a/SKILL.md");
});

test("空输入 → 空输出", () => {
  assert.deepEqual(pickBestByKey([], (r) => r.id, better), []);
});
