import type { NextConfig } from "next";

// GitHub Pages 项目站点挂在 /skillhub/ 子路径下，需要 basePath；
// 本地开发 / Vercel 等部署保持根路径。CI（GH_PAGES=true）里自动切换。
const isGhPages = process.env.GH_PAGES === "true";

const nextConfig: NextConfig = {
  // 纯静态导出：构建产物在 out/，可部署到 Vercel / GitHub Pages / Cloudflare Pages 等任意静态托管。
  // 将来要加投稿、账号等功能时，去掉这行改用默认输出（serverless API routes）即可。
  output: "export",
  // 详情页生成 name/index.html 并链接到 /name/，保证任意静态托管都能直接访问子页面
  trailingSlash: true,
  ...(isGhPages ? { basePath: "/skillhub" } : {}),
};

export default nextConfig;
