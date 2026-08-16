"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SkillSnapshot } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { fetchCopyCounts } from "@/lib/counts";
import SkillCard from "./SkillCard";
import { useLang } from "./LangProvider";
import LangToggle from "./LangToggle";

/** 按主题/职业浏览页：分类侧栏（带计数）+ 技能网格，?cat= 同步 URL */
export default function BrowsePage({ skills }: { skills: SkillSnapshot[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { t, lang } = useLang();

  useEffect(() => {
    fetchCopyCounts().then(setCounts);
  }, []);

  // URL ?cat= → 状态
  useEffect(() => {
    const cat = searchParams.get("cat");
    setActive((prev) => (prev === cat ? prev : cat));
  }, [searchParams]);

  // 状态 → URL（replace，不刷历史）
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(active ? `/browse?cat=${active}` : "/browse", {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [active, router]);

  // 每个分类的计数
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of skills) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, [skills]);

  const filtered = useMemo(() => {
    const list = active ? skills.filter((s) => s.category === active) : skills;
    return [...list].sort((a, b) => b.score.total - a.score.total);
  }, [skills, active]);

  const activeCat = CATEGORIES.find((c) => c.id === active) ?? null;
  const catLabel = (c: { label: string; labelEn: string }) =>
    lang === "en" ? c.labelEn : c.label;
  const catDesc = (c: { description: string; descriptionEn: string }) =>
    lang === "en" ? c.descriptionEn : c.description;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
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
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <Link
            href="/"
            className="rounded-md border border-hairline bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-ink-2 transition hover:border-signal/50 hover:text-signal"
          >
            {t("browse.back")}
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-signal">
          {t("browse.kicker")}
        </p>
        <h1 className="text-balance text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {t("browse.title")}
        </h1>
        <p className="text-sm text-ink-2">{t("browse.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* 分类侧栏（桌面吸顶；移动端横向滚动 chips） */}
        <nav
          aria-label="技能分类"
          className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:w-52 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          <button
            onClick={() => setActive(null)}
            aria-pressed={active === null}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
              active === null
                ? "bg-ink text-paper"
                : "border border-hairline bg-surface text-ink-2 hover:border-signal/50 hover:text-signal"
            }`}
          >
            {t("browse.all")}
            <span className="ml-1.5 font-mono text-[10px] opacity-60">
              {skills.length}
            </span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(active === cat.id ? null : cat.id)}
              aria-pressed={active === cat.id}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                active === cat.id
                  ? "bg-ink text-paper"
                  : "border border-hairline bg-surface text-ink-2 hover:border-signal/50 hover:text-signal"
              }`}
            >
              <span className="mr-1.5">{cat.emoji}</span>
              {catLabel(cat)}
              <span className="ml-1.5 font-mono text-[10px] opacity-60">
                {categoryCounts.get(cat.id) ?? 0}
              </span>
            </button>
          ))}
        </nav>

        {/* 技能列表 */}
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-ink-3">
              {activeCat ? (
                <>
                  {activeCat.emoji} {catLabel(activeCat)} ·{" "}
                  {catDesc(activeCat)} ·{" "}
                  {t("browse.countSkills", { n: filtered.length })}
                </>
              ) : (
                <>{t("browse.countSkills", { n: filtered.length })}</>
              )}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline-strong bg-surface px-6 py-16 text-center">
              <p className="text-sm text-ink-2">{t("browse.empty")}</p>
              <button
                onClick={() => setActive(null)}
                className="rounded-md border border-hairline-strong bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-signal hover:text-signal"
              >
                {t("browse.viewAll")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((s) => (
                <SkillCard key={s.id} skill={s} count={counts[s.id] ?? 0} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
