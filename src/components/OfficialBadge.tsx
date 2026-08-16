/** 官方来源徽章：蓝色 ✓ 勾 + Official，标记来自官方仓库的技能 */
export default function OfficialBadge() {
  return (
    <span
      title="官方来源（由平台/公司官方仓库发布）"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-official-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-official"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 6.5 4.5 9 10 3.5" />
      </svg>
      Official
    </span>
  );
}
