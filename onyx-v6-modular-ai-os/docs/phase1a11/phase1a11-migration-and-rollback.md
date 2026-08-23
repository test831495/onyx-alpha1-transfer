# Phase 1A.11 Migration and Rollback Freeze

**Status:** Read-only contract guidance for a future implementation
**Date:** 2026-08-23
**Scope:** Migration, safety, and rollback planning only; no live system change or remote mutation.

## 1. Migration Intent

Phase 1A.11 introduces a governance-first household identity and privacy contract layer. It is intentionally additive and contract-only. Migration should be performed as a controlled onboarding step that preserves existing households, owner identity, and session trust boundaries.

The migration must not:

- create or mutate production permissions without a recorded approval path
- broaden auth scope beyond the approved household account model
- merge ONYX and NOVA authorization baselines
- resurrect deleted or superseded memory through summary or index paths
- expose owner-only journey data to non-owner profiles

## 2. Required Migration Preconditions

Before any implementation migration:

- the canonical primary owner identity is verified as Rahul Kumar
- role assignments are enumerated and permission-deny defaults are established
- memory tiers are mapped, including tombstone and supersession rules
- Council advisory-only constraints are retained in the migration schema
- technical disclosure rules are mapped to role-based policy boundaries
- audit and evidence retention metadata are initialized

## 3. Safe Move Strategy

1. Freeze the current contract baseline and acceptance registry.
2. Introduce the new identity and access contract layer in read-only or dry-run mode.
3. Validate role, session, and policy invariants with deterministic fixtures.
4. Verify no existing authorization logic is widened by the migration.
5. Record the migration decision and evidence in the audit trail.

## 4. Rollback Strategy

Rollback is a policy-only recovery path. It must never delete audit evidence, suppress tombstones, or rewrite owner history. Rollback actions may include:

- restoring the prior role-policy bundle
- reactivating the previous permission snapshot
- disabling the new disclosure path until review is complete
- reverting only the contract metadata associated with the failed migration segment

Rollback is valid only when:

- the migration introduced a policy contradiction or identity violation
- the invalid state is isolated and recoverable without broad data loss
- evidence and decision trail remain preserved for audit

## 5. Disallowed Rollback Behavior

The following are explicitly prohibited:

- deleting audit records to hide the failed migration
- reactivating deleted or superseded memory records without a new governed action
- transferring any owner-only detail to non-owner accounts
- bypassing fresh-authentication or session-assurance checks
- changing P0 baseline contracts or Council advisory-only semantics

## 6. Evidence and Recovery Expectations

Any migration or rollback decision must record:

- actor and reason
- affected account or household scope
- version of the contract bundle
- audit reference and evidence digest
- final disposition: accepted, blocked, reverted, or disputed

## 7. Freeze Statement

This migration and rollback package is a governance freeze for the Wave A contract scope. It is not an execution plan for production migration and does not claim any remote or system-side effects.
