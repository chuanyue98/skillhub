"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "./LangProvider";
import LangToggle from "./LangToggle";

/** 提交收录页：填写仓库地址，生成预填的 GitHub issue 提交链接。 */
export default function SubmitPage() {
  const { t } = useLang();
  const [repo, setRepo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);

  const buildIssueUrl = () => {
    const r = repo.trim().replace(/^https?:\/\/(www\.)?github\.com\//, "");
    const title = `收录请求: ${r}`;
    const body = [
      `## 仓库`,
      `\`${r}\``,
      ``,
      `## 链接`,
      `https://github.com/${r}`,
      ``,
      `## 说明`,
      note.trim() || "（无）",
    ].join("\n");
    const params = new URLSearchParams({
      title,
      body,
      labels: "submission",
    });
    return `https://github.com/chuanyue98/skillhub/issues/new?${params.toString()}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = repo.trim().replace(/^https?:\/\/(www\.)?github\.com\//, "");
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(r)) {
      setError(true);
      return;
    }
    setError(false);
    window.open(buildIssueUrl(), "_blank", "noopener");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
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
            {t("submit.back")}
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-signal">
          {t("submit.kicker")}
        </p>
        <h1 className="text-balance text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {t("submit.title")}
        </h1>
        <p className="text-sm leading-relaxed text-ink-2">
          {t("submit.subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-xl border border-hairline bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="repo"
            className="font-mono text-xs font-bold uppercase tracking-widest text-ink-2"
          >
            {t("submit.repoLabel")}
          </label>
          <input
            id="repo"
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder={t("submit.repoPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 font-mono text-sm text-ink placeholder-ink-3 outline-none transition focus:border-signal ${
              error ? "border-red-500" : "border-hairline-strong"
            }`}
          />
          {error ? (
            <p className="text-xs font-semibold text-red-500">
              {t("submit.error")}
            </p>
          ) : (
            <p className="text-xs text-ink-3">{t("submit.repoHint")}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="note"
            className="font-mono text-xs font-bold uppercase tracking-widest text-ink-2"
          >
            {t("submit.noteLabel")}
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("submit.notePlaceholder")}
            rows={4}
            className="w-full resize-y rounded-lg border border-hairline-strong bg-paper px-3.5 py-2.5 text-sm text-ink placeholder-ink-3 outline-none transition focus:border-signal"
          />
        </div>

        <button
          type="submit"
          className="w-fit rounded-lg bg-signal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-signal/90"
        >
          {t("submit.cta")} ↗
        </button>
      </form>
    </div>
  );
}
