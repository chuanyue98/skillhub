import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSkills, loadBodies } from "@/lib/skills";
import type { SkillSnapshot } from "@/lib/types";
import SkillDetail from "@/components/SkillDetail";

export const dynamic = "force-static";

export function generateStaticParams() {
  return loadSkills().map((s) => {
    const [owner, repo] = s.repo.fullName.split("/");
    return { owner, repo, skill: s.name };
  });
}

/** 详情页 SEO：标题用技能名，描述用技能 description */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; skill: string }>;
}): Promise<Metadata> {
  const { owner, repo, skill } = await params;
  const found = loadSkills().find(
    (s) => s.repo.fullName === `${owner}/${repo}` && s.name === skill
  );
  if (!found) return {};
  const title = `${found.name} · SkillHub`;
  return {
    title,
    description: found.description,
    openGraph: {
      title,
      description: found.description,
      type: "article",
    },
  };
}

/**
 * 相关技能：同分类 +2、共享标签 +2、同仓库 +1，取分数最高的 4 个（排除自己）。
 * 在服务端计算——全量快照在手，避免把 600+ 技能灌给客户端。
 */
function findRelated(
  skill: SkillSnapshot,
  all: SkillSnapshot[]
): SkillSnapshot[] {
  const tagSet = new Set(skill.tags);
  const scored = all
    .filter((s) => s.id !== skill.id)
    .map((s) => {
      let score = 0;
      if (s.category === skill.category) score += 2;
      score += s.tags.filter((t) => tagSet.has(t)).length * 2;
      if (s.repo.fullName === skill.repo.fullName) score += 1;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.s.score.total - a.s.score.total)
    .slice(0, 4)
    .map((x) => x.s);
  return scored;
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; skill: string }>;
}) {
  const { owner, repo, skill } = await params;
  const all = loadSkills();
  const found = all.find(
    (s) => s.repo.fullName === `${owner}/${repo}` && s.name === skill
  );
  if (!found) notFound();

  // 正文单独存在 bodies.json，这里按 id 合并成完整技能
  const full = { ...found, body: loadBodies()[found.id] ?? "" };
  const related = findRelated(found, all);

  return <SkillDetail skill={full} related={related} />;
}
