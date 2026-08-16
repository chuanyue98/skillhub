import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/** 近 N 天复制次数聚合，供热榜使用 */
const TRENDING_DAYS = 7;

function kvReady(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** GET /api/trending → { [skillId]: 近7天复制次数 }（仅返回有计数的技能） */
export async function GET(): Promise<NextResponse> {
  const out: Record<string, number> = {};
  if (!kvReady()) return NextResponse.json(out);

  try {
    const dayKeys: string[] = [];
    for (let i = 0; i < TRENDING_DAYS; i++) {
      const day = new Date(Date.now() - i * 86400000)
        .toISOString()
        .slice(0, 10);
      dayKeys.push(`daily:${day}:*`);
    }
    // 逐日匹配当日键并聚合
    for (const pattern of dayKeys) {
      const keys = await kv.keys(pattern);
      if (!keys.length) continue;
      const values = await kv.mget<number[]>(...keys);
      keys.forEach((key, i) => {
        const id = key.slice(key.lastIndexOf(":") + 1);
        out[id] = (out[id] ?? 0) + Number(values[i] ?? 0);
      });
    }
  } catch {
    // 读失败返回已有数据（可能为空）
  }
  return NextResponse.json(out);
}
