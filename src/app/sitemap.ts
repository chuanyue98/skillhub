import type { MetadataRoute } from "next";
import { loadSkills } from "@/lib/skills";

/** 站点基址（与 layout metadataBase 一致） */
const BASE = "https://skillhub-ai.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const skills = loadSkills();
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/browse`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/submit`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    ...skills.map((s) => ({
      url: `${BASE}/skill/${s.repo.fullName}/${encodeURIComponent(s.name)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
