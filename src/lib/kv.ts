import { createClient } from "@vercel/kv";

/**
 * KV 客户端：兼容两种环境变量前缀。
 * - KV_（旧 Vercel KV / 自定义前缀设成 KV 时）
 * - STORAGE_（Vercel 市场 Redis 连接默认前缀）
 * 未配置时返回不可用状态，让 API 优雅降级（计数功能静默关闭）。
 */
const url =
  process.env.KV_REST_API_URL ?? process.env.STORAGE_REST_API_URL ?? "";
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.STORAGE_REST_API_TOKEN ?? "";

export const kv = createClient({ url, token });

export function kvReady(): boolean {
  return Boolean(url && token);
}
