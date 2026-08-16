"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SkillSnapshot } from "@/lib/types";
import { fetchCopyCounts } from "@/lib/counts";
import InstallCommand from "./InstallCommand";
import ScoreBadge from "./ScoreBadge";
import OfficialBadge from "./OfficialBadge";
import TrendingSection from "./TrendingSection";

type SortKey = "score" | "stars" | "copies";

const SORT_OPTIONS: [SortKey, string][] = [
  ["score", "评分"],
  ["copies", "热度"],
  ["stars", "星数"],
];

/** 每页展示的技能数（4 列 × 6 行） */
const PAGE_SIZE = 24;

export default function SearchPage({ skills }: { skills: SkillSnapshot[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // 拉取全量复制计数（供热度排序）
  useEffect(() => {
    fetchCopyCounts().then(setCounts);
  }, []);

  // URL 参数 → 状态：首屏读分享链接，之后响应前进/后退
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const tag = searchParams.get("tag") ?? null;
    const sortParam = searchParams.get("sort");
    const s: SortKey =
      sortParam === "stars" || sortParam === "copies" ? sortParam : "score";
    const p = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setQuery((prev) => (prev === q ? prev : q));
    setActiveTag((prev) => (prev === tag ? prev : tag));
    setSortBy((prev) => (prev === s ? prev : s));
    setPage((prev) => (prev === p ? prev : p));
  }, [searchParams]);

  // 状态 → URL：防抖 replace（不刷历史记录），筛选结果可直接分享
  useEffect(() => {
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set("q", q);
    if (activeTag) params.set("tag", activeTag);
    if (sortBy !== "score") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const t = setTimeout(() => {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [query, activeTag, sortBy, page, router]);

  const repoCount = useMemo(
    () => new Set(skills.map((s) => s.repo.fullName)).size,
    [skills]
  );

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of skills) {
      for (const tag of s.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = skills.filter((s) => {
      if (activeTag && !s.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.repo.fullName.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    return [...matched].sort((a, b) => {
      if (sortBy === "copies") {
        return (
          (counts[b.id] ?? 0) - (counts[a.id] ?? 0) ||
          b.score.total - a.score.total
        );
      }
      if (sortBy === "stars") {
        return b.repo.stars - a.repo.stars || b.score.total - a.score.total;
      }
      return b.score.total - a.score.total || b.repo.stars - a.repo.stars;
    });
  }, [skills, query, activeTag, sortBy, counts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSkills = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  };

  const resetFilters = () => {
    setQuery("");
    setActiveTag(null);
    setPage(1);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-2xl font-black tracking-tight text-ink">
            Skill<span className="text-signal">Hub</span>
          </span>
          <span className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-3">
            Agent Skill Registry
          </span>
        </Link>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
          <span className="rounded-full border border-hairline bg-surface px-2.5 py-1">
            {skills.length} SKILLS
          </span>
          <span className="hidden rounded-full border border-hairline bg-surface px-2.5 py-1 sm:block">
            {repoCount} REPOS
          </span>
        </div>
      </header>

      {/* 英雄区 */}
      <section className="flex flex-col gap-7">
        <div className="flex max-w-2xl flex-col gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-signal">
            SkillHub · SKILL.md 聚合目录
          </p>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl">
            找到技能，
            <br />
            复制命令，装上就跑。
          </h1>
          <p className="text-sm leading-relaxed text-ink-2 sm:text-base">
            聚合 GitHub 上的开源 Agent Skills（SKILL.md）。搜索、预览，
            一键装进你的 agent。
          </p>
        </div>

        {/* 搜索 + 标签 */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              autoComplete="off"
              aria-label="搜索技能"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="搜索技能名、描述、标签、仓库…"
              className="w-full rounded-xl border border-hairline-strong bg-surface py-3.5 pl-10 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition focus:border-signal focus:shadow-[0_0_0_3px_rgba(14,122,74,0.12)]"
            />
          </div>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(activeTag === tag ? null : tag);
                    setPage(1);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    activeTag === tag
                      ? "border-signal bg-signal text-white"
                      : "border-hairline bg-surface text-ink-2 hover:border-signal/50 hover:text-signal"
                  }`}
                >
                  {tag}
                  <span className="ml-1 font-mono text-[10px] opacity-60">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 热榜 */}
      <TrendingSection skills={skills} />

      {/* 结果区 */}
      <section id="results" className="flex scroll-mt-6 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-ink-3">
            {filtered.length} 个结果
            {query.trim() && (
              <>
                {` · “${query.trim()}”`}
              </>
            )}
            {activeTag && <> · #{activeTag}</>}
            {totalPages > 1 && (
              <>
                {" · 第 "}
                {safePage}
                {"/"}
                {totalPages}
                {" 页"}
              </>
            )}
          </p>
          <div
            className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-0.5"
            role="group"
            aria-label="排序方式"
          >
            {SORT_OPTIONS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                aria-pressed={sortBy === key}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  sortBy === key
                    ? "bg-ink text-paper"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline-strong bg-surface px-6 py-16 text-center">
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              No match
            </p>
            <p className="text-sm text-ink-2">
              没有匹配的技能。换个关键词，或清除筛选再试。
            </p>
            <button
              onClick={resetFilters}
              className="rounded-md border border-hairline-strong bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal hover:text-signal"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageSkills.map((s) => (
              <SkillCard key={s.id} skill={s} count={counts[s.id] ?? 0} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-3 pt-3"
            aria-label="分页"
          >
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-ink-2"
            >
              ← 上一页
            </button>
            <span className="font-mono text-xs text-ink-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-ink-2"
            >
              下一页 →
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

function SkillCard({ skill, count }: { skill: SkillSnapshot; count: number }) {
  const href = `/skill/${skill.repo.fullName}/${skill.name}`;
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
        {skill.description || "（无描述）"}
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
              title="被复制安装次数"
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
