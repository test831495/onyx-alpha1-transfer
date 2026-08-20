#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

test -f packages/phase1a4a-issue-bridge/package.json
test -f packages/phase1a4a-issue-bridge/src/index.ts
test -f packages/phase1a4a-issue-bridge/src/live-smoke.ts
test -f packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts
test "$(git branch --show-current)" = "feature/phase1a4a-github-issue-bridge"
test -z "$(git status --porcelain)"
test "${PHASE1A4A_LIVE_CONFIRMATION:-}" = "APPROVE_PHASE1A4A_SINGLE_ISSUE_SMOKE"

pnpm --filter @onyx/phase1a4a-issue-bridge live-smoke
node -e 'const fs=require("node:fs"); const e=JSON.parse(fs.readFileSync(".phase1a4a-live-smoke-evidence.json","utf8")); console.log(JSON.stringify({repository:e.repository, issueNumber:e.issueNumber, issueUrl:e.issueUrl, newIssueCount:e.newIssueCount, idempotentReplayStatus:e.idempotentReplayStatus, completedAt:e.completedAt}, null, 2));'