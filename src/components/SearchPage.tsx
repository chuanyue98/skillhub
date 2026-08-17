"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SkillSnapshot } from "@/lib/types";
import { fetchCopyCounts } from "@/lib/counts";
import TrendingSection from "./TrendingSection";
import SkillCard from "./SkillCard";
import { useLang } from "./LangProvider";
import LangToggle from "./LangToggle";

type SortKey = "score" | "stars" | "copies";

const SORT_OPTIONS: [SortKey, string][] = [
  ["score", "sort.score"],
  ["copies", "sort.copies"],
  ["stars", "sort.stars"],
];

/** 每页展示的技能数（4 列 × 6 行） */
const PAGE_SIZE = 24;

export default function SearchPage({ skills }: { skills: SkillSnapshot[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
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
    const repo = searchParams.get("repo") ?? null;
    const sortParam = searchParams.get("sort");
    const s: SortKey =
      sortParam === "stars" || sortParam === "copies" ? sortParam : "score";
    const p = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setQuery((prev) => (prev === q ? prev : q));
    setActiveTag((prev) => (prev === tag ? prev : tag));
    setActiveRepo((prev) => (prev === repo ? prev : repo));
    setSortBy((prev) => (prev === s ? prev : s));
    setPage((prev) => (prev === p ? prev : p));
  }, [searchParams]);

  // 状态 → URL：防抖 replace（不刷历史记录），筛选结果可直接分享
  useEffect(() => {
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set("q", q);
    if (activeTag) params.set("tag", activeTag);
    if (activeRepo) params.set("repo", activeRepo);
    if (sortBy !== "score") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const t = setTimeout(() => {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [query, activeTag, activeRepo, sortBy, page, router]);

  const repos = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of skills) map.set(s.repo.fullName, (map.get(s.repo.fullName) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [skills]);

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
      if (activeRepo && s.repo.fullName !== activeRepo) return false;
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
  }, [skills, query, activeTag, activeRepo, sortBy, counts]);

  // 热度排名（基于全量计数，Top 3 卡片显示 🏆 徽章）
  const ranks = useMemo(() => {
    const byCount = [...skills]
      .map((s) => ({ id: s.id, c: counts[s.id] ?? 0 }))
      .filter((x) => x.c > 0)
      .sort((a, b) => b.c - a.c);
    const m = new Map<string, number>();
    byCount.forEach((x, i) => m.set(x.id, i + 1));
    return m;
  }, [skills, counts]);

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
    setActiveRepo(null);
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
          <Link
            href="/browse"
            className="rounded-full border border-hairline bg-surface px-2.5 py-1 transition hover:border-signal/50 hover:text-signal"
          >
            {t("header.browse")}
          </Link>
          <Link
            href="/submit"
            className="rounded-full border border-hairline bg-surface px-2.5 py-1 transition hover:border-signal/50 hover:text-signal"
          >
            + {t("header.submit")}
          </Link>
          <span className="rounded-full border border-hairline bg-surface px-2.5 py-1">
            {skills.length} SKILLS
          </span>
          <span className="hidden rounded-full border border-hairline bg-surface px-2.5 py-1 sm:block">
            {repos.length} REPOS
          </span>
          <LangToggle />
        </div>
      </header>

      {/* 英雄区 */}
      <section className="flex flex-col gap-7">
        <div className="flex max-w-2xl flex-col gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-signal">
            {t("hero.kicker")}
          </p>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>
          <p className="text-sm leading-relaxed text-ink-2 sm:text-base">
            {t("hero.subtitle")}
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
              placeholder={t("search.placeholder")}
              className="w-full rounded-xl border border-hairline-strong bg-surface py-3.5 pl-10 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition focus:border-signal focus:shadow-[0_0_0_3px_rgba(14,122,74,0.12)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 仓库筛选 */}
            <select
              aria-label={t("filter.repo")}
              value={activeRepo ?? ""}
              onChange={(e) => {
                setActiveRepo(e.target.value || null);
                setPage(1);
              }}
              className={`max-w-full cursor-pointer rounded-full border px-2.5 py-1 text-xs transition ${
                activeRepo
                  ? "border-signal bg-signal text-white"
                  : "border-hairline bg-surface text-ink-2 hover:border-signal/50 hover:text-signal"
              }`}
            >
              <option value="">
                {t("filter.repoAll")}
              </option>
              {repos.map(([fullName, count]) => (
                <option key={fullName} value={fullName}>
                  {fullName} · {count}
                </option>
              ))}
            </select>
            {topTags.length > 0 &&
              topTags.map(([tag, count]) => (
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
        </div>
      </section>

      {/* 热榜 */}
      <TrendingSection skills={skills} />

      {/* 结果区 */}
      <section id="results" className="flex scroll-mt-6 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-ink-3">
            {t("results.count", { n: filtered.length })}
            {query.trim() && (
              <>
                {` · “${query.trim()}”`}
              </>
            )}
            {activeTag && <> · #{activeTag}</>}
            {activeRepo && <> · {activeRepo}</>}
            {totalPages > 1 && (
              <>
                {" · "}
                {t("results.page", { page: safePage, total: totalPages })}
              </>
            )}
          </p>
          <div
            className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-0.5"
            role="group"
            aria-label="排序方式"
          >
            {SORT_OPTIONS.map(([key, labelKey]) => (
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
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline-strong bg-surface px-6 py-16 text-center">
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {t("empty.title")}
            </p>
            <p className="text-sm text-ink-2">{t("empty.desc")}</p>
            <button
              onClick={resetFilters}
              className="rounded-md border border-hairline-strong bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal hover:text-signal"
            >
              {t("empty.reset")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageSkills.map((s) => (
              <SkillCard
                key={s.id}
                skill={s}
                count={counts[s.id] ?? 0}
                rank={ranks.get(s.id)}
              />
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
              {t("pagination.prev")}
            </button>
            <span className="font-mono text-xs text-ink-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-ink-2"
            >
              {t("pagination.next")}
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
