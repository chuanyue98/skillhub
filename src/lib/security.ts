/**
 * SKILL.md 安全扫描：检测正文里的危险命令模式。
 *
 * 技能会在用户机器上执行代码，安全审查不能省。同步脚本对每个技能跑一遍，
 * 把命中的模式（含原文片段）写进快照，详情页展示风险提示。
 * 纯函数、无 IO，可单测。
 */
import type { RiskLevel, SecurityWarning, SkillSecurity } from "./types";

/** 单个危险模式 */
interface Rule {
  severity: SecurityWarning["severity"];
  /** i18n key（src/lib/i18n.ts 里 sec.* 文案） */
  code: string;
  re: RegExp;
}

const RULES: Rule[] = [
  // ── 高危：管道直通 shell（远程代码执行）──────────────
  {
    severity: "high",
    code: "sec.pipeShell",
    // curl/wget/... | sh/bash/zsh（含 base64 解码后直通 shell）
    re: /(?:curl|wget|fetch|iwr|Invoke-WebRequest|base64(?:\s+-d|\s+--decode)?)[^|`\n]{0,120}\|\s*(?:sh|bash|zsh|pwsh|powershell|iex)\b/i,
  },
  // ── 高危：递归删除根目录（rm -rf / 后跟行尾或命令分隔符，排除 rm -rf /var/... 之类）──
  {
    severity: "high",
    code: "sec.rmRoot",
    re: /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-f[a-zA-Z]*r[a-zA-Z]*)\s+\/(?=\s|;|&&|\||`|$)/i,
  },
  // ── 高危：fork 炸弹 ───────────────────────────────────
  {
    severity: "high",
    code: "sec.forkBomb",
    re: /:\(\)\s*\{\s*:\s*\|/,
  },
  // ── 高危：直接写磁盘设备 ──────────────────────────────
  {
    severity: "high",
    code: "sec.ddDisk",
    re: /\bdd\s+[^|`\n]*\bof=\/dev\/(?:sd|hd|nvme|vd|disk)/i,
  },
  // ── 中危：反弹 shell ──────────────────────────────────
  {
    severity: "medium",
    code: "sec.reverseShell",
    re: /\b(?:nc|ncat|netcat)\s+[^|`\n]*-e\b/i,
  },
  // ── 中危：sudo 提权 ───────────────────────────────────
  {
    severity: "medium",
    code: "sec.sudo",
    re: /\bsudo\s+\S/i,
  },
  // ── 中危：eval 动态执行 ───────────────────────────────
  {
    severity: "medium",
    code: "sec.eval",
    re: /\beval\s+["'`$]/i,
  },
  // ── 中危：chmod 777 宽松权限 ──────────────────────────
  {
    severity: "medium",
    code: "sec.chmod777",
    re: /\bchmod\s+(?:-[a-zA-Z]+\s+)?777\b/i,
  },
  // ── 低危：下载远程脚本/文件（安装流程常见，提示留意）──
  {
    severity: "low",
    code: "sec.download",
    re: /\b(?:curl|wget|iwr|Invoke-WebRequest)\s+\S/i,
  },
  // ── 低危：递归删除（非根目录，脚本清理常见）──────────
  {
    severity: "low",
    code: "sec.rmRecursive",
    re: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*(?!f)\s+\S|rm\s+-fr\s+\S/i,
  },
];

const MAX_MATCH = 60;

/** 截取命中的原文片段（单行、截断），避免把整段正文塞进快照 */
function snippet(raw: string): string {
  const oneLine = raw.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_MATCH
    ? `${oneLine.slice(0, MAX_MATCH)}…`
    : oneLine;
}

const RANK: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** 扫描正文，返回风险等级 + 命中的警告列表（按严重级别降序） */
export function scanSkill(body: string): SkillSecurity {
  const warnings: SecurityWarning[] = [];
  for (const rule of RULES) {
    const m = body.match(rule.re);
    if (m) warnings.push({ severity: rule.severity, code: rule.code, match: snippet(m[0]) });
  }
  warnings.sort((a, b) => RANK[b.severity] - RANK[a.severity]);

  const risk: RiskLevel = warnings.length
    ? warnings.reduce<RiskLevel>((acc, w) => (RANK[w.severity] > RANK[acc] ? w.severity : acc), "low")
    : "none";
  return { risk, warnings };
}
