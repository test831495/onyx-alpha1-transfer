# Phase 1A.11 Wave B3 Resource Isolation Foundation

**Status:** Validated local implementation; superseded by merged PR #14 and later Phase 1A.11 merges. Runtime activation remains deferred.
**Version:** wave-b3-1.1
**Date:** 2026-08-24
**Owner:** Rahul
**Package:** `@onyx/phase1a11-household-resource-isolation-runtime`

## Purpose

Wave B3 defines a local, deterministic resource-isolation policy that preserves deny-by-default ownership and household separation without creating runtime authority, connector activation, or infrastructure effects.

## Intended audience

Rahul, reviewers, and maintainers of the local policy package.

## What this means for the user

Only a validated, active household member and account-bound session can access a valid resource record. Technical Information changes presentation only and never grants access.

## Friendly presentation

Denials explain what was denied, preserve work, and identify the next safe action. Technical identifiers remain in technical evidence.

## Verified implementation scope

The package includes:

- resource ownership records and model validation
- visibility and policy enforcement
- account and household boundary checks
- exact sharing-grant validation and mismatch denials
- operating-mode policy validation
- reversible mode transitions without runtime activation
- friendly labels and fixtures for local deterministic testing
- public exports for the package surface

## Verified local behavior

The focused suite verifies:

- owner access is allowed under the same account and household
- cross-account private access is denied
- cross-household access is denied before visibility checks can grant access
- unknown owner and unknown resource states are denied
- conversations, caches, connectors, connector results, evidence, and Project Journey access remain account- and purpose-bound
- sharing grants reject expired, revoked, consumed, mismatched-purpose, mismatched-account, mismatched-household, and stale-policy cases
- detailed Project Journey remains Rahul-only and non-owner access is denied
- audit availability remains required when required by the resource or grant
- Technical Information eligibility cannot create authority or bypass isolation

## Validation evidence

The current local package checks are verified as follows:

- Wave B3 typecheck: PASS
- Wave B3 resource-isolation tests: PASS, 10 tests
- Wave B3 operational-mode tests: PASS, 8 tests
- Total Wave B3 test count: 18 tests, 2 files

This is a local deterministic policy package only. It does not issue sessions, activate modes, or mutate live infrastructure.

## Failure behavior

Malformed ownership, stale policy, expired references, invalid classifications, membership failures, unavailable audit, and invalid grants deny before authorization or disclosure.

## Recovery and rollback

Restore the authoritative record, membership, policy, or audit state and retry. Rollback removes the B3 package and importer while preserving the Wave B2 checkpoint.

## Acceptance references

MODE-001 through MODE-016; resource and operational test files in the package.

## Historical review gate

Historical status at the time of this record: Rahul review of the uncommitted local evidence was required before integration or runtime proposals. Superseded by merged PR #14 and later Phase 1A.11 closure evidence.

## Implemented foundation

Ownership validation, membership enforcement, policy expiry, provenance, disclosure, grant, audit, and account isolation are implemented locally.

## Security and privacy

Unknown or private values fail closed; no secrets, credentials, or unauthorized account data are disclosed.

## Actual validation results

Wave A, B1, B2, and B3 focused checks pass; B3 has 18 passing tests.

## Limitations

Provider execution, gateway runtime, and production sharing are not implemented or proven.

## Safety and rollback

The implementation keeps deny-by-default semantics, explicit grant matching, and no authority-transfer behavior. Rollback is limited to removing the Wave B3 package and associated B3 lockfile importer while preserving the previous validated Wave B2 checkpoint.
