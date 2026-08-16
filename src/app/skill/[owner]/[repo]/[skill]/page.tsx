import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { loadSkills } from "@/lib/skills";
import InstallCommand from "@/components/InstallCommand";
import ScoreBadge from "@/components/ScoreBadge";
import type { ScoreLevel, SkillScore } from "@/lib/types";

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

  const {
    name,
    description,
    body,
    tags,
    author,
    version,
    license,
    install,
    score,
    path,
    repo: repoMeta,
  } = found;

  const specs: { label: string; value: string; href?: string }[] = [
    {
      label: "仓库",
      value: repoMeta.fullName,
      href: repoMeta.htmlUrl,
    },
    ...(author ? [{ label: "作者", value: author }] : []),
    ...(version ? [{ label: "版本", value: version }] : []),
    ...(license ? [{ label: "许可", value: license }] : []),
    { label: "来源路径", value: path },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="w-fit font-mono text-xs font-semibold text-ink-2 transition hover:text-signal lg:hidden"
      >
        ← 返回 SkillHub
      </Link>

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* 左侧信息栏（桌面吸顶 + 限高内部滚动；移动端排在正文之后） */}
        <aside className="order-2 flex flex-col gap-6 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          <Link
            href="/"
            className="hidden w-fit font-mono text-xs font-semibold text-ink-2 transition hover:text-signal lg:block"
          >
            ← 返回 SkillHub
          </Link>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
              Install
            </span>
            <InstallCommand command={install} />
          </div>

          {/* 规格表 */}
          <dl className="flex flex-col gap-px overflow-hidden rounded-xl border border-hairline bg-hairline">
            {specs.map(({ label, value, href }) => (
              <div key={label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">
                  {label}
                </dt>
                <dd translate="no" className="break-all font-mono text-xs text-ink-2">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-signal hover:underline underline-offset-2"
                    >
                      {value}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <ScorePanel score={score} />

          {tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-signal-soft px-2 py-0.5 font-mono text-[11px] text-signal"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 右侧：标题 + 正文 */}
        <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
          <header className="flex flex-col gap-2">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-signal">
              Skill · <span translate="no">{repoMeta.fullName}</span>
            </p>
            <h1
              translate="no"
              className="text-balance text-3xl font-black tracking-tight text-ink sm:text-4xl"
            >
              {name}
            </h1>
            <p className="text-sm leading-relaxed text-ink-2 sm:text-base">
              {description}
            </p>
          </header>

          <div className="rounded-xl border border-hairline bg-surface px-5 py-6 sm:px-8 sm:py-8">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const BAR_COLORS: Record<ScoreLevel, string> = {
  A: "bg-emerald-600",
  B: "bg-cyan-600",
  C: "bg-amber-500",
  D: "bg-zinc-400",
};

/** 质量评分面板：总分 + 各维度得分明细 */
function ScorePanel({ score }: { score: SkillScore }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">
          质量评分
        </span>
        <span className="font-mono text-2xl font-black text-ink">
          {score.total}
          <span className="text-sm font-semibold text-ink-3">/100</span>
        </span>
        <ScoreBadge score={score} />
      </div>
      <div className="flex flex-col gap-2">
        {score.items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 text-ink-2">{item.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
              <div
                className={`h-full rounded-full ${BAR_COLORS[score.level]}`}
                style={{
                  width: `${Math.round((item.points / item.max) * 100)}%`,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-ink-3">
              {item.points}/{item.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
