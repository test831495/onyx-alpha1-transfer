# Phase 1A.11 Wave B1 Known Limitations

**Version:** 0.2.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Review remediation completed; superseded by merged PR #12. Runtime capabilities remain deferred.
**Intended audience:** Rahul, security reviewers, and future Wave B maintainers

## Purpose

State exactly what Wave B1 does and does not deliver.

## What This Means for the User

This foundation can evaluate local authorization facts. It cannot sign a user in, remember a session, retrieve history, run a connector, or display a product screen.

## Current Implementation

Implemented: accounts, memberships, canonical sole-owner binding, frozen roles, versioned permissions, validation, deterministic evaluation, project-information boundaries, friendly labels, fixtures, tests, evidence, and rollback guidance.

## Friendly Default Experience

Denied access is explained in clear language with a safe next action. Internal identifiers remain available only in technical fields.

## Technical Information Behavior

Technical Information remains explicitly gated and never changes authority. No secret or protected value is rendered or stored.

## Privacy and Security Boundaries

The package has no database, session store, authentication provider, connector, Council runtime, break-glass runtime, voice narration, React component, HTTP middleware, browser storage, credential handling, or network call.

## Validation Commands and Actual Results

Verified: Wave A typecheck PASS; Wave A tests PASS with 10 tests; Wave B1 typecheck PASS; Wave B1 tests PASS with 14 tests; filtered checks, scans, diff check, and workspace-wide typecheck PASS. No unsupported runtime claim is marked PASS.

## Failure Behavior

Unknown or incomplete facts deny access. There is no silent repair or permissive fallback.

## Recovery and Rollback

Refresh local facts or ask Rahul. Rollback removes the Wave B1 package, four Wave B1 documents, and only the Wave B1 lockfile importer. Retain Wave A, its documents, and its validated checkpoint. No database rollback or session revocation is applicable.

## Known Limitations

`COMMAND-CENTER-REGRESSION-01` and the separate non-failing bundle-size warning remain outside this task and are not repaired.

No production-readiness, authentication-provider, database, connector, Council-runtime, Project Journey retrieval, or persistent-session claim is made.

Timestamp validation is deterministic and local. All malformed dates now fail closed as of commit 5c102e2:

- Malformed validation time is rejected with technical reason `INVALID_VALIDATION_TIME`
- Malformed membership expiration is rejected with technical reason `INVALID_MEMBERSHIP_EXPIRATION`
- This hardening applies only to local deterministic checks; no external validation provider exists

## Acceptance References

This document references existing Wave A IDs only: `GOV-001`, `SESSION-001`, `PRIV-001`, `CHAR-001`, `HIST-001`, `TECH-001`, and `DOC-001`. No acceptance ID was added or redefined.

## Next Safe Step

Rahul reviews this limitation boundary before authorizing a separate Wave B2 session scope.
