"use client";

import { useEffect, useState } from "react";

/** 详情页/卡片展示某个技能的复制安装次数（运行时从 /api/counts 拉取） */
export default function CopyCount({ skillId }: { skillId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/counts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, number>) => setCount(data[skillId] ?? 0))
      .catch(() => {});
  }, [skillId]);

  if (count <= 0) return null;

  return (
    <span
      title="被复制安装次数"
      className="font-mono text-[11px] text-ink-3"
    >
      ⧉ 已复制 {count.toLocaleString()} 次
    </span>
  );
}
