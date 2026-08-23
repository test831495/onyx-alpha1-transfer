# Phase 1A.11 Copilot Instructions Draft

**Status:** Draft guidance only; not a repository automation file
**Date:** 2026-08-23
**Purpose:** Preserve the Phase 1A.11 contract freeze while preventing policy drift in future work.

## 1. Core Operating Rules

- Treat Rahul Kumar as the single canonical Primary Owner.
- Preserve deny-by-default authorization behavior.
- Do not expand Council decisions into real authorization or approvals.
- Never expose secrets, tokens, session data, or credential material in UI or docs.
- Keep technical information behind explicit policy-gated disclosure.
- Preserve typed-missing and provenance semantics for historical records.
- Keep all memory tiers isolated and explicitly governed.

## 2. What Must Not Change

- The single-primary-owner invariant
- The advisory-only Council boundary
- Character switching without authorization changes
- P0 immutability and memory tier constraints
- Redaction and access filtering for owner-only data
- Audit evidence, tombstones, and supersession semantics

## 3. Validation Expectations

When working in this scope, prefer focused validation that checks contract invariants rather than broad runtime changes. Keep changes in the contract layer only unless the task explicitly calls for implementation work.

## 4. When a Change Is Unsafe

A change is unsafe if it:

- broadens access by implication or fallback logic
- treats advisory Council output as authoritative action
- exposes private historical detail to a non-owner account
- weakens session assurance or authorization filtering
- removes or mutates audit evidence for a prior decision

## 5. Completion Standard

A task is considered complete only when the relevant contract invariants remain true and the approval evidence remains intact.

This draft is intentionally documentation-only and is not inserted into repository automation files.
