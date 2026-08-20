# Phase 1A.4A GitHub Issue Creation Bridge

## Purpose

Phase 1A.4A connects the Phase 1A.3 E.10 `DRY_RUN_READY` state to one separately approved `CREATE_GITHUB_ISSUE` capability. The first pass is local and adapter-driven: tests use mock command runners and no real GitHub write is performed.

## Flow

1. An E.10 run must be `DRY_RUN_READY` and must identify `test831495/onyx-alpha1-transfer`.
2. `requestIssueApproval` creates a capability-specific approval bound to Rahul Kumar, the run ID, exact scope hash, meaningful reason, issued/expiry timestamps, and a deterministic idempotency key.
3. `createApprovedIssue` validates state, actor, repository, capability, scope hash, expiry, title, body, idempotency key, and approval status.
4. The bridge delegates the actual operation to the existing `GitHubApprovalGatedWriteAdapter` from `@onyx/github-automation`.
5. The existing writer owns provider invocation and idempotency storage. The bridge only maps the result into issue number, URL, creation/reuse flags, evidence, and final bridge state.

## States

- `AWAITING_ISSUE_APPROVAL`
- `APPROVED_FOR_ISSUE_CREATION`
- `ISSUE_CREATION_IN_PROGRESS`
- `ISSUE_CREATED`
- `ISSUE_CREATION_FAILED_SAFE`
- `ISSUE_RECONCILIATION_REQUIRED`

The exported state contract records the complete lifecycle. A provider failure is terminal and is not automatically retried. An uncertain provider response requires reconciliation before any further action.

## Approval and evidence

Approvals are single-capability records. They include `approver`, `capability`, `scopeHash`, `reason`, `approvedAt`, optional `expiresAt`, deterministic `idempotencyKey`, and `consumed`. Evidence is append-only at the bridge boundary and redacts secret-like terms. It records approval validation, creation, replay, safe failure, or reconciliation classification without storing credentials.

The writer's existing idempotency store prevents a duplicate issue on replay. Replaying the same approved request can return the prior issue URL without another provider call; a different title/body produces a different key and cannot reuse that result.

## Security boundary

The bridge does not expose branch creation, push, Draft PR creation, merge, deployment, secret, permission, branch-protection, force-push, or destructive Git operations. `MERGE_PULL_REQUEST`, `PRODUCTION_DEPLOYMENT`, `LIVE_NETLIFY_UPDATE`, `SECRET_CHANGE`, `PERMISSION_CHANGE`, `BRANCH_PROTECTION_CHANGE`, `FORCE_PUSH`, and `DESTRUCTIVE_GIT_OPERATION` remain unavailable.

## Validation boundary

`packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts` covers successful creation, missing and invalid approvals, content validation, idempotent replay, provider failure classification, reconciliation, no duplicate issue, and prohibited-operation invariants. `scripts/validate-phase1a4a.sh` is the repeatable local validation entry point.
