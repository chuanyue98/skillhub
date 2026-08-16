import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const SNAPSHOT = join(process.cwd(), "public", "data", "skills.json");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** GET /api/skills/:owner/:repo/:name → 单个技能详情 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string[] }> }
): Promise<NextResponse> {
  const { id } = await params;
  if (id.length !== 3) {
    return NextResponse.json(
      { error: "路径应为 /api/skills/:owner/:repo/:name" },
      { status: 400, headers: CORS }
    );
  }
  const [owner, repo, name] = id;
  const fullName = `${owner}/${repo}`;
  const target = `${fullName}/${decodeURIComponent(name)}`;

  let skills: SkillSnapshot[] = [];
  try {
    skills = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as SkillSnapshot[];
  } catch {
    // 数据缺失时返回 404
  }
  const found = skills.find((s) => s.id === target);

  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });
  }
  return NextResponse.json(found, { headers: CORS });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { headers: CORS });
}
