#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

failures=0
pass() { printf 'PASS: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; failures=$((failures + 1)); }

[[ "$(git branch --show-current)" == "feature/phase1a9-governed-bounded-scheduler" ]] && pass "branch" || fail "branch"
[[ "$(git rev-parse HEAD)" == "ee20f8aa5a82720f0b03b49a55e1f390c97c6f84" ]] && pass "sealed HEAD" || fail "sealed HEAD"
[[ -z "$(git diff --cached --name-only)" ]] && pass "staged files: 0" || fail "staged files present"

pnpm --filter @onyx/phase1a9-governed-scheduler typecheck && pass "scheduler typecheck" || fail "scheduler typecheck"
pnpm --filter @onyx/phase1a9-governed-scheduler test && pass "scheduler baseline tests" || fail "scheduler baseline tests"
pnpm --dir packages/phase1a9-governed-scheduler exec vitest run tests/phase1a9-validator.test.ts tests/acceptance-audit.test.ts tests/local-simulation.test.ts tests/fault-injection.test.ts && pass "validator and simulation tests" || fail "validator and simulation tests"

required=(
  docs/phase1a9/evidence/phase1a9-test-results.json
  docs/phase1a9/evidence/phase1a9-simulations.json
  docs/phase1a9/evidence/phase1a9-failure-matrix.json
  docs/phase1a9/evidence/phase1a9-evidence-manifest.json
  docs/phase1a9/evidence/phase1a9-cost-budget.json
  docs/phase1a9/evidence/phase1a9-security-scan.txt
  docs/phase1a9/evidence/phase1a9-accessibility.md
  docs/phase1a9/evidence/phase1a9-known-issues.md
  docs/phase1a9/evidence/phase1a9-change-manifest.md
  docs/phase1a9/evidence/phase1a9-recovery-resume.txt
  docs/phase1a9/evidence/phase1a9-release-recommendation.md
)
for file in "${required[@]}"; do [[ -f "$file" ]] && pass "evidence: $file" || fail "missing evidence: $file"; done

if grep -RInE --include='*.ts' --include='*.tsx' --exclude='*.test.ts' --exclude='*.test.tsx' 'promotionExecutable[[:space:]]*[:=][[:space:]]*true|schedulerEnabled[[:space:]]*[:=][[:space:]]*true' packages/phase1a9-governed-scheduler/src apps/command-center/src >/dev/null; then
  fail "unsafe executable state detected"
else
  pass "scheduler and promotion remain disabled"
fi

if (( failures > 0 )); then
  printf 'SUMMARY: FAIL (%d failures)\n' "$failures" >&2
  exit 1
fi
printf 'SUMMARY: PASS; acceptance remains pending where gates are incomplete; no Git closure performed\n'