import type { ScoreLevel, SkillScore } from "@/lib/types";

const LEVEL_STYLES: Record<ScoreLevel, string> = {
  A: "border-emerald-700/30 bg-emerald-600/10 text-emerald-800",
  B: "border-cyan-700/30 bg-cyan-600/10 text-cyan-800",
  C: "border-amber-600/40 bg-amber-500/10 text-amber-800",
  D: "border-zinc-400/50 bg-zinc-500/10 text-zinc-600",
};

/** 质量评分徽章：数字 + 等级，按分数区间着色（浅色主题） */
export default function ScoreBadge({
  score,
  className = "",
}: {
  score: SkillScore;
  className?: string;
}) {
  return (
    <span
      title={`质量评分 ${score.total}/100（${score.level} 级）`}
      className={`inline-flex w-14 items-center justify-between gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${LEVEL_STYLES[score.level]} ${className}`}
    >
      <span>{score.total}</span>
      <span className="opacity-60">{score.level}</span>
    </span>
  );
}
