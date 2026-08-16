"use client";

import Link from "next/link";
import type { SkillSnapshot } from "@/lib/types";
import InstallCommand from "./InstallCommand";
import ScoreBadge from "./ScoreBadge";
import OfficialBadge from "./OfficialBadge";
import { useLang } from "./LangProvider";

/** 技能卡片：评分徽章 + 名字 + 描述 + 标签 + 仓库 + 复制计数/按钮 */
export default function SkillCard({
  skill,
  count = 0,
}: {
  skill: SkillSnapshot;
  /** 复制安装次数（运行时从 /api/counts 拉取） */
  count?: number;
}) {
  const href = `/skill/${skill.repo.fullName}/${skill.name}`;
  const { t } = useLang();
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 transition hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-[0_6px_24px_rgba(14,122,74,0.08)] [content-visibility:auto] [contain-intrinsic-size:auto_190px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ScoreBadge score={skill.score} />
          {skill.official && <OfficialBadge />}
          <Link
            href={href}
            translate="no"
            className="truncate font-mono text-sm font-bold text-ink transition group-hover:text-signal"
          >
            {skill.name}
          </Link>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-stamp">
          ★ {skill.repo.stars.toLocaleString()}
        </span>
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">
        {skill.description || t("card.noDesc")}
      </p>

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skill.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-signal-soft px-1.5 py-0.5 font-mono text-[10px] text-signal"
            >
              {tag}
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
          {skill.repo.fullName}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
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
