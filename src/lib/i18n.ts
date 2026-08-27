/** 轻量 i18n：中英词典 + translate 辅助函数（无 React 依赖，纯函数） */

export type Lang = "zh" | "en";

export const LANGS: Lang[] = ["zh", "en"];

const zh: Record<string, string> = {
  // 顶栏
  "header.browse": "分类浏览",
  "header.submit": "提交",
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
  "detail.related": "相关技能",
  "detail.relatedEmpty": "暂无相关技能",
  // 提交收录
  "submit.kicker": "Submit a Skill Repo",
  "submit.title": "提交技能仓库",
  "submit.subtitle": "有好的 Agent Skills 仓库？填个表提交，审核通过后收录进 SkillHub。",
  "submit.repoLabel": "GitHub 仓库",
  "submit.repoPlaceholder": "owner/repo，如 yourname/awesome-skills",
  "submit.repoHint": "公开仓库，包含 SKILL.md 技能文件。",
  "submit.noteLabel": "补充说明（可选）",
  "submit.notePlaceholder": "这个仓库有什么特色技能？",
  "submit.cta": "创建提交 Issue",
  "submit.back": "← 返回首页",
  "submit.error": "请填写仓库地址（格式 owner/repo）",
  // 存档（vendored 副本）
  "mirror.badge": "已存档",
  "mirror.badgeTitle": "这个技能的文件已整份存进 SkillHub 仓库，上游消失也不会丢",
  "mirror.title": "存档副本",
  "mirror.desc":
    "这是个零散的小仓库，SkillHub 已把技能文件（SKILL.md、脚本、许可证）整份存进自己的仓库，上游删库/转私有也能继续取用。",
  "mirror.upstream": "原仓库",
  "mirror.commit": "存档版本",
  "mirror.browse": "浏览存档文件 ↗",
  "mirror.fallback": "备用安装（装存档副本）",
  "mirror.gone": "⚠️ 上游仓库当前已无法访问，页面展示的是存档副本。",
  // 安全提示
  "sec.title": "安全提示",
  "sec.risk.none": "未检测到危险命令",
  "sec.risk.low": "低风险：含下载/删除等常见命令，安装前请留意",
  "sec.risk.medium": "中风险：检测到提权/动态执行等敏感操作，安装前请审阅源码",
  "sec.risk.high": "高危：检测到可能执行远程代码或破坏系统的命令，请勿直接运行！",
  "sec.match": "命中",
  "sec.pipeShell": "管道直通 shell（curl/wget | sh/bash，可能远程执行代码）",
  "sec.rmRoot": "递归删除根目录（rm -rf /）",
  "sec.forkBomb": "疑似 fork 炸弹",
  "sec.ddDisk": "直接写入磁盘设备（dd of=/dev/…）",
  "sec.reverseShell": "疑似反弹 shell（nc -e）",
  "sec.sudo": "使用 sudo 提权",
  "sec.eval": "eval 动态执行代码",
  "sec.chmod777": "chmod 777 宽松权限",
  "sec.download": "下载远程文件/脚本（curl/wget）",
  "sec.rmRecursive": "递归删除命令（rm -r/-rf）",
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
  "header.submit": "Submit",
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
  "detail.related": "Related skills",
  "detail.relatedEmpty": "No related skills",
  // Submit
  "submit.kicker": "Submit a Skill Repo",
  "submit.title": "Submit a Skill Repo",
  "submit.subtitle": "Have a great Agent Skills repo? Fill in the form and it will be reviewed for inclusion in SkillHub.",
  "submit.repoLabel": "GitHub repo",
  "submit.repoPlaceholder": "owner/repo, e.g. yourname/awesome-skills",
  "submit.repoHint": "Public repo containing SKILL.md files.",
  "submit.noteLabel": "Notes (optional)",
  "submit.notePlaceholder": "What makes this repo special?",
  "submit.cta": "Create submit issue",
  "submit.back": "← Back to Home",
  "submit.error": "Please enter a repo (format owner/repo)",
  "mirror.badge": "Archived",
  "mirror.badgeTitle": "Files for this skill are mirrored into the SkillHub repo, so it survives upstream deletion",
  "mirror.title": "Archived copy",
  "mirror.desc":
    "This is a small, scattered repo, so SkillHub keeps a full copy of its skill files (SKILL.md, scripts, license) in its own repository — usable even if upstream is deleted or goes private.",
  "mirror.upstream": "Upstream",
  "mirror.commit": "Snapshot",
  "mirror.browse": "Browse archived files ↗",
  "mirror.fallback": "Fallback install (from archive)",
  "mirror.gone": "⚠️ The upstream repo is currently unreachable — showing the archived copy.",
  "sec.title": "Security notice",
  "sec.risk.none": "No dangerous commands detected",
  "sec.risk.low": "Low risk: common download/delete commands, review before installing",
  "sec.risk.medium": "Medium risk: privilege escalation / dynamic execution detected, review the source before installing",
  "sec.risk.high": "High risk: commands that may execute remote code or damage your system — do NOT run directly!",
  "sec.match": "Matched",
  "sec.pipeShell": "Pipes to shell (curl/wget | sh/bash, potential remote code execution)",
  "sec.rmRoot": "Recursive delete of root (rm -rf /)",
  "sec.forkBomb": "Possible fork bomb",
  "sec.ddDisk": "Writes directly to a disk device (dd of=/dev/…)",
  "sec.reverseShell": "Possible reverse shell (nc -e)",
  "sec.sudo": "Uses sudo (privilege escalation)",
  "sec.eval": "Dynamic eval execution",
  "sec.chmod777": "chmod 777 permissive permissions",
  "sec.download": "Downloads remote files/scripts (curl/wget)",
  "sec.rmRecursive": "Recursive delete (rm -r/-rf)",
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

/**
 * 标签展示文案：标签是 SKILL.md 里的自由 taxonomy，同时作为筛选 key（?tag=xxx）
 * 和 URL 的一部分，不能改底层值。这里只做「展示层」翻译，筛选/URL 仍用原始英文。
 * 未收录的标签回退原文（英文），所以中文界面会混排「已翻译 + 原文」，属预期行为。
 */
export const TAG_LABELS: Record<Lang, Record<string, string>> = {
  zh: {
    commercial: "商业",
    bizops: "商业运营",
    orchestrator: "编排调度",
    "research-ops": "研究运营",
    "design-system": "设计系统",
    process: "流程",
    vendor: "供应商/采购",
    capacity: "产能",
    sop: "SOP 标准流程",
    reliability: "可靠性",
    sre: "站点可靠性工程",
    observability: "可观测性",
    testing: "测试",
    engineering: "工程",
    devops: "DevOps",
    product: "产品",
    "product-management": "产品管理",
    growth: "增长",
    brand: "品牌",
    seo: "SEO",
    content: "内容",
    marketing: "营销",
    finance: "财务",
    research: "研究",
    "market-research": "市场研究",
    compliance: "合规",
    audit: "审计",
    risk: "风险",
    security: "安全",
    productivity: "效率",
    "knowledge-management": "知识管理",
    documentation: "文档",
    wiki: "维基",
    operations: "运营",
    sales: "销售",
    partnerships: "合作",
    pricing: "定价",
    procurement: "采购",
    "customer-success": "客户成功",
    leadership: "领导力",
    strategy: "战略",
  },
  en: {},
};

/** 取标签的展示文案：中文界面走翻译表，英文界面/未收录标签回退原文 */
export function tagLabel(lang: Lang, tag: string): string {
  if (lang === "en") return tag;
  return TAG_LABELS.zh[tag] ?? tag;
}

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
