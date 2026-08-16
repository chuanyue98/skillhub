import type { NextConfig } from "next";

// GitHub Pages 项目站点挂在 /skillhub/ 子路径下，需要 basePath + trailingSlash；
// 本地开发 / Vercel 等部署保持根路径。CI 里设置 GH_PAGES=true 即可切换。
const isGhPages = process.env.GH_PAGES === "true";

const nextConfig: NextConfig = {
  // 纯静态导出：构建产物在 out/，可部署到 Vercel / GitHub Pages / Cloudflare Pages 等任意静态托管。
  // 将来要加投稿、账号等功能时，去掉这行改用默认输出（serverless API routes）即可。
  output: "export",
  ...(isGhPages ? { basePath: "/skillhub", trailingSlash: true } : {}),
};

export default nextConfig;
