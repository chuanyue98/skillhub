# SkillHub · AI 智能体技能库

聚合 GitHub 上开源的 AI Agent Skills（`SKILL.md`），提供搜索、预览和一站式的 `npx skills add` 安装命令。纯静态站点，可免费部署到任意静态托管平台。

## 功能

- **GitHub 聚合索引**：从 `sources.json` 里配置的仓库自动抓取所有 `SKILL.md`，解析 frontmatter（name / description / tags / version / license…）
- **元数据 DB**：同步结果落在本地 SQLite（`data/skills.db`），可做查询、增量、后续的评分/统计
- **搜索页**：关键词（技能名 / 描述 / 标签 / 仓库）+ 热门标签筛选，纯客户端即时过滤，支持按评分 / 星数排序
- **技能详情页**：渲染 SKILL.md 正文，展示元数据、质量评分明细与一键安装命令（点击复制）
- **质量评分**：每个技能按 description 质量 / 元数据完整度 / 正文结构 / 来源信誉四个维度加权打分（0-100，A/B/C/D 四级），同步时自动计算

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
Next.js 静态导出（out/）── 搜索页 + 387 个技能详情页，零服务器
```

关键设计：

- **快照提交进仓库**：Vercel / GitHub Pages 构建时不需要访问 GitHub，构建完全离线、可复现。
- **SQLite 与 JSON 快照分工**：SQLite 是「数据层」（同步、分析、将来的审核/评分），JSON 快照是「发布层」（静态站点读取）。改动 schema 时只需改 `sync.ts` 和 `src/lib/types.ts` 两处。
- **质量评分纯函数化**：评分逻辑在 `src/lib/score.ts`，无 IO、可单测，同步脚本与将来的提交审核可复用。

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

**线上地址：https://skillhub-beta.vercel.app/**（Vercel，推 main 分支自动部署；GitHub Pages 镜像：https://chuanyue98.github.io/skillhub/）

```bash
npm run build    # 静态导出到 out/
```

`next.config.ts` 配置了 `output: "export"`，产物是纯静态文件，部署方式任选：

| 平台 | 方式 |
|---|---|
| **Vercel**（推荐） | 连 GitHub 仓库，构建命令 `npm run build`，输出目录 `out`，框架预设选 Next.js |
| **GitHub Pages** | Actions 里跑 `npm run build` 后上传 `out/` |
| **Cloudflare Pages** | 构建命令 `npm run build`，输出目录 `out` |
| 任意静态托管 | 上传 `out/` 即可 |

> 想加投稿、账号、评分等功能时：去掉 `next.config.ts` 里的 `output: "export"` 改用默认输出（serverless API routes），并把数据源从 JSON 快照切回 SQLite 直查。

## 新增数据源

编辑 `sources.json`，任意公开 GitHub 仓库（含 `SKILL.md`）都可作为源：

```json
[
  { "repo": "anthropics/skills", "note": "Anthropic 官方技能库" },
  { "repo": "your-name/your-skills", "note": "自定义说明" }
]
```

## 目录结构

```
skillhub/
├── sources.json              # 聚合的 GitHub 仓库列表
├── scripts/sync.ts           # 抓取 → 解析 → SQLite → JSON 快照
├── data/skills.db            # 本地 SQLite（gitignore，不入库）
├── public/data/skills.json   # 提交进仓库的运行时快照
└── src/
    ├── app/                  # Next.js App Router（搜索页 + 详情页）
    ├── components/           # SearchPage（客户端过滤）、InstallCommand（复制按钮）
    └── lib/                  # types.ts、skills.ts（快照加载）
```

## 路线图（MVP 之后）

1. **收录自动化**：GitHub App / 提交表单，让作者一键提交仓库
2. **质量与安全**：✅ description 质量评分已完成；SKILL.md linter、脚本静态扫描待做（技能会在用户机器上执行代码，安全审查不能省）
3. **信任层**：下载量、评分、verified 徽章
4. **中心化注册表**：版本化发布、依赖解析（从"GitHub 聚合"演进为 npm 式 registry）

## License

MIT
