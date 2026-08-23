# Phase 1A.2 GitHub Automation Foundation

## Purpose

Build a supervised GitHub automation framework for ONYX.

## Core components

- Automation capability registry
- Automation state machine
- Approval engine
- Policy engine
- Audit event generator
- Dry-run execution support
- Future GitHub adapter
- Future Automation Dashboard

## Target workflow

1. Rahul approves the scope.
2. ONYX creates an implementation plan.
3. ONYX prepares a GitHub issue draft.
4. An isolated feature branch is created after approval.
5. Implementation runs within the approved scope.
6. Typecheck, tests, build, and security validation run.
7. Bounded failures are corrected and retested.
8. Evidence and rollback instructions are generated.
9. A Draft PR is prepared.
10. Rahul reviews the Draft PR.
11. No merge occurs without explicit approval.

## Phase 1A.2 Sprint 1

Sprint 1 implements local, deterministic automation governance only.

No live GitHub write is included in Sprint 1.

## Out of scope

- Pull request merge
- Direct push to main
- Direct push to integration/onyx-nova
- Production deployment
- Netlify production update
- Secret read or write
- Permission changes
- Branch deletion
- Release creation
