import { NextResponse } from "next/server";
import { loadSkills, loadBodies } from "@/lib/skills";

export const dynamic = "force-dynamic";

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

  const found = loadSkills().find((s) => s.id === target);
  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });
  }
  // 正文单独存 bodies.json，这里合并成完整技能返回
  return NextResponse.json(
    { ...found, body: loadBodies()[found.id] ?? "" },
    { headers: CORS }
  );
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { headers: CORS });
}
