"use client";

import { useState } from "react";
import { incrementCopyCount } from "@/lib/counts";
import { useLang } from "./LangProvider";

export default function InstallCommand({
  command,
  compact,
  skillId,
}: {
  command: string;
  compact?: boolean;
  /** 技能 id，复制成功后上报安装计数 */
  skillId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      if (skillId) void incrementCopyCount(skillId);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败
    }
  };

  if (compact) {
    return (
      <button
        onClick={copy}
        title={`${t("copy.tooltip")}${command}`}
        aria-label={`${t("copy.tooltip")}${command}`}
        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
          copied
            ? "border-signal/40 bg-signal-soft text-signal"
            : "border-hairline bg-surface text-ink-2 hover:border-signal/50 hover:text-signal"
        }`}
      >
        {copied ? t("copy.copied") : t("copy.copy")}
      </button>
    );
  }

  return (
    <div className="ticket flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <span className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-signal sm:block">
        Install
      </span>
      <code
        translate="no"
        className="min-w-0 flex-1 truncate font-mono text-xs text-ink sm:text-[13px]"
      >
        {command}
      </code>
      <button
        onClick={copy}
        aria-label={`${t("copy.tooltip")}${command}`}
        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
          copied
            ? "bg-signal-soft text-signal"
            : "bg-signal text-white hover:bg-signal-bright"
        }`}
      >
        {copied ? t("copy.copied") : t("copy.copy")}
      </button>
    </div>
  );
}
