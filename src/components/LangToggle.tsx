"use client";

import { useLang } from "./LangProvider";
import { LANGS } from "@/lib/i18n";

/** 中/EN 语言切换（右上角小按钮） */
export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Language / 语言"
      className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-0.5"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase transition ${
            lang === l ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"
          }`}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
