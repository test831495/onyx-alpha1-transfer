export interface SecurityAuditResult { findings: string[]; passed: boolean; }
export function auditSecuritySurface(source: Readonly<Record<string, string>>): SecurityAuditResult {
  const patterns: [string, RegExp][] = [
    ["child-process", /\b(child_process|execSync|execFile|spawnSync|fork)\b/],
    ["network-client", /\b(fetch|axios|api\.github\.com)\b/],
    ["git-write", /\b(git\s+(commit|push|tag|merge|reset|clean|checkout))\b/],
    ["deployment", /\b(deploy|netlify)\b/],
    ["credential-material", /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|authorization:\s*Bearer/i],
    ["live-execution", /promotionExecutable\s*[:=]\s*true|schedulerEnabled\s*[:=]\s*true/],
  ];
  const findings: string[] = [];
  for (const [file, text] of Object.entries(source)) for (const [category, pattern] of patterns) if (pattern.test(text)) findings.push(`${file}: ${category}`);
  return { findings, passed: findings.length === 0 };
}