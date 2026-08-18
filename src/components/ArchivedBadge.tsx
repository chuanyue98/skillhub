"use client";

import { useLang } from "./LangProvider";

/**
 * 存档徽章：标记「这个技能的文件已整份存进 SkillHub 仓库」。
 * 只有零散小仓库会被存档（见 src/lib/vendor.ts），热门仓库仍是纯引用。
 */
export default function ArchivedBadge() {
  const { t } = useLang();
  return (
    <span
      title={t("mirror.badgeTitle")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-stamp-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-stamp"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1.5 3.5h9v6.5h-9z" />
        <path d="M1 1.75h10v1.75H1z" />
        <path d="M4.75 6h2.5" />
      </svg>
      {t("mirror.badge")}
    </span>
  );
}
