# SkillHub · AI 智能体技能库

聚合 GitHub 上开源的 AI Agent Skills（`SKILL.md`），提供搜索、预览和一站式的 `npx skills add` 安装命令。

## 功能

- **GitHub 聚合索引**：从 `sources.json` 里配置的仓库自动抓取所有 `SKILL.md`，解析 frontmatter（name / description / tags / version / license…）
- **元数据 DB**：同步结果落在本地 SQLite（`data/skills.db`），可做查询、增量、后续的评分/统计
- **搜索页**：关键词（技能名 / 描述 / 标签 / 仓库）+ 热门标签筛选，支持按评分 / 星数 / 热度排序，筛选状态同步到 URL（`?q=&tag=&sort=&page=`）
- **技能详情页**：两栏布局（左信息栏吸顶 + 右正文），渲染 SKILL.md 正文（GFM 表格），展示元数据、质量评分明细与一键安装命令（点击复制）
- **质量评分**：每个技能按 description 质量 / 元数据完整度 / 正文结构 / 来源信誉四个维度加权打分（0-100，A/B/C/D 四级），同步时自动计算
- **复制安装计数**：点击「复制」写入 Vercel Redis（KV），卡片/详情页显示「已复制 N 次」，支持按热度排序
- **热榜**：首页展示近 7 天被复制安装最多的 Top 6 技能
- **Official 徽章**：官方来源（anthropics / vercel-labs）自动打标
- **分类浏览页**（`/browse`）：按职业/主题归为 11 个分类（工程研发、市场营销、产品管理…），带计数侧栏
- **REST API**：`/api/skills` 公开只读接口，支持筛选 / 排序 / 分页 / 字段裁剪，带 CORS

## 架构与数据流

```
sources.json（仓库列表）
      │  npm run sync（scripts/sync.ts）
      ▼
GitHub REST API ── 仓库元数据 + git tree 定位 SKILL.md
      │
      ▼
raw.githubusercontent.com ── 拉取正文（不走 API 配额，8 路并发）
      │
      ▼
gray-matter ── 解析 frontmatter（坏 YAML / 缺字段自动跳过，不中断同步）
      │
      ▼
质量评分（src/lib/score.ts）── 四维度加权 0-100，附明细与 A/B/C/D 等级
      │
      ▼
SQLite（data/skills.db）── 权威存储，支持增量与后续分析
      │
      ▼
public/data/skills.json ── 导出快照，随仓库提交，网页的运行时数据源
      │
      ▼
Next.js（默认 serverless 输出）── 搜索页 + 详情页 + API 路由（/api/skills、/api/counts、/api/trending）
      │
      ▼
Vercel Redis（KV）── 复制计数与热榜的实时存储
```

关键设计：

- **快照提交进仓库**：Vercel 构建时不需要访问 GitHub，构建可复现；技能数据变更走 `npm run sync` 提交快照。
- **SQLite 与 JSON 快照分工**：SQLite 是「数据层」（同步、分析、将来的审核/评分），JSON 快照是「发布层」（页面与 API 读取）。改动 schema 时只需改 `sync.ts` 和 `src/lib/types.ts` 两处。
- **质量评分纯函数化**：评分逻辑在 `src/lib/score.ts`，无 IO、可单测，同步脚本与将来的提交审核可复用。
- **计数存储与页面解耦**：计数/热榜走 Vercel Redis，KV 未配置时所有功能优雅降级（返回空计数、隐藏热榜），站点不会崩。

## 质量评分规则

每个技能由同步脚本自动打分（0-100），四个维度加权，明细随快照下发到页面：

| 维度 | 满分 | 评分项 |
|---|---|---|
| description 质量 | 30 | 长度（15）、非占位文本（10）、说明用途的行为动词（5） |
| 元数据完整度 | 25 | 标签（10）、作者（5）、版本（5，semver 满分）、许可（5） |
| 正文结构 | 30 | 章节标题（8）、代码示例（10）、正文篇幅（7）、用法说明（5） |
| 来源信誉 | 15 | 仓库星数（5）、仓库描述（5）、近期活跃（5） |

等级：A ≥ 85，B ≥ 70，C ≥ 50，D < 50。权重集中在 `src/lib/score.ts`，调整后重新 `npm run sync` 即可。
- **内容拉取走 raw 域名**：不受 GitHub API 速率限制；仓库元数据 API 未认证时 60 次/小时，设置 `GITHUB_TOKEN` 提升到 5000 次/小时。

## 快速开始

```bash
npm install
npm run sync     # 抓取 sources.json 中的仓库，写 SQLite + 导出 skills.json
npm run dev      # 本地开发 http://localhost:3000
```

改动了 `sources.json`（增删仓库）后重新 `npm run sync` 即可。

### 同步脚本

```bash
GITHUB_TOKEN=ghp_xxx npm run sync   # 建议设置，未设置会按 60 次/小时配额运行
```

`scripts/sync.ts` 的行为：

- 对每个仓库：拉仓库元数据（star、描述、默认分支）→ 递归 git tree 找所有 `SKILL.md`
- 对每个技能：拉正文 → 解析 frontmatter → 校验（缺 name/description、坏 YAML、超过 200KB 都会跳过并告警）
- 技能名缺省取 SKILL.md 所在目录名，自动 slug 化
- 单请求 20 秒超时、8 路并发，单个坏仓库/坏技能不会中断整个同步

## 构建与部署

**线上地址：https://skillhub-ai.vercel.app/**（Vercel，推 main 分支自动部署）

```bash
npm run build    # serverless 构建（含 API 路由）
```

- **Vercel**（主站）：连 GitHub 仓库，推 main 自动部署。复制计数依赖 **Vercel Redis（KV）**——Storage 面板创建后连到项目，自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`（`src/lib/kv.ts` 同时兼容 `STORAGE_` 前缀）。
- **GitHub Pages 镜像**：https://chuanyue98.github.io/skillhub/（仅静态页面，计数/热榜不可用）
- **本地开发**：`vercel env pull .env.local` 拉取真实 KV 凭证后 `npm run dev`，计数功能即可本地联调。

## 新增数据源

编辑 `sources.json`，任意公开 GitHub 仓库（含 `SKILL.md`）都可作为源：

```json
[
  { "repo": "anthropics/skills", "note": "Anthropic 官方技能库" },
  { "repo": "your-name/your-skills", "note": "自定义说明" }
]
```

## REST API

公开只读接口（带 CORS，可直接跨域调用）：

```
GET /api/skills                          # 列表（分页）
GET /api/skills?q=react&tag=devops       # 关键词 + 标签筛选
GET /api/skills?category=engineering     # 按分类筛选
GET /api/skills?sort=copies|stars|score  # 排序（默认 score）
GET /api/skills?page=2&limit=20          # 分页（limit ≤ 100）
GET /api/skills?fields=id,name,score     # 字段裁剪（可省略 body 省流量）
GET /api/skills/:owner/:repo/:name       # 单个技能详情
```

响应格式：`{ total, page, limit, totalPages, items }`。

## 目录结构

```
skillhub/
├── sources.json              # 聚合的 GitHub 仓库列表（official 标记官方源）
├── scripts/sync.ts           # 抓取 → 解析 → SQLite → JSON 快照（含评分/分类）
├── data/skills.db            # 本地 SQLite（gitignore，不入库）
├── public/data/skills.json   # 提交进仓库的运行时快照
└── src/
    ├── app/                  # 页面 + API 路由（/api/skills、/api/counts、/api/trending）
    ├── components/           # SearchPage、BrowsePage、SkillCard、InstallCommand…
    └── lib/                  # types、skills（快照加载）、score（评分）、categories（分类）、kv（Redis 客户端）
```

## 路线图（MVP 之后）

1. **收录自动化**：GitHub App / 提交表单，让作者一键提交仓库
2. **质量与安全**：✅ description 质量评分已完成；SKILL.md linter、脚本静态扫描待做（技能会在用户机器上执行代码，安全审查不能省）
3. **信任层**：✅ 复制计数 + 热度排序 + 热榜 + Official 徽章已完成
4. **中心化注册表**：版本化发布、依赖解析（从"GitHub 聚合"演进为 npm 式 registry）
5. **多语言**：站点界面中英切换

## License

MIT
