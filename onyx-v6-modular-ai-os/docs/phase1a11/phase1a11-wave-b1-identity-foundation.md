# Phase 1A.11 Wave B1 Identity Foundation

**Version:** 0.1.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Focused-tested; superseded by merged PR #12. Runtime capabilities remain deferred.
**Intended audience:** Rahul and maintainers of the ONYX/NOVA monorepo

## Purpose

Wave B1 defines local household accounts, memberships, the sole owner binding, frozen roles, permissions, identity validation, and deterministic authorization. It does not issue or persist sessions.

## What This Means for the User

Access is checked from the account, household membership, role, permission, current policy facts, and verified session facts. Missing or outdated information results in a friendly denial and a safe recovery action.

## Current Implementation

Package: `@onyx/phase1a11-household-identity-runtime`. It contains typed identity records, the Rahul canonical owner invariant, six roles, a versioned permission catalog, pure authorization evaluation, fixtures, and focused tests. The Wave A contract package is consumed without modification.

## Friendly Default Experience

Allowed requests say `Access permitted`. Denied requests say `You do not have permission to view this information`, explain the impact in plain language, and suggest verification, refresh, or asking the Primary Owner.

## Technical Information Behavior

Technical Information is off by default. It requires explicit permission, an eligible role, current policy facts, sufficient assurance, and matching resource classification. Technical identifiers remain in separately classified decision fields.

## Privacy and Security Boundaries

Accounts and memberships are isolated. Private cross-account resources, detailed Project Journey history for non-owners, device human permissions, unknown permissions, stale versions, and unavailable audit records are denied. No credentials, secrets, tokens, cookies, database, connector, or authentication provider is used.

## Validation Commands and Actual Results

Verified:

- `pnpm --filter @onyx/phase1a11-household-foundation-contracts typecheck` PASS
- `pnpm --filter @onyx/phase1a11-household-foundation-contracts test` PASS: 1 file, 10 tests; registry is exactly 78 unique IDs
- `pnpm --filter @onyx/phase1a11-household-identity-runtime typecheck` PASS
- `pnpm --filter @onyx/phase1a11-household-identity-runtime test` PASS: 1 file, 9 tests

Workspace-filtered checks, acceptance mapping, export-surface validation, secret-display scan, prohibited-runtime scan, `git diff --check`, and workspace-wide typecheck also PASS. Workspace-wide typecheck covered 35 of 36 projects.

## Failure Behavior

Unknown, malformed, missing, stale, expired, mismatched, unsupported, or prohibited facts deny access. User-facing fields remain friendly; technical reason identifiers are separate.

## Recovery and Rollback

Refresh access facts, verify identity, restore required audit availability, or ask Rahul. Rollback removes the Wave B1 package and four Wave B1 documents and restores only the Wave B1 lockfile importer. Wave A remains intact. No database, credential, or session rollback is required.

## Known Limitations

This is a local authorization foundation. It has no session issuance or persistence, authentication provider, storage, retrieval, connector execution, Council runtime, break-glass runtime, UI, or production deployment.

## Acceptance References

Focused coverage maps to existing Wave A IDs: `GOV-001` through `GOV-004`, `SESSION-001` through `SESSION-006`, `PRIV-001` through `PRIV-005`, `CHAR-001` through `CHAR-004`, `HIST-001` through `HIST-016`, `TECH-001` through `TECH-008`, and `DOC-001` through `DOC-008`. Only directly exercised items are focused-tested; none are newly accepted here.

## Next Safe Step

Rahul reviews the evidence and approves a separately scoped Wave B2 session design. No session implementation is included here.
