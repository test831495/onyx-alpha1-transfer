# Phase 1A.11 Wave B2 Session Policy

**Version:** 0.1.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Local deterministic policy
**Audience:** Security reviewers and maintainers

## Policy

The fixture policy uses explicit inactivity, absolute, rotation, and elevated-assurance limits; allowed assurance levels; shared-device restrictions; an account or device-scoped concurrent-session limit; protected-operation assurance; audit requirement; and `policy-1`.

These values are deterministic fixture values, not universal production recommendations. Policy validation rejects malformed, negative, zero, inconsistent, stale, unknown, and unsupported values.

## Security boundary

Wave B2 focused tests: PASS, exactly 26 tests. Wave A regression: PASS, 10 tests. Wave B1 regression: PASS, 14 tests. Workspace-wide typecheck: PASS. This is local deterministic implementation only. Candidate account and household inputs receive explicit runtime validation, and malformed candidate scope fails closed. No production session registry or Character Agent Gateway runtime exists; gateway readiness remains prerequisite-only. Policy logic retains an explicit unknown-device deny and a single deterministic assurance-ranking rule with fail-closed rotation and chronology semantics.

Policy does not authenticate users, issue credentials, persist sessions, or expand authority. Unknown device classification, stale versions, unavailable required audit, malformed timestamps, and insufficient assurance fail closed.

## Exclusions and rollback

There is no production authentication, production session secret, cookie or bearer-token implementation, database or Redis, connector runtime, Project Journey retrieval, Council runtime, break-glass runtime, UI, or deployment. Rollback removes only B2 package/docs and its lockfile importer.
