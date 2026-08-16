import type { NextConfig } from "next";

// 默认 serverless 输出：API 路由（复制计数 /api/counts 等）依赖 Vercel Functions。
// 从纯静态导出迁移而来——GH Pages 静态镜像不再适用，主站为 Vercel。
const nextConfig: NextConfig = {};

export default nextConfig;
