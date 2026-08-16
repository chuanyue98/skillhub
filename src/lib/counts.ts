"use client";

/** 拉取全部技能的复制计数 { [skillId]: n } */
export async function fetchCopyCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/counts", { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, number>;
  } catch {
    return {};
  }
}

/** 复制一次（fire-and-forget，失败静默） */
export async function incrementCopyCount(id: string): Promise<void> {
  try {
    await fetch("/api/counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    // 静默失败：计数不可用不影响复制
  }
}
