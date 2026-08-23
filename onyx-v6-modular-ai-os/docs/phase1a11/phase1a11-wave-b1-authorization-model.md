# Phase 1A.11 Wave B1 Authorization Model

**Version:** 0.1.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Focused-tested; awaiting Rahul review
**Intended audience:** Security reviewers and runtime maintainers

## Purpose

Describe the pure, deterministic authorization boundary for Wave B1.

## What This Means for the User

A request succeeds only when every required identity, membership, version, session, assurance, resource, purpose, permission, and audit condition is current and explicit.

## Current Implementation

`evaluateAuthorization` validates identity first, then permission and version facts, session validity, assurance, household and private-resource ownership, Project Journey classification, Technical Information eligibility, role allow and deny lists, assigned permissions, and audit availability. It returns an allow or deny decision without side effects.

## Friendly Default Experience

The default title is `You do not have permission to view this information`; the explanation and safe next action are plain language. Technical reason identifiers and version fields are separate from normal presentation.

## Technical Information Behavior

Technical Information needs `TECHNICAL_INFORMATION_ACCESS`, explicit request intent, an eligible Primary Owner role, current versions, valid session facts, and sufficient assurance. Presentation changes do not change the authorization result.

## Privacy and Security Boundaries

The canonical owner is the stable reference `rahul-canonical-owner-reference`, paired with `account_rahul_canonical`; display names are not used as security identifiers. Characters, aliases, devices, services, memory, Council, and client state cannot grant authority.

## Validation Commands and Actual Results

Verified: Wave A typecheck PASS; Wave A tests PASS with 10 tests; Wave B1 typecheck PASS; Wave B1 tests PASS with 9 tests; filtered checks PASS; acceptance registry uniqueness PASS at 78 IDs; export, secret, prohibited-runtime, diff, and workspace typecheck checks PASS.

## Failure Behavior

The evaluator denies missing, invalid, unknown, stale, expired, mismatched, unsupported, prohibited, or unaudited inputs. It never falls back to a permissive default.

## Recovery and Rollback

Refresh policy facts and identity state, verify assurance, or ask Rahul. Remove only the Wave B1 package, four Wave B1 documents, and its lockfile importer during rollback. Preserve Wave A and its checkpoint.

## Known Limitations

This model consumes session-validity and assurance facts but does not create sessions, cookies, tokens, credentials, grants, or authentication state. It does not store or retrieve data.

## Acceptance References

Existing IDs exercised by this model include `GOV-001`, `GOV-002`, `SESSION-001`, `SESSION-002`, `SESSION-003`, `SESSION-004`, `PRIV-001`, `PRIV-002`, `PRIV-003`, `CHAR-001`, `CHAR-002`, `HIST-001`, `HIST-002`, `HIST-016`, `TECH-001`, `TECH-002`, and `TECH-003`. These remain predecessor acceptance references, not new IDs.

## Next Safe Step

Review the model and evidence before any separately authorized session work.
