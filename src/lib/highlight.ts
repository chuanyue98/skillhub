/**
 * 搜索关键词高亮：把文本按命中位置切成片段，命中片段由调用方自行加样式。
 * 纯函数、无 React 依赖，可单测。
 *
 * 大小写不敏感；查询按空白切分成多个关键词（AND 匹配时每个词各自高亮）；
 * 输出只含字符串片段——渲染层把 hit 片段包 <mark>，天然避免 XSS。
 */

export type Segment = { text: string; hit: boolean };

/** 把查询串拆成关键词（去重、降序排长度避免短词吞长词的高亮） */
function keywordsOf(query: string): string[] {
  const parts = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return [...new Set(parts)].sort((a, b) => b.length - a.length);
}

/**
 * 切分文本：命中片段 hit=true。
 * 例：highlight("Code Review Skill", "review") →
 *   [{ text: "Code ", hit: false }, { text: "Review", hit: true }, { text: " Skill", hit: false }]
 */
export function highlight(text: string, query: string): Segment[] {
  const keywords = keywordsOf(query);
  if (keywords.length === 0) return [{ text, hit: false }];

  // 收集所有命中区间 [start, end)，跨关键词合并重叠
  const ranges: [number, number][] = [];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    let from = 0;
    while (true) {
      const i = lower.indexOf(kw, from);
      if (i === -1) break;
      ranges.push([i, i + kw.length]);
      from = i + kw.length;
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const out: Segment[] = [];
  let pos = 0;
  for (const [start, end] of merged) {
    if (start > pos) out.push({ text: text.slice(pos, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    pos = end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}
