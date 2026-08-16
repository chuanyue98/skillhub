import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillSnapshot } from "./types";

let cache: SkillSnapshot[] | null = null;

/**
 * 加载技能快照。运行时数据源是 public/data/skills.json——
 * 由 `npm run sync` 从 SQLite 导出，随仓库提交，因此构建/部署完全离线、可复现。
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
