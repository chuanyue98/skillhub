import { notFound } from "next/navigation";
import { loadSkills } from "@/lib/skills";
import SkillDetail from "@/components/SkillDetail";

export const dynamic = "force-static";

export function generateStaticParams() {
  return loadSkills().map((s) => {
    const [owner, repo] = s.repo.fullName.split("/");
    return { owner, repo, skill: s.name };
  });
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; skill: string }>;
}) {
  const { owner, repo, skill } = await params;
  const found = loadSkills().find(
    (s) => s.repo.fullName === `${owner}/${repo}` && s.name === skill
  );
  if (!found) notFound();

  return <SkillDetail skill={found} />;
}
