# Phase 1A.11 Wave B3 Operational Cost Controller

**Status:** Validated local policy only
**Version:** wave-b3-1.1
**Date:** 2026-08-24
**Owner:** Rahul
**Package:** `@onyx/phase1a11-household-resource-isolation-runtime`

## Purpose

Wave B3 defines a provider-neutral operational cost controller that models four local policy profiles:

- ACTIVE
- LIGHT
- VACATION
- HIBERNATION

These are policy profiles only. They are not cloud commands, deployment actions, infrastructure mutations, scheduling actions, or live provider operations.

## Intended audience

Rahul and reviewers evaluating bounded local operating-mode contracts.

## What this means for the user

Modes reduce or suspend optional work while preserving protected recovery and audit capabilities. Mode selection never creates authority.

## Friendly presentation and Technical Information

The package exposes friendly transition results and keeps technical reasons separate. Technical Information does not bypass resource, membership, or mode policy.

## Verified mode behavior

The implementation verifies:

- exactly four canonical modes exist
- unsupported modes are rejected
- capability matrices are deterministic
- budget envelopes remain valid only when bounded and policy-versioned
- transitions are reversible and fail closed without audit availability
- VACATION preserves critical owner access, emergency approvals, audit, purse-critical alerts, backup verification, and minimal critical recovery paths while reducing optional work
- HIBERNATION preserves canonical identity, policy, ownership records, backups, and recovery references while suspending optional work
- restoration and rollback preserve canonical state and revalidate authority before resuming authorized work
- mode selection never creates ownership, account authority, or session authority

## VACATION requirements

VACATION retains the required critical capabilities while reducing optional background activity. It preserves:

- owner login capability
- recovery and emergency access for critical cases
- critical audit availability
- critical door and camera alerts
- backup integrity checks
- concise home or office summaries
- temporary controlled return to ACTIVE when policy and authority are revalidated

VACATION does not create authority, deployment, or provider-specific runtime behavior.

## HIBERNATION requirements

HIBERNATION preserves canonical identity, ownership, policies, evidence, backup metadata, and recovery viability. It suspends optional work and never deletes policies, evidence, backups, credentials, or recovery metadata.

## Validation evidence

The current local package checks verify the exact four modes and transition semantics in the operational-mode suite.

- Wave B3 operational-mode tests: PASS, 8 tests
- Mode acceptance and budget validation: PASS
- Transition validation: PASS
- Audit-required rejection: PASS

## Known limitations

This is a local policy model only. No provider-specific call, infrastructure mutation, scheduler activation, promotion, or live cloud operation is included.

## Failure behavior

Incomplete, stale, expired, unsupported, or unaudited transition requests deny. Unsupported budget units, periods, versions, negative values, and unlimited values deny.

## Recovery and rollback

Restore valid policy and audit evidence before retrying. Rollback is projection-only and preserves canonical state.

## Acceptance references

MODE-001 through MODE-016 and `tests/operational-modes.test.ts`.

## Next safe step

Review local mode evidence; defer provider integration and runtime activation.

## Implemented foundation

The package implements four bounded modes, strict budget catalogs, transition validation, restoration manifests, and policy-only stale-authority denial.

## Security and privacy

Modes preserve isolation and authority boundaries; Technical Information never overrides authorization.

## Actual validation results

The B3 operational-mode suite passes with 8 tests, within the 18-test B3 total.
