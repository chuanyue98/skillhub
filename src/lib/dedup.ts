/**
 * 通用「同 key 取最优」去重：对一组条目按 key 分组，每组用 better() 选出保留的那个。
 * 从 sync 脚本的导出去重逻辑抽出，纯函数可单测。
 */

/** 对 items 按 key 分组，每组保留 better(a, b) 为 true 的 a（即 a 优于 b 时保留 a） */
export function pickBestByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  better: (a: T, b: T) => boolean
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    const cur = map.get(key);
    if (!cur || better(item, cur)) map.set(key, item);
  }
  return [...map.values()];
}
