/** 轻量 i18n：中英词典 + translate 辅助函数（无 React 依赖，纯函数） */

export type Lang = "zh" | "en";

export const LANGS: Lang[] = ["zh", "en"];

const zh: Record<string, string> = {
  // 顶栏
  "header.browse": "分类浏览",
  // 英雄区
  "hero.kicker": "SkillHub · SKILL.md 聚合目录",
  "hero.title1": "找到技能，",
  "hero.title2": "复制命令，装上就跑。",
  "hero.subtitle":
    "聚合 GitHub 上的开源 Agent Skills（SKILL.md）。搜索、预览，一键装进你的 agent。",
  "search.placeholder": "搜索技能名、描述、标签、仓库…",
  "filter.repo": "仓库",
  "filter.repoAll": "全部仓库",
  // 排序
  "sort.score": "评分",
  "sort.copies": "热度",
  "sort.stars": "星数",
  // 结果区
  "results.count": "{n} 个结果",
  "results.page": "第 {page}/{total} 页",
  "pagination.prev": "← 上一页",
  "pagination.next": "下一页 →",
  // 空状态
  "empty.title": "No match",
  "empty.desc": "没有匹配的技能。换个关键词，或清除筛选再试。",
  "empty.reset": "清除筛选",
  // 热榜
  "trending.title": "🔥 本周热榜",
  "trending.sub": "近 7 天复制次数",
  "trending.times": "次",
  // 卡片
  "card.noDesc": "（无描述）",
  "card.copiedTitle": "被复制安装次数",
  // 复制按钮
  "copy.copy": "复制",
  "copy.copied": "✓ 已复制",
  "copy.tooltip": "复制安装命令：",
  // 浏览页
  "browse.back": "← 返回首页",
  "browse.kicker": "Browse by Topic",
  "browse.title": "按主题浏览",
  "browse.subtitle": "按职业/主题归类，快速找到你需要的技能。",
  "browse.all": "全部",
  "browse.countSkills": "{n} 个技能",
  "browse.empty": "该分类暂无技能。",
  "browse.viewAll": "查看全部",
  // 详情页
  "detail.back": "← 返回 SkillHub",
  "detail.install": "Install",
  "detail.repo": "仓库",
  "detail.author": "作者",
  "detail.version": "版本",
  "detail.license": "许可",
  "detail.path": "来源路径",
  "detail.score": "质量评分",
  "detail.tags": "Tags",
  "detail.copied": "已复制 {n} 次",
  // 评分项
  "score.descLen": "描述长度",
  "score.descPlaceholder": "描述非占位",
  "score.descPurpose": "描述说明用途",
  "score.tags": "标签",
  "score.author": "作者",
  "score.version": "版本",
  "score.license": "许可",
  "score.sections": "正文章节",
  "score.code": "代码示例",
  "score.bodyLen": "正文篇幅",
  "score.usage": "用法说明",
  "score.repoStars": "仓库星数",
  "score.repoDesc": "仓库描述",
  "score.recency": "近期活跃",
};

const en: Record<string, string> = {
  "header.browse": "Browse",
  "hero.kicker": "SkillHub · SKILL.md Registry",
  "hero.title1": "Find a skill,",
  "hero.title2": "copy the command, run it.",
  "hero.subtitle":
    "Aggregating open-source Agent Skills (SKILL.md) from GitHub. Search, preview, and install into your agent in one click.",
  "search.placeholder": "Search name, description, tag, repo…",
  "filter.repo": "Repo",
  "filter.repoAll": "All repos",
  "sort.score": "Score",
  "sort.copies": "Hot",
  "sort.stars": "Stars",
  "results.count": "{n} results",
  "results.page": "Page {page} of {total}",
  "pagination.prev": "← Prev",
  "pagination.next": "Next →",
  "empty.title": "No match",
  "empty.desc": "No skills match. Try another keyword or clear the filters.",
  "empty.reset": "Clear filters",
  "trending.title": "🔥 Trending This Week",
  "trending.sub": "Copies in the last 7 days",
  "trending.times": "times",
  "card.noDesc": "(no description)",
  "card.copiedTitle": "Times installed",
  "copy.copy": "Copy",
  "copy.copied": "✓ Copied",
  "copy.tooltip": "Copy install command: ",
  "browse.back": "← Back to Home",
  "browse.kicker": "Browse by Topic",
  "browse.title": "Browse by Topic",
  "browse.subtitle": "Grouped by role and topic, find the skill you need fast.",
  "browse.all": "All",
  "browse.countSkills": "{n} skills",
  "browse.empty": "No skills in this category yet.",
  "browse.viewAll": "View all",
  "detail.back": "← Back to SkillHub",
  "detail.install": "Install",
  "detail.repo": "Repository",
  "detail.author": "Author",
  "detail.version": "Version",
  "detail.license": "License",
  "detail.path": "Source path",
  "detail.score": "Quality Score",
  "detail.tags": "Tags",
  "detail.copied": "installed {n} times",
  "score.descLen": "Description length",
  "score.descPlaceholder": "Non-placeholder",
  "score.descPurpose": "States purpose",
  "score.tags": "Tags",
  "score.author": "Author",
  "score.version": "Version",
  "score.license": "License",
  "score.sections": "Sections",
  "score.code": "Code examples",
  "score.bodyLen": "Body length",
  "score.usage": "Usage docs",
  "score.repoStars": "Repo stars",
  "score.repoDesc": "Repo description",
  "score.recency": "Recent activity",
};

export const messages: Record<Lang, Record<string, string>> = { zh, en };

/** 按 key 取文案，支持 {var} 占位替换 */
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  let s = messages[lang][key] ?? messages.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
