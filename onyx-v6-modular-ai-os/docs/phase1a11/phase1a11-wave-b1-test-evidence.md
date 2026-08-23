# Phase 1A.11 Wave B1 Test Evidence

**Version:** 0.2.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Review remediation completed; focused and workspace validation recorded
**Intended audience:** Rahul and reviewers

## Purpose

Record reproducible evidence for the identity and authorization foundation.

## What This Means for the User

The local checks demonstrate one canonical owner, deny-by-default behavior, isolated account access, separate project information levels, character neutrality, Technical Information protection, and friendly decisions.

## Current Implementation

The test file `packages/phase1a11-household-identity-runtime/tests/identity-runtime.test.ts` contains 14 deterministic tests: 9 original tests plus 5 new timestamp-validation tests. Fixtures contain no credentials, production identifiers, secrets, tokens, or session secrets.

## Friendly Default Experience

The tests verify a readable denial title, explanation, and safe next action. Technical reason identifiers are tested separately from user-facing text.

## Technical Information Behavior

Tests verify denial without explicit permission and that Technical Information eligibility does not alter other authorization decisions.

## Privacy and Security Boundaries

Tests cover owner uniqueness, invalid account and membership states, stale versions, invalid session facts, project boundaries, private resources, device role restrictions, character switching, and audit unavailability.

## Validation Commands and Actual Results

Verified:

- Wave A typecheck: PASS
- Wave A tests: PASS, 1 test file and 10 tests
- Wave B1 typecheck: PASS
- Wave B1 tests: PASS, 1 test file and 14 tests
- Wave A registry count: PASS, 78 unique IDs

Additional verified results:

- Workspace-filtered Wave B1 typecheck and tests: PASS; Wave A 10 tests and Wave B1 14 tests
- Acceptance mapping: PASS; 78 unique predecessor IDs, no new ID
- Export surface: PASS; model, catalog, authorization, labels, and fixtures exported
- Secret-display scan: PASS; no secret patterns in Wave B1 source or tests
- Prohibited-runtime scan: PASS; no prohibited runtime surface in Wave B1 source or tests
- `git diff --check`: PASS
- Workspace-wide `pnpm -r typecheck`: PASS; 35 of 36 workspace projects typechecked

The separate non-failing bundle-size warning remains a known baseline limitation.

## Review Remediation (Commit 5c102e2)

GitHub Copilot review feedback on PR #12 identified seven findings. All were corrected and PR review conversations were resolved:

**Timestamp Validation Hardening:**
- Malformed current time in expiration validation now fails closed with `INVALID_VALIDATION_TIME`
- Malformed membership expiration dates now fail closed with `INVALID_MEMBERSHIP_EXPIRATION`
- Valid past expiration continues to deny access
- Valid future expiration remains eligible for continued evaluation
- Omitted membership expiration remains supported
- Three new tests verify malformed dates deny; two new tests verify valid expiration dates behave correctly

**Constant Reuse and Type Safety:**
- Shared `RAHUL_CANONICAL_ACCOUNT` constant is now used in authorization evaluation
- Target account and household identifiers use `AccountId` and `HouseholdId` types
- Unknown `requestedPermission` remains accepted at the untrusted input boundary and denied unless catalog-validated

**Compile-Time Checked Catalogs:**
- Permission catalog literals are now compile-time checked using `as const` + `satisfies`
- Invalid permission IDs fail TypeScript compilation; runtime unknown permissions are still denied

**Maintainability Improvements:**
- Fixture account-prefix handling no longer relies on `slice(8)`; uses named `ACCOUNT_ID_PREFIX` constant
- Unused `householdId` import removed from test file
- Presentation-label registry formatted with one key-value pair per line

## Baseline and Change Record

- Repository: `test831495/onyx-alpha1-transfer`
- Branch: `feature/phase1a11-waveb-identity-session-isolation`
- Baseline tag: `phase1a11-wave-a-contract-freeze-validated`
- Baseline commit: `3e130ceea6cf61659bda99616b5dfb7f86d04107`
- Package: `@onyx/phase1a11-household-identity-runtime`
- Dependency: `@onyx/phase1a11-household-foundation-contracts`
- Lockfile change: one new workspace importer only
- Created files: `.github/copilot-instructions.md`; the Wave B1 package metadata, source, and test files; and the four Wave B1 documents
- No existing Wave A file, application, service, plugin, configuration, secret, permission, or production file was modified.

The validation confirms exactly one canonical Primary Owner, non-owner detailed-history denial, basic and detailed project separation, character-neutral authorization, Technical Information gating, friendly decisions, and no secret display.

No Git write, deployment, database, authentication provider, connector, scheduler, promotion, permission, secret, repository-rule, or branch-protection action occurred.

## Failure Behavior

A failed or unavailable required fact produces denial. No test creates or persists a session.

## Recovery and Rollback

Re-run the focused commands after correcting only Wave B1 inputs. Roll back by removing the Wave B1 package and four documents and restoring only its lockfile importer. Do not roll back Wave A.

## Known Limitations

The suite is local and deterministic. It does not prove authentication-provider behavior, persistence, network behavior, connector behavior, UI behavior, Council runtime behavior, or deployment behavior.

## Acceptance References

Tests exercise predecessor contract themes under `GOV-001` through `GOV-004`, `SESSION-001` through `SESSION-006`, `PRIV-001` through `PRIV-005`, `CHAR-001` through `CHAR-004`, `HIST-001`, `HIST-002`, `HIST-016`, and `TECH-001` through `TECH-003`. No new acceptance ID was created.

## Next Safe Step

Complete the ordered final scans and workspace typecheck, then provide the evidence to Rahul for review.
