/**
 * GitHub 认证：拿到 token 后 API 配额从 60 次/小时提到 5000 次/小时。
 *
 * 取值顺序：
 *   1. GITHUB_TOKEN 环境变量（CI 用这个）
 *   2. 本机 gh CLI 的登录态（gh auth token）——本地开发不用另建 token
 *   3. 都没有 → 匿名，60 次/小时
 */
import { execFileSync } from "node:child_process";

export interface TokenInfo {
  token?: string;
  /** 来源描述，用于启动时打一行日志 */
  source: string;
}

export function resolveToken(): TokenInfo {
  const env = process.env.GITHUB_TOKEN?.trim();
  if (env) return { token: env, source: "GITHUB_TOKEN 环境变量" };
  try {
    const out = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();
    if (out) return { token: out, source: "gh CLI 登录态（gh auth token）" };
  } catch {
    // gh 没装或没登录：退回匿名配额
  }
  return { source: "未认证" };
}

/** 启动时打一行认证状态 */
export function logAuth({ token, source }: TokenInfo): void {
  console.log(
    token
      ? `🔑 GitHub 认证：${source}（配额 5000 次/小时）`
      : "ℹ️ 未认证（配额 60 次/小时）：设置 GITHUB_TOKEN 或 gh auth login 可提到 5000 次/小时"
  );
}
