#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

# Requirement 1: Require exact environment variable and value
if [[ "${PHASE1A4B_LOCAL_CONFIRMATION:-}" != "APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE" ]]; then
  echo "ERROR: Set PHASE1A4B_LOCAL_CONFIRMATION=APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE to authorize the local branch smoke test."
  exit 1
fi

# Requirement 3: Verify current branch is exactly feature/phase1a4b-isolated-branch-bridge
current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "feature/phase1a4b-isolated-branch-bridge" ]]; then
  echo "ERROR: Current branch must be feature/phase1a4b-isolated-branch-bridge, not $current_branch"
  exit 1
fi

# Requirement 4: Verify working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean."
  exit 1
fi

# Requirement 5: Verify HEAD is not detached
if ! git symbolic-ref -q HEAD >/dev/null 2>&1; then
  echo "ERROR: HEAD is detached."
  exit 1
fi

# Requirement 6 & 7: Verify GitHub CLI authentication
gh_auth_output="$(gh auth status --hostname github.com 2>&1 || true)"
if ! echo "$gh_auth_output" | grep -q "Logged in to github.com"; then
  echo "ERROR: GitHub CLI is not authenticated."
  exit 1
fi

authenticated_user="$(echo "$gh_auth_output" | grep -oP 'Logged in to github\.com account \K[A-Za-z0-9-]+' || true)"
if [[ "$authenticated_user" != "coolscorpiorahul" ]]; then
  echo "ERROR: Authenticated GitHub user must be coolscorpiorahul, not $authenticated_user"
  exit 1
fi

# Requirement 8: Verify the repository
repo_output="$(gh repo view test831495/onyx-alpha1-transfer --json nameWithOwner --jq .nameWithOwner 2>&1 || true)"
if [[ "$repo_output" != "test831495/onyx-alpha1-transfer" ]]; then
  echo "ERROR: Repository must be test831495/onyx-alpha1-transfer"
  exit 1
fi

# Requirement 9: Read Issue 7 and verify
issue_output="$(gh issue view 7 --json number,state,title --jq '.' 2>&1 || true)"
issue_number="$(echo "$issue_output" | jq -r '.number // empty' 2>/dev/null || true)"
issue_state="$(echo "$issue_output" | jq -r '.state // empty' 2>/dev/null || true)"
issue_title="$(echo "$issue_output" | jq -r '.title // empty' 2>/dev/null || true)"

if [[ "$issue_number" != "7" ]]; then
  echo "ERROR: Issue number must be 7, got $issue_number"
  exit 1
fi

if [[ "$issue_state" != "OPEN" ]]; then
  echo "ERROR: Issue 7 must be OPEN, got $issue_state"
  exit 1
fi

if [[ "$issue_title" != "Phase 1A.4A Live Smoke Test" ]]; then
  echo "ERROR: Issue title must be 'Phase 1A.4A Live Smoke Test', got '$issue_title'"
  exit 1
fi

# Requirement 10: Verify validated predecessor commit and remote base commit
predecessor_commit="712f3546529f6eff8c37f480c0db61cad56f1b6c"
current_commit="$(git rev-parse HEAD)"
if [[ "$current_commit" != "$predecessor_commit" ]]; then
  echo "ERROR: Current HEAD must be at $predecessor_commit, got $current_commit"
  exit 1
fi

remote_base_commit="$(git rev-parse origin/feature/phase1a4a-github-issue-bridge 2>/dev/null || echo '')"
if [[ "$remote_base_commit" != "$predecessor_commit" ]]; then
  echo "ERROR: Remote base commit must be $predecessor_commit, got $remote_base_commit"
  exit 1
fi

# Requirement 11: Verify target local branch is exactly automation/issue-7-phase1a4b-isolated-branch-smoke
target_branch="automation/issue-7-phase1a4b-isolated-branch-smoke"

# Requirement 12: Verify target branch does not exist remotely
if git rev-parse --verify "origin/$target_branch" >/dev/null 2>&1; then
  echo "ERROR: Target branch must not exist remotely: origin/$target_branch"
  exit 1
fi

# Invoke the local smoke runner
echo "[1/2] Running Phase 1A.4B local branch smoke test..."
pnpm --filter @onyx/phase1a4b-branch-bridge local-smoke

echo "[2/2] Verifying evidence file..."
if [[ ! -f ".phase1a4b-local-smoke-evidence.json" ]]; then
  echo "ERROR: Evidence file .phase1a4b-local-smoke-evidence.json not created."
  exit 1
fi

# Verify evidence file contains required fields
evidence_json="$(cat .phase1a4b-local-smoke-evidence.json)"
if ! echo "$evidence_json" | jq -e '.repository and .issueNumber and .capability and .scopeHash and .idempotencyKey and .baseBranch and .baseCommit and .targetBranch and .firstResult and .replayResult and .newLocalBranchCount and .idempotentReplayStatus and .remoteBranchPushed == false and .draftPrCreated == false and .mergeAllowed == false and .productionDeployAllowed == false' >/dev/null 2>&1; then
  echo "ERROR: Evidence file is missing required fields."
  exit 1
fi

echo "SUCCESS: Phase 1A.4B local branch smoke test completed."
