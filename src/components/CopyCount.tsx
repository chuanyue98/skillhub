"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";

/** 详情页/卡片展示某个技能的复制安装次数（运行时从 /api/counts 拉取） */
export default function CopyCount({ skillId }: { skillId: string }) {
  const [count, setCount] = useState(0);
  const { t } = useLang();

  useEffect(() => {
    // 单查：只取当前技能计数，不拉全量（?id= 支持 owner/repo/name 带斜杠的 id）
    fetch(`/api/counts?id=${encodeURIComponent(skillId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, number>) => setCount(data[skillId] ?? 0))
      .catch(() => {});
  }, [skillId]);

  if (count <= 0) return null;

  return (
    <span title={t("card.copiedTitle")} className="font-mono text-[11px] text-ink-3">
      ⧉ {t("detail.copied", { n: count.toLocaleString() })}
    </span>
  );
}
