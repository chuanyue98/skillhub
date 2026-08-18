import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillSnapshot } from "./types";

let cache: SkillSnapshot[] | null = null;
let bodiesCache: Record<string, string> | null = null;

/**
 * 加载技能元数据快照（不含 body——正文单独存在 bodies.json，按 id 索引）。
 * 运行时数据源是 public/data/skills.json，由 `npm run sync` 从 SQLite 导出，
 * 随仓库提交，因此构建/部署完全离线、可复现。
 *
 * 列表页（搜索/浏览）只用元数据；详情页与 API 需要正文时再调 loadBodies 合并。
 */
export function loadSkills(): SkillSnapshot[] {
  if (cache) return cache;
  const raw = readFileSync(
    join(process.cwd(), "public", "data", "skills.json"),
    "utf8"
  );
  cache = JSON.parse(raw) as SkillSnapshot[];
  return cache;
}

/** 加载正文索引 { [skillId]: body }（体积大，仅详情页/API 按需调用） */
export function loadBodies(): Record<string, string> {
  if (bodiesCache) return bodiesCache;
  const raw = readFileSync(
    join(process.cwd(), "public", "data", "bodies.json"),
    "utf8"
  );
  bodiesCache = JSON.parse(raw) as Record<string, string>;
  return bodiesCache;
}

/** 按 id 取完整技能（元数据 + 正文合并），找不到返回 undefined */
export function loadSkillById(id: string): SkillSnapshot | undefined {
  const meta = loadSkills().find((s) => s.id === id);
  if (!meta) return undefined;
  return { ...meta, body: loadBodies()[id] ?? "" };
}
