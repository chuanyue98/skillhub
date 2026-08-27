"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { SkillSnapshot } from "@/lib/types";
import { highlight } from "@/lib/highlight";
import InstallCommand from "./InstallCommand";
import ScoreBadge from "./ScoreBadge";
import OfficialBadge from "./OfficialBadge";
import ArchivedBadge from "./ArchivedBadge";
import { useLang } from "./LangProvider";
import { tagLabel } from "@/lib/i18n";

/** 命中片段渲染：软绿底 + 深绿字，与主题 selection 色一致 */
function mark(segments: { text: string; hit: boolean }[]): ReactNode[] {
  return segments.map((seg, i) =>
    seg.hit ? (
      <mark
        key={i}
        className="rounded-sm bg-signal-soft px-0.5 font-bold text-signal"
      >
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
}

/** 技能卡片：评分徽章 + 名字 + 描述 + 标签 + 仓库 + 复制计数/按钮；query 命中处高亮 */
export default function SkillCard({
  skill,
  count = 0,
  rank,
  query = "",
}: {
  skill: SkillSnapshot;
  /** 复制安装次数（运行时从 /api/counts 拉取） */
  count?: number;
  /** 热度排名（前 3 显示 🏆 徽章） */
  rank?: number;
  /** 搜索关键词（命中片段在名字/描述/标签/仓库里高亮） */
  query?: string;
}) {
  const href = `/skill/${skill.repo.fullName}/${skill.name}`;
  const { t, lang } = useLang();
  return (
    <article className="group relative flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 transition hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-[0_6px_24px_rgba(14,122,74,0.08)] [content-visibility:auto] [contain-intrinsic-size:auto_190px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ScoreBadge score={skill.score} />
          {skill.official && <OfficialBadge />}
          {skill.mirror && <ArchivedBadge />}
          <Link
            href={href}
            translate="no"
            className="truncate font-mono text-sm font-bold text-ink transition group-hover:text-signal after:absolute after:inset-0 after:content-['']"
          >
            {mark(highlight(skill.name, query))}
          </Link>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {rank !== undefined && rank <= 3 && count > 0 && (
            <span
              title={`Hot #${rank}`}
              className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                rank === 1
                  ? "bg-amber-100 text-amber-700"
                  : rank === 2
                    ? "bg-slate-200 text-slate-600"
                    : "bg-orange-100 text-orange-700"
              }`}
            >
              #{rank}
            </span>
          )}
        </span>
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">
        {mark(highlight(skill.description || t("card.noDesc"), query))}
      </p>

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skill.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-signal-soft px-1.5 py-0.5 font-mono text-[10px] text-signal"
            >
              {mark(highlight(tagLabel(lang, tag), query))}
            </span>
          ))}
          {skill.tags.length > 4 && (
            <span className="font-mono text-[10px] text-ink-3">
              +{skill.tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
        <span translate="no" className="truncate font-mono text-[10px] text-ink-3">
          {mark(highlight(skill.repo.fullName, query))}
        </span>
        <span className="relative z-10 flex shrink-0 items-center gap-1.5">
          {count > 0 && (
            <span
              title={t("card.copiedTitle")}
              className="font-mono text-[10px] text-ink-3"
            >
              ⧉ {count.toLocaleString()}
            </span>
          )}
          <InstallCommand command={skill.install} compact skillId={skill.id} />
        </span>
      </div>
    </article>
  );
}
