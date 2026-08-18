/**
 * fields 字段裁剪：支持顶层字段（id, name）与点路径（score.total, repo.stars）。
 * 从 /api/skills 路由抽出，纯函数可单测。
 */

/** 点路径取值：select({a:{b:1}}, "a.b") → 1；缺失返回 undefined */
export function select(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const p of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** 按 fields 裁剪对象：只保留选中的顶层字段；点路径把嵌套对象裁成只剩选中的键 */
export function pickFields(
  s: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const tops = new Set<string>();
  const nested = new Map<string, string[]>();
  for (const f of fields) {
    const dot = f.indexOf(".");
    if (dot === -1) tops.add(f);
    else {
      const top = f.slice(0, dot);
      nested.set(top, [...(nested.get(top) ?? []), f.slice(dot + 1)]);
    }
  }
  for (const key of Object.keys(s)) {
    if (tops.has(key)) {
      out[key] = s[key];
    } else if (nested.has(key)) {
      const src = s[key];
      if (src != null && typeof src === "object") {
        const sub: Record<string, unknown> = {};
        for (const p of nested.get(key)!) {
          const v = select(src, p);
          if (v !== undefined) sub[p.split(".").pop()!] = v;
        }
        out[key] = sub;
      }
    }
  }
  return out;
}
