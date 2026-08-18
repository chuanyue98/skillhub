# SkillHub · AI 智能体技能库

聚合 GitHub 上开源的 AI Agent Skills（`SKILL.md`），提供搜索、预览和一站式的 `npx skills add` 安装命令。

## 功能

- **GitHub 聚合索引**：从 `sources.json` 里配置的仓库自动抓取所有 `SKILL.md`，解析 frontmatter（name / description / tags / version / license…）
- **元数据 DB**：同步结果落在本地 SQLite（`data/skills.db`），可做查询、增量、后续的评分/统计
- **搜索页**：关键词（技能名 / 描述 / 标签 / 仓库）+ 热门标签 + 仓库下拉筛选，支持按评分 / 星数 / 热度排序，筛选状态同步到 URL（`?q=&tag=&repo=&sort=&page=`）；热度 Top 3 卡片显示 🏆 排名徽章
- **技能详情页**：两栏布局（左信息栏吸顶 + 右正文），渲染 SKILL.md 正文（GFM 表格），展示元数据、质量评分明细与一键安装命令（点击复制）
- **质量评分**：每个技能按 description 质量 / 元数据完整度 / 正文结构 / 来源信誉四个维度加权打分（0-100，A/B/C/D 四级），同步时自动计算
- **安全扫描**：同步时对每个 SKILL.md 做危险命令检测（管道直通 shell、rm -rf /、fork 炸弹、dd 写磁盘、反弹 shell、sudo/eval/chmod 777 等），按高危/中危/低危分级，详情页展示风险提示与命中片段
- **复制安装计数**：点击「复制」写入 Vercel Redis（KV），卡片/详情页显示「已复制 N 次」，支持按热度排序；带 IP 去重防刷（同一 IP 对同一技能每天只计一次，`seen:` 键 48h 自动过期）
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
安全扫描（src/lib/security.ts）── 危险命令检测，分级 + 命中片段
      │
      ▼
SQLite（data/skills.db）── 权威存储，支持增量与后续分析
      │
      ▼
public/data/skills.json ── 元数据快照（无正文，列表页数据源）
public/data/bodies.json ── 正文索引 { id: body }（详情页/API 按需合并）
      │
      ▼
Next.js（默认 serverless 输出）── 搜索页 + 详情页 + API 路由（/api/skills、/api/counts、/api/trending）
      │
      ▼
Vercel Redis（KV）── 复制计数与热榜的实时存储
```

关键设计：

- **快照提交进仓库**：Vercel 构建时不需要访问 GitHub，构建可复现；技能数据变更走 `npm run sync` 提交快照。
- **正文与元数据拆分**：`skills.json` 只存元数据（列表页数据源，体积从 7MB 降到 ~1.1MB），正文单独存 `bodies.json` 按 id 索引——详情页 / API 需要时才合并，首页/浏览页不再把全部正文灌给浏览器。
- **SQLite 与 JSON 快照分工**：SQLite 是「数据层」（同步、分析、将来的审核/评分），JSON 快照是「发布层」（页面与 API 读取）。改动 schema 时只需改 `sync.ts` 和 `src/lib/types.ts` 两处。
- **质量评分纯函数化**：评分逻辑在 `src/lib/score.ts`，无 IO、可单测，同步脚本与将来的提交审核可复用。
- **计数存储与页面解耦**：计数/热榜走 Vercel Redis，KV 未配置时所有功能优雅降级（返回空计数、隐藏热榜），站点不会崩。

## 质量评分规则

每个技能由同步脚本自动打分（0-100），四个维度加权，明细随快照下发到页面：

| 维度 | 满分 | 评分项 |
|---|---|---|
| description 质量 | 30 | 长度（15）、非占位文本（10）、说明用途的行为动词（5） |
| 元数据完整度 | 15 | 标签（6）、作者（3）、版本（3，semver 满分）、许可（3） |
| 正文结构 | 40 | 章节标题（10）、代码示例（13）、正文篇幅（10）、用法说明（7） |
| 来源信誉 | 15 | 仓库星数（5）、仓库描述（5）、近期活跃（5） |

等级：A ≥ 85，B ≥ 70，C ≥ 50，D < 50。权重集中在 `src/lib/score.ts`，调整后重新 `npm run sync` 即可。
- **内容拉取走 raw 域名**：不受 GitHub API 速率限制；仓库元数据 API 未认证时 60 次/小时，设置 `GITHUB_TOKEN` 提升到 5000 次/小时。

## 快速开始

```bash
npm install
npm run sync     # 抓取 sources.json 中的仓库，写 SQLite + 导出 skills.json / bodies.json
npm run dev      # 本地开发 http://localhost:3000
```

改动了 `sources.json`（增删仓库）后重新 `npm run sync` 即可。

### 同步脚本

```bash
GITHUB_TOKEN=ghp_xxx npm run sync   # 建议设置，未设置会按 60 次/小时配额运行
```

`scripts/sync.ts` 的行为：

- 对每个仓库：拉仓库元数据（star、描述、默认分支）→ 递归 git tree 找所有 `SKILL.md`
- 对每个技能：拉正文 → 解析 frontmatter → 校验（缺 name/description、坏 YAML、超过 200KB 都会跳过并告警）→ 质量评分 + 安全扫描
- 技能名缺省取 SKILL.md 所在目录名，自动 slug 化
- 单请求 20 秒超时、8 路并发，单个坏仓库/坏技能不会中断整个同步
- 导出时把同仓库重名技能去重（保留路径更短、正文更全的一份），并拆分元数据（`skills.json`）与正文（`bodies.json`）

## 构建与部署

**线上地址：https://skillhub-ai.vercel.app/**（Vercel，推 main 分支自动部署）

```bash
npm run build    # serverless 构建（含 API 路由）
```

- **Vercel**（唯一主站）：连 GitHub 仓库，推 main 自动部署。复制计数依赖 **Vercel Redis（KV）**——Storage 面板创建后连到项目，自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`（`src/lib/kv.ts` 同时兼容 `STORAGE_` 前缀）。
- **本地开发**：`vercel env pull .env.local` 拉取真实 KV 凭证后 `npm run dev`，计数功能即可本地联调。

## 新增数据源

**作者提交**：访问 https://skillhub-ai.vercel.app/submit 填表，会自动生成预填的 GitHub issue（含仓库地址与说明），维护者审核后收录。

**维护者手动添加**：编辑 `sources.json`，任意公开 GitHub 仓库（含 `SKILL.md`）都可作为源：

```json
[
  { "repo": "anthropics/skills", "note": "Anthropic 官方技能库", "official": true },
  { "repo": "your-name/your-skills", "note": "自定义说明" }
]
```

然后 `npm run sync`（注意 GitHub API 未认证配额 60 次/小时，设置 `GITHUB_TOKEN` 可提升到 5000 次/小时）。

## REST API

公开只读接口（带 CORS，可直接跨域调用）。适合 SkillHub CLI（`sk`）、第三方工具集成、脚本抓取。

**基础 URL**：`https://skillhub-ai.vercel.app/api`

### 列表接口

```
GET /api/skills                            # 列表（分页）
GET /api/skills?q=react&tag=devops         # 关键词 + 标签筛选
GET /api/skills?category=engineering       # 按分类筛选
GET /api/skills?repo=anthropics/skills     # 按仓库筛选（逗号分隔多选）
GET /api/skills?sort=copies|stars|score    # 排序（默认 score）
GET /api/skills?page=2&limit=20            # 分页（limit ≤ 100）
GET /api/skills?fields=id,name,score.total # 字段裁剪（支持点路径，见下）
```

响应格式：`{ total, page, limit, totalPages, items }`。`items` 是技能对象数组，字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 全局唯一标识 `owner/repo/name` |
| `name` | string | 技能名（SKILL.md frontmatter，缺省取目录名） |
| `description` | string | 技能描述（agent 决定何时加载技能的关键） |
| `body` | string | SKILL.md 全文（Markdown，体积大，默认返回；用 `fields` 裁剪可跳过） |
| `tags` | string[] | 标签列表 |
| `author` / `version` / `license` | string? | 元数据（可能缺失） |
| `path` | string | SKILL.md 在仓库中的路径 |
| `install` | string | 一键安装命令 `npx skills add owner/repo --skill name` |
| `repo` | object | `{ fullName, description, stars, htmlUrl, updatedAt }` 仓库元数据 |
| `official` | boolean? | 官方来源标记（anthropics / vercel-labs） |
| `category` | string | 职业/主题分类（engineering、marketing、bizops…） |
| `score` | object | `{ total, level, items[] }` 质量评分（0-100，A/B/C/D） |
| `copies` | number | 仅 `sort=copies` 时附加：累计复制安装次数 |

#### fields 字段裁剪（省流量利器）

`fields` 接收逗号分隔的字段名，只返回指定的字段；**支持点路径**（`.` 取嵌套字段），适合只需要部分数据的 CLI / 脚本。不传则返回全部字段（含大体积 `body`）。

```bash
# 只取轻量字段，跳过 body（约节省 90% 流量）
curl "https://skillhub-ai.vercel.app/api/skills?limit=5&fields=id,name,score.total,repo.stars,tags"

# 点路径示例：只要评分总分和仓库星数
curl "https://skillhub-ai.vercel.app/api/skills?q=code-review&fields=name,score.total,repo.fullName"

# 组合用法：按热度排序 + 取轻量字段 + 第二页
curl "https://skillhub-ai.vercel.app/api/skills?sort=copies&page=2&limit=10&fields=id,name,copies,score.total"
```

点路径会把嵌套对象裁剪成只剩你选的那几个键：

```json
{
  "total": 384,
  "items": [
    {
      "id": "obra/superpowers/brainstorming",
      "name": "brainstorming",
      "score": { "total": 88 },
      "repo": { "fullName": "obra/superpowers" }
    }
  ]
}
```

### 单技能详情

```
GET /api/skills/:owner/:repo/:name
```

```bash
curl "https://skillhub-ai.vercel.app/api/skills/obra/superpowers/brainstorming"
```

返回单个技能完整对象（所有字段，含 `body`）。路径中的技能名需 URL 编码；不存在返回 `404 { "error": "not found" }`。

### 其他说明

- 全部接口带 `Access-Control-Allow-Origin: *`，浏览器跨域可直接 fetch
- 错误响应统一为 `{ "error": "..." }` + 对应状态码（400 / 404）
- 无鉴权、无速率限制，可放心集成（数据为公开快照，实时计数走 /api/counts）

## 目录结构

```
skillhub/
├── sources.json              # 聚合的 GitHub 仓库列表（official 标记官方源）
├── scripts/sync.ts           # 抓取 → 解析 → SQLite → JSON 快照（含评分/分类/安全扫描）
├── data/skills.db            # 本地 SQLite（gitignore，不入库）
├── public/data/skills.json   # 元数据快照（无正文，列表页数据源，随仓库提交）
├── public/data/bodies.json   # 正文索引 { id: body }（详情页/API 按需合并）
└── src/
    ├── app/                  # 页面 + API 路由（/api/skills、/api/counts、/api/trending）+ sitemap
    ├── components/           # SearchPage、BrowsePage、SkillCard、InstallCommand…
    └── lib/                  # types、skills（快照加载）、score（评分）、security（安全扫描）、fields（字段裁剪）、categories（分类）、dedup（去重）、kv（Redis 客户端）
```

## 路线图（MVP 之后）

1. **收录自动化**：✅ 提交表单（/submit 生成预填 issue）；自动收录审核待做
2. **质量与安全**：✅ description 质量评分；✅ 危险命令静态扫描（管道 shell / rm -rf / / fork 炸弹等，详情页风险提示）；SKILL.md linter、更细的脚本静态分析待做
3. **信任层**：✅ 复制计数 + 热度排序 + 热榜 + Official 徽章已完成
4. **中心化注册表**：版本化发布、依赖解析（从"GitHub 聚合"演进为 npm 式 registry）
5. **多语言**：站点界面中英切换（✅ 已完成）
6. **质量与测试**：✅ 评分/字段裁剪/分类/去重/安全扫描单元测试（`npm test`）；计数防刷 ✅

## License

MIT
