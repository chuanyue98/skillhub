import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archiveUrl,
  dirOf,
  isStale,
  planMirror,
  skillDirs,
  skillFiles,
  vendorPath,
  type MirrorManifest,
  type TreeEntry,
} from "./vendor";

const blob = (path: string, size = 100): TreeEntry => ({ type: "blob", path, size });

test("skillDirs 找出所有含 SKILL.md 的目录", () => {
  const dirs = skillDirs([
    "README.md",
    "skills/a/SKILL.md",
    "skills/a/scripts/run.py",
    "skills/b/SKILL.md",
  ]);
  assert.deepEqual(dirs, ["skills/a", "skills/b"]);
});

test("skillDirs 支持仓库根就是技能目录", () => {
  assert.deepEqual(skillDirs(["SKILL.md", "scripts/x.py"]), [""]);
});

test("dirOf 顶层文件返回空串", () => {
  assert.equal(dirOf("SKILL.md"), "");
  assert.equal(dirOf("skills/a/SKILL.md"), "skills/a");
});

test("planMirror 收技能目录全部文件 + 根 LICENSE，其他不收", () => {
  const plan = planMirror([
    blob("README.md"),
    blob("LICENSE"),
    blob("examples/demo.jpg", 300_000),
    blob("skills/a/SKILL.md"),
    blob("skills/a/scripts/run.py"),
    blob("skills/a/agents/openai.yaml"),
    { type: "tree", path: "skills" },
  ]);
  assert.deepEqual(plan.keep, [
    "skills/a/SKILL.md",
    "LICENSE",
    "skills/a/agents/openai.yaml",
    "skills/a/scripts/run.py",
  ]);
  assert.equal(plan.bytes, 400);
});

test("planMirror 跳过超过单文件上限的文件", () => {
  const plan = planMirror([blob("skills/a/SKILL.md"), blob("skills/a/big.bin", 5_000)], {
    maxFileBytes: 1_000,
  });
  assert.deepEqual(plan.keep, ["skills/a/SKILL.md"]);
  assert.deepEqual(plan.skipped, [{ path: "skills/a/big.bin", reason: "too-large" }]);
});

test("planMirror 超出仓库配额时先保 SKILL.md，附属文件被跳过", () => {
  const plan = planMirror(
    [blob("skills/a/SKILL.md", 400), blob("skills/a/z.py", 400), blob("skills/a/y.py", 400)],
    { maxRepoBytes: 900 }
  );
  assert.deepEqual(plan.keep, ["skills/a/SKILL.md", "skills/a/y.py"]);
  assert.deepEqual(plan.skipped, [{ path: "skills/a/z.py", reason: "repo-quota" }]);
});

test("planMirror 没有 SKILL.md 时什么都不收", () => {
  assert.deepEqual(planMirror([blob("README.md"), blob("src/index.ts")]).keep, []);
});

test("vendorPath / archiveUrl 指向 SkillHub 仓库里的存档位置", () => {
  assert.equal(
    vendorPath("chengyi-ai/native-subtitle-quote-image", "skills/x/SKILL.md"),
    "vendored/chengyi-ai/native-subtitle-quote-image/skills/x/SKILL.md"
  );
  assert.equal(
    archiveUrl("owner/repo", "skills/x", "me/hub"),
    "https://github.com/me/hub/tree/main/vendored/owner/repo/skills/x"
  );
});

test("SKILL.md 在仓库根时，存档路径/链接不带多余的 . 段", () => {
  assert.equal(vendorPath("owner/repo", "."), "vendored/owner/repo");
  assert.equal(vendorPath("owner/repo", ""), "vendored/owner/repo");
  assert.equal(
    archiveUrl("owner/repo", ".", "me/hub"),
    "https://github.com/me/hub/tree/main/vendored/owner/repo"
  );
});

const manifest = (commit: string, paths: string[]): MirrorManifest => ({
  repo: "owner/repo",
  htmlUrl: "https://github.com/owner/repo",
  branch: "main",
  commit,
  description: "",
  stars: 1,
  license: "MIT",
  updatedAt: "",
  mirroredAt: "",
  files: paths.map((path) => ({ path, bytes: 1, sha256: "x" })),
});

test("isStale 只看 commit 是否变化", () => {
  assert.equal(isStale(manifest("abc", []), "abc"), false);
  assert.equal(isStale(manifest("abc", []), "def"), true);
});

test("skillFiles 只挑清单里的 SKILL.md", () => {
  const m = manifest("abc", ["LICENSE", "skills/b/SKILL.md", "skills/a/SKILL.md", "skills/a/run.py"]);
  assert.deepEqual(skillFiles(m), ["skills/a/SKILL.md", "skills/b/SKILL.md"]);
});
