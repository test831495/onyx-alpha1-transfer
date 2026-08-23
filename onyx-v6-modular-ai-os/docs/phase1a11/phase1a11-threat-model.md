# Phase 1A.11 Threat Model Freeze

**Status:** Contract-only freeze for household identity, privacy, Council, history, and UX boundaries
**Date:** 2026-08-23
**Scope:** Architecture and contract validation only. No runtime execution, no database or permission implementation.

## 1. Threat Model Objective

This freeze defines the minimum trust and adversarial assumptions for the Phase 1A.11 household foundation. Its goal is to prevent privilege escalation, unauthorized memory reads, cross-account leakage, hidden technical disclosure, and Council-based authorization drift.

The model remains intentionally conservative:

- Default deny for every role, permission, technical disclosure, and session state
- Owner-only access for detailed Project Journey and private ownership metadata
- Strict separation between presentation persona and authorization identity
- Evidence-backed auditability for sensitive decisions and break-glass access
- No transitive trust from advisory Council contributions to real permission grants

## 2. Threat Categories

### 2.1 Identity and Ownership Abuse

Threats:
- Non-owner account falsely presented as primary owner
- Duplicate primary-owner configuration or carryover identity overlap
- Household role assignment that grants hidden authorization

Controls:
- Exactly one canonical primary owner: Rahul
- Role and permission checks require explicit assignment and account binding
- Permission decisions deny by default unless the full authorization tuple is present

### 2.2 Session Hijack and Account Switching

Threats:
- Session token reuse after logout or account switch
- Cross-account memory contamination after role or account transitions
- Missing cleanup before returning to a previous account

Controls:
- Session assurance must be current and valid before sensitive access
- Account-switch transitions require private cleanup before re-entry
- Sensitive reads fail closed when assurance or freshness is absent

### 2.3 Memory and Context Leakage

Threats:
- Cross-account memory retrieval
- Prompt injection or imported content reinterpreted as executable instruction
- Merging protected history into non-owner conversations

Controls:
- Memory tiers remain isolated and non-overlapping
- Imported content is treated as untrusted data, not instruction
- Detailed owner memory can only be accessed under explicit owner-only filtering
- Summaries and indexes remain derived, never authoritative

### 2.4 Council and Persona Boundary Escape

Threats:
- Council agreement treated as actual authorization
- ONYX and NOVA identity merged into a single effective account
- Protected connector or memory scope widened through advisory coordination

Controls:
- Council contributions are advisory only
- Participants retain distinct identity and attribution
- Council decisions require explicit Rahul approval before any approval state is reached
- P0 baseline immutability is preserved and not mutable by coordination envelopes

### 2.5 Technical Information Disclosure

Threats:
- Secret leakage via “technical information” toggle
- Hidden identifiers surfaced into non-owner experience
- Authorization gain from reading technical metadata

Controls:
- Technical information access is explicit, policy-controlled, and role-aware
- Secret values, tokens, keys, and credentials never display in plain text
- Technical disclosure changes presentation only; it does not create privileges

### 2.6 Privacy and Audit Evasion

Threats:
- Audit log omission
- Sensitive history silently restored or resurrected after deletion or supersession
- Broken redaction or provenance chains

Controls:
- Audit events record actor, action, target, outcome, and evidence reference
- Tombstones and supersession markers remain explicit and non-erasable
- Redaction and provenance are required for owner-level detail access

## 3. Trust Boundaries

The contract freeze assumes these trust boundaries are enforced:

- Account boundary: isolated per account and household scope
- Session boundary: current, non-reused, and revocation-aware
- Memory boundary: tiered and recoverable only through governed access paths
- Council boundary: advisory and non-authoritative
- UX boundary: labels hide raw identifiers and sensitive detail by default
- Audit boundary: evidence and access decisions are recorded and reviewable

## 4. Security Requirements

1. Default deny for permissions, policy state, session assurance, and disclosure enablement.
2. Explicit positive evidence required for all sensitive operations and detail retrieval.
3. No secret values or credentials may appear in output, summary, or visible UI metadata.
4. Historical records must retain provenance, tombstone semantics, and supersession references.
5. Any break-glass or elevated access must be fresh, reasoned, and audit-traceable.

## 5. Failure Behavior

For any invalid or missing state, the contract must fail closed:

- Unknown account or role => deny
- Missing policy version or stale policy => deny
- Missing session assurance => deny
- Secret-like classification or evidence forgery => deny
- Unsupported or invalid typed-missing historical state => deny
- Council contribution without attribution or approval chain => deny or mark advisory-only and blocked

## 6. Freeze Statement

This threat model is considered frozen for the Wave A contract package. It defines the required security posture without introducing runtime behavior or deployment-side controls. Additional implementation work may proceed only after these constraints remain unchanged.
