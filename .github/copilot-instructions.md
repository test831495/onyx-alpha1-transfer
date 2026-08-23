# Phase 1A.11 Repository Instructions

**Status:** Promoted repository guidance
**Date:** 2026-08-23
**Purpose:** Preserve the Phase 1A.11 contract freeze and prevent policy drift.

## Primary Owner

- Rahul's canonical ONYX/NOVA account is the only Primary Owner.
- Rahul holds every administrative role and superior household-wide authority.
- A second Primary Owner is prohibited.
- No account, character, device, service, connector, or agent may self-elevate.
- The canonical owner security reference is stable and must not be derived from a display name.

## Authorization

- Authorization is deny-by-default and server-authoritative.
- Client presentation state, memory, character identity, and Council agreement are never authorization.
- Missing, stale, expired, invalid, unsupported, or unknown authorization information produces denial.

## Isolation

- Accounts, sessions, memory, conversations, connectors, credentials, files, caches, approvals, AI context, voice sessions, character preferences, generated documents, evidence, and Project Journey history remain isolated.
- Cross-account access requires an explicit, purpose-bound, policy-authorized grant.

## Characters

- ONYX, NOVA, and aliases are presentation identities.
- Character switching never changes authorization.
- Account switching clears the previous account's private projected context.
- Character preferences cannot overwrite canonical safety, authority, or persona boundaries.

## Household Council

- Council is coordination-only and uses account-bound Character Agent Gateways.
- Contributions are bounded, purpose-bound, attributable, and expiring.
- Raw memory, private conversation, credentials, unrestricted connector results, and detailed owner-only Project Journey disclosure never transfer through Council.
- Council recommendations are advisory and never constitute approval.

## Project Journey

- Detailed technical, architectural, coding, design, validation, recovery, decision, evidence, phase, and milestone history is Rahul-only.
- Other profiles receive only separately curated basic information.
- Authorization filtering occurs before retrieval, and explicit historical intent is required.
- Missing history is marked Not recorded or Not verified; historical facts are never invented.
- HIST-016 preserves Who, What, When, Why, Result, and Evidence.
- Secrets, credentials, keys, tokens, and session secrets are never stored.

## User Experience

- Default screens use clear, friendly, user-readable language.
- Raw engineering identifiers remain hidden by default.
- Every status explains what happened, what it means, and what happens next.
- Every error explains impact, work preservation, safe recovery, and access to permitted details.
- Internal technical names remain authoritative in code, contracts, tests, evidence, and audit, but are not normal presentation labels.

## Technical Information

- Technical Information is off by default and requires explicit user action.
- Access is account-aware, role-aware, resource-aware, classification-aware, session-aware, and policy-controlled.
- Technical Information changes presentation only and never changes authorization.
- Secrets and unauthorized data are never displayed.

## Documentation

- Documents use plain language and consistent structure.
- Verified, proposed, deferred, blocked, and not-verified content remain distinguishable.
- Technical details appear in dedicated technical sections.
- Documents include evidence, rollback, recovery, known limitations, and next steps where applicable.
- Documents must not contain joined words, malformed headings, unreadable tables, clipped content, or overlapping content.

## Development Governance

- Preserve predecessor contracts and run focused validation before workspace validation.
- Never report an unexecuted check as passed or silently repair unrelated defects.
- Keep scheduler disabled, promotion disabled, and runtime lane limit at 1.
- Do not stage, commit, push, merge, tag, deploy, modify secrets, permissions, repository protections, or branch protections unless a task explicitly authorizes the exact action.
- Avoid destructive Git operations and wildcard staging commands.

## Phase 1A.11 Operating Rules

- Treat Rahul Kumar as the single canonical Primary Owner.
- Preserve deny-by-default authorization behavior.
- Do not expand Council decisions into real authorization or approvals.
- Never expose secrets, tokens, session data, or credential material in UI or docs.
- Keep technical information behind explicit policy-gated disclosure.
- Preserve typed-missing and provenance semantics for historical records.
- Keep all memory tiers isolated and explicitly governed.
- Preserve the single-primary-owner invariant, advisory-only Council boundary, character switching without authorization changes, P0 immutability, memory tier constraints, redaction, access filtering, audit evidence, tombstones, and supersession semantics.
- Prefer focused validation of contract invariants. A task is complete only when relevant invariants remain true and approval evidence remains intact.
