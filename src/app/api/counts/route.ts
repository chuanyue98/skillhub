import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/** KV 未配置（本地开发等）时返回空计数，不让站点崩 */
function kvReady(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** GET /api/counts → { [skillId]: count } */
export async function GET(): Promise<NextResponse> {
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
    const total = await kv.incr(`copy:${id}`);
    // 当日计数独立前缀，避免污染 GET 的 copy:* 全量读取
    await kv.incr(`daily:${day}:${id}`);
    return NextResponse.json({ count: total });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
