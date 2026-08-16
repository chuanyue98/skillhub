"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SkillSnapshot } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";
import OfficialBadge from "./OfficialBadge";

const TOP_N = 6;

/** 首页热榜：近 7 天被复制安装最多的技能（数据来自 /api/trending） */
export default function TrendingSection({
  skills,
}: {
  skills: SkillSnapshot[];
}) {
  const [trending, setTrending] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/trending", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then(setTrending)
      .catch(() => {});
  }, []);

  const ranked = skills
    .map((s) => ({ skill: s, count: trending[s.id] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);

  // 数据未就绪或无计数时不渲染（避免空榜占位）
  if (ranked.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="本周热榜">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-signal">
          🔥 本周热榜
        </span>
        <span className="h-px flex-1 bg-hairline" aria-hidden="true" />
        <span className="font-mono text-[10px] text-ink-3">
          近 7 天复制次数
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ranked.map(({ skill, count }, i) => (
          <Link
            key={skill.id}
            href={`/skill/${skill.repo.fullName}/${skill.name}`}
            className="group flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-3 transition hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-[0_6px_24px_rgba(14,122,74,0.08)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-mono text-lg font-black leading-none ${
                  i < 3 ? "text-signal" : "text-ink-3"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {skill.official && <OfficialBadge />}
            </div>
            <span
              translate="no"
              className="truncate font-mono text-xs font-bold text-ink transition group-hover:text-signal"
            >
              {skill.name}
            </span>
            <span className="font-mono text-[10px] text-ink-3">
              ⧉ {count.toLocaleString()} 次
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
