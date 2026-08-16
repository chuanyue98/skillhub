"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SkillSnapshot, ScoreLevel, SkillScore } from "@/lib/types";
import InstallCommand from "./InstallCommand";
import ScoreBadge from "./ScoreBadge";
import CopyCount from "./CopyCount";
import OfficialBadge from "./OfficialBadge";
import LangToggle from "./LangToggle";
import { useLang } from "./LangProvider";

/** 评分项中文标签 → i18n key（标签来自 score.ts，数据侧固定中文） */
const SCORE_LABEL_KEYS: Record<string, string> = {
  描述长度: "score.descLen",
  描述非占位: "score.descPlaceholder",
  描述说明用途: "score.descPurpose",
  标签: "score.tags",
  作者: "score.author",
  版本: "score.version",
  许可: "score.license",
  正文章节: "score.sections",
  代码示例: "score.code",
  正文篇幅: "score.bodyLen",
  用法说明: "score.usage",
  仓库星数: "score.repoStars",
  仓库描述: "score.repoDesc",
  近期活跃: "score.recency",
};

export default function SkillDetail({ skill }: { skill: SkillSnapshot }) {
  const { t, lang } = useLang();
  const { name, description, body, tags, author, version, license, install, score, path, official, repo: repoMeta } = skill;

  const specLabel = (zh: string, en: string) => (lang === "en" ? en : zh);
  const specs: { label: string; value: string; href?: string }[] = [
    {
      label: specLabel("仓库", "Repository"),
      value: repoMeta.fullName,
      href: repoMeta.htmlUrl,
    },
    ...(author ? [{ label: specLabel("作者", "Author"), value: author }] : []),
    ...(version ? [{ label: specLabel("版本", "Version"), value: version }] : []),
    ...(license ? [{ label: specLabel("许可", "License"), value: license }] : []),
    { label: specLabel("来源路径", "Source path"), value: path },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="w-fit font-mono text-xs font-semibold text-ink-2 transition hover:text-signal lg:hidden"
      >
        {t("detail.back")}
      </Link>

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* 左侧信息栏（桌面吸顶 + 限高内部滚动；移动端排在正文之后） */}
        <aside className="order-2 flex flex-col gap-6 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="hidden w-fit font-mono text-xs font-semibold text-ink-2 transition hover:text-signal lg:block"
            >
              {t("detail.back")}
            </Link>
            <span className="ml-auto">
              <LangToggle />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
              {t("detail.install")}
            </span>
            <InstallCommand command={install} skillId={skill.id} />
            <CopyCount skillId={skill.id} />
          </div>

          {/* 规格表 */}
          <dl className="flex flex-col gap-px overflow-hidden rounded-xl border border-hairline bg-hairline">
            {specs.map(({ label, value, href }) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5 bg-surface px-3.5 py-2.5">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">
                  {label}
                </dt>
                <dd translate="no" className="min-w-0 break-words font-mono text-xs leading-snug text-ink-2">
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
                {t("detail.tags")}
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
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                translate="no"
                className="text-balance text-3xl font-black tracking-tight text-ink sm:text-4xl"
              >
                {name}
              </h1>
              {official && <OfficialBadge />}
            </div>
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

/** 质量评分面板：总分 + 可展开的维度明细（默认折叠，避免侧栏超高一屏） */
function ScorePanel({ score }: { score: SkillScore }) {
  const { t } = useLang();
  return (
    <details className="group flex flex-col gap-3 rounded-xl border border-hairline bg-surface px-4 py-3.5">
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">
          {t("detail.score")}
        </span>
        <span className="font-mono text-xl font-black leading-none text-ink">
          {score.total}
          <span className="text-xs font-semibold text-ink-3">/100</span>
        </span>
        <ScoreBadge score={score} />
        <svg
          viewBox="0 0 12 12"
          className="ml-auto h-3 w-3 text-ink-3 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </summary>
      <div className="flex flex-col gap-1.5 pt-2">
        {score.items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 text-[11px]">
            <span className="w-[4.5rem] shrink-0 truncate text-ink-2">
              {t(SCORE_LABEL_KEYS[item.label] ?? item.label)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
              <div
                className={`h-full rounded-full ${BAR_COLORS[score.level]}`}
                style={{
                  width: `${Math.round((item.points / item.max) * 100)}%`,
                }}
              />
            </div>
            <span className="w-11 shrink-0 text-right font-mono text-ink-3">
              {item.points}/{item.max}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
