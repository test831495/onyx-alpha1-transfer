# Household Identity Model

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: household owners, product stakeholders, designers, architects

## Purpose

This document defines the household identity model as a contract-only architecture. It explains how the household is represented in the current Wave A freeze and the limits of future implementation.

## What this means for the user

The user sees a simple and secure identity model: one accountable owner, clear household roles, and no hidden privilege escalation. The experience is friendly and non-technical by default, while technical identifiers remain available only through controlled Technical Information.

## Current state

The current Wave A state is a validated contract model, not a running household system. The model guarantees one canonical Primary Owner and deny-by-default access.

## Wave A contract state

The household identity contract states:

- exactly one Primary Owner exists
- all administrative authority is vested in Rahul Kumar
- other membership types are subordinate, not equal owners
- account separation is required
- membership alone does not create access
- account switching clears private context and caches

## Key decisions

- The Primary Owner is singular and not reassignable in this wave.
- A second Primary Owner is prohibited.
- Household members do not receive owner-level authority.
- Character identity does not affect primary-owner truth.

## Normal user experience

A normal user sees plain-language household status, role labels, and safe presentation. Technical details remain hidden unless a specific policy allows them to be shown.

## Technical Information behavior

The Technical Information surface can expose internal detail only under explicit policy. It never reveals secrets, credentials, or another account's private information. It can explain status, but it cannot grant authority.

## Privacy and security boundaries

The model enforces strict boundaries:

- accounts are isolated
- memory is isolated
- Project Journey is owner-only
- connector metadata remains filtered
- generated artifacts are account-bound
- role elevation is not self-serve

## Validation approach

Validation is done through contract fixtures and focused tests. It verifies the canonical owner model and the deny-by-default pattern without implementing runtime persistence.

## Failure behavior

If identity state is missing, contradictory, or stale, the system denies access. The user impact is safe refusal, preserving the current state and avoiding privilege escalation.

## Recovery and rollback

Recovery remains evidence-first and policy-only. There is no live household reconfiguration in Wave A. Rollback is limited to restoring contract definitions or previous valid policy state while retaining audit evidence.

## Known limitations

- households are not implemented in a live runtime
- authentication is not live
- persistent accounts do not exist
- account reassignments are future work
- no UI account management exists

## Acceptance references

This model maps to the identity and household acceptance IDs in the registry, including the owner-only, role, and privacy requirements.

## Next safe step

The next safe step is to preserve the validated owner model in implementation planning and only allow future account creation or reconfiguration under the same deny-by-default and audit rules.
