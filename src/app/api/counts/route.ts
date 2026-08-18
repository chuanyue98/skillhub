import { NextRequest, NextResponse } from "next/server";
import { kv, kvReady } from "@/lib/kv";

/**
 * GET /api/counts → { [skillId]: count }
 * GET /api/counts?id=owner/repo/name → { [skillId]: count }（单查，避免详情页拉全量）
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const single = req.nextUrl.searchParams.get("id");
  if (single) {
    let count = 0;
    if (kvReady()) {
      try {
        count = Number((await kv.get(`copy:${single}`)) ?? 0);
      } catch {
        // 读失败返回 0
      }
    }
    return NextResponse.json({ [single]: count });
  }

  const out: Record<string, number> = {};
  if (kvReady()) {
    try {
      const keys = await kv.keys("copy:*");
      if (keys.length) {
        const values = await kv.mget<number[]>(...keys);
        keys.forEach((key, i) => {
          out[key.replace(/^copy:/, "")] = Number(values[i] ?? 0);
        });
      }
    } catch {
      // 读失败返回已有数据（可能为空）
    }
  }
  return NextResponse.json(out);
}

/** POST /api/counts { id } → { count }（总计数 + 当日计数，供热榜用） */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let id: unknown;
  try {
    ({ id } = (await req.json()) as { id: unknown });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!kvReady()) {
    return NextResponse.json({ count: 0 });
  }
  try {
    const day = new Date().toISOString().slice(0, 10);
    // 防刷：同一 IP 对同一技能每天只计一次（seen 键带 48h TTL 自动过期）
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const seenKey = `seen:${day}:${ip}:${id}`;
    const isNew = await kv.set(seenKey, "1", { nx: true, ex: 172_800 });
    if (isNew) {
      const total = await kv.incr(`copy:${id}`);
      // 当日计数独立前缀，避免污染 GET 的 copy:* 全量读取
      await kv.incr(`daily:${day}:${id}`);
      return NextResponse.json({ count: total });
    }
    // 已计过，返回当前计数但不重复累加
    const total = Number((await kv.get(`copy:${id}`)) ?? 0);
    return NextResponse.json({ count: total, deduped: true });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
