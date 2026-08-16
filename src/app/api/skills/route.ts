import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillSnapshot } from "@/lib/types";
import { kv } from "@/lib/kv";

export const dynamic = "force-dynamic";

const SNAPSHOT = join(process.cwd(), "public", "data", "skills.json");

function loadSkills(): SkillSnapshot[] {
  try {
    return JSON.parse(readFileSync(SNAPSHOT, "utf8")) as SkillSnapshot[];
  } catch {
    return [];
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * GET /api/skills
 * 公开只读 API：技能目录查询。
 * 参数：q（关键词）、tag、category、sort（score|stars|copies）、
 *       page、limit（默认 20，最大 100）、fields（逗号分隔子集，可省略 body）
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const tag = sp.get("tag");
  const category = sp.get("category");
  const sort = sp.get("sort") ?? "score";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
  const fields = (sp.get("fields") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  let skills = loadSkills();

  if (tag) skills = skills.filter((s) => s.tags.includes(tag));
  if (category) skills = skills.filter((s) => s.category === category);
  if (q) {
    skills = skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.repo.fullName.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // 按热度排序时需要复制计数（KV 未配置时为 0，退化为评分排序）
  let counts: Record<string, number> = {};
  if (sort === "copies") {
    try {
      const keys = await kv.keys("copy:*");
      if (keys.length) {
        const values = await kv.mget<number[]>(...keys);
        keys.forEach((key, i) => {
          counts[key.replace(/^copy:/, "")] = Number(values[i] ?? 0);
        });
      }
    } catch {
      counts = {};
    }
  }

  skills = [...skills].sort((a, b) => {
    if (sort === "stars") return b.repo.stars - a.repo.stars || b.score.total - a.score.total;
    if (sort === "copies") {
      return (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || b.score.total - a.score.total;
    }
    return b.score.total - a.score.total || b.repo.stars - a.repo.stars;
  });

  const total = skills.length;
  const start = (page - 1) * limit;
  const items = skills.slice(start, start + limit).map((s) => {
    const slim: Record<string, unknown> = { ...s };
    if (fields.length) {
      for (const key of Object.keys(slim)) {
        if (!fields.includes(key)) delete slim[key];
      }
    }
    if (sort === "copies") slim.copies = counts[s.id] ?? 0;
    return slim;
  });

  return NextResponse.json(
    {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items,
    },
    { headers: CORS }
  );
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { headers: CORS });
}
