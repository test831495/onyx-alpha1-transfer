#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src="packages/phase1a4d-draft-pr-bridge/src/index.ts"
tests="packages/phase1a4d-draft-pr-bridge/tests/draft-pr-bridge.test.ts"

for file in packages/phase1a4d-draft-pr-bridge/package.json packages/phase1a4d-draft-pr-bridge/tsconfig.json "$src" "$tests" docs/phase1a4/phase1a4d-draft-pr-bridge.md; do test -f "$file"; done

for value in AWAITING_DRAFT_PR_APPROVAL APPROVED_FOR_DRAFT_PR_CREATION DRAFT_PR_CREATION_IN_PROGRESS DRAFT_PR_CREATED DRAFT_PR_CREATION_FAILED_SAFE DRAFT_PR_RECONCILIATION_REQUIRED CREATE_DRAFT_PR coolscorpiorahul test831495/onyx-alpha1-transfer 'Issue 7' 'Phase 1A.4A Live Smoke Test' feature/phase1a4a-github-issue-bridge automation/issue-7-phase1a4b-isolated-branch-smoke 712f3546529f6eff8c37f480c0db61cad56f1b6c; do grep -Fq "$value" "$src"; done

for value in "missing approval" "wrong actor" "wrong repository" "wrong issue" "closed issue" "wrong issue title" "wrong capability" "expired approval" "scope-hash mismatch" "idempotency mismatch" "evidence-digest mismatch" "wrong base branch" "wrong head branch" "wrong head commit" "missing remote head" "incompatible remote head" "non-Draft request" "identical base and head" "dirty worktree" "detached HEAD" "compatibly reuses an existing Draft PR" "rejects incompatible or non-Draft existing PRs" "rejects incompatible or non-Draft existing PRs" "adapter failure" "uncertain result" "compatibly reuses an existing Draft PR" "does not call create twice" "preserves safety flags" "preserves safety flags" "preserves safety flags" "preserves safety flags" "preserves safety flags" "rejects earlier approvals lacking the Draft PR capability" "redacts evidence and preserves safety settings"; do grep -Fq "$value" "$tests"; done

pnpm --filter @onyx/phase1a4d-draft-pr-bridge typecheck
pnpm --filter @onyx/phase1a4d-draft-pr-bridge test
pnpm --filter @onyx/github-automation typecheck
pnpm --filter @onyx/github-automation test
pnpm --filter @onyx/phase1a4c-push-bridge typecheck
pnpm --filter @onyx/phase1a4c-push-bridge test
pnpm --filter @onyx/phase1a4b-branch-bridge typecheck
pnpm --filter @onyx/phase1a4b-branch-bridge test
bash scripts/validate-phase1a4a.sh
bash scripts/validate-phase1a3e10.sh

bash -n scripts/validate-phase1a4d.sh
if grep -REn 'git push|force push|branch deletion|gh pr create|gh pr merge|netlify deploy|git add|git commit|git tag|gh issue create' packages/phase1a4d-draft-pr-bridge/src; then exit 1; fi

git diff --check

! grep -REn 'git push|force push|git add|git commit|git tag|gh pr create|gh pr merge|gh issue create|netlify deploy' packages/phase1a4d-draft-pr-bridge/src packages/phase1a4d-draft-pr-bridge/tests

echo "Phase 1A.4D validation passed"
