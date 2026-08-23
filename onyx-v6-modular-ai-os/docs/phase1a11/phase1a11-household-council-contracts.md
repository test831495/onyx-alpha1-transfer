# Household Council Contracts

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: architects, council reviewers, policy stakeholders

## Purpose

This document describes the Wave A contract for Household Council coordination. It defines the advisory-only boundary and the rules that prevent Council input from turning into authorization.

## What this means for the user

The user sees a coordination mechanism that can surface advice, disagreement, and evidence without creating hidden privilege changes. Council mode exists to improve decisions, not to overwrite primary ownership or bypass policy.

## Current state

The current state is contract-defined and documented, not a live Council runtime. The contract enforces advisory-only behavior and a non-authoritative recommendation flow.

## Wave A contract state

The contract requires:

- distinct participant identity
- attributable contributions
- purpose-bound, expiring envelopes
- disagreement preservation
- no raw memory transfer
- no credential transfer
- no unauthorized connector access
- owner approval remains required

## Key decisions

- Council coordination does not grant authorization.
- ONYX and NOVA remain distinct.
- Council contributions are purpose-bound and attributable.
- Sensitive details remain protected from Council default flow.
- Rahul remains the final authority for owner-sensitive decisions.

## Normal user experience

Users see clear, readable summaries rather than raw coordination details. A Council recommendation is presented as advisory, not as a direct permission grant or final approval.

## Technical Information behavior

Technical Information may show the rationale and provenance behind a Council recommendation when policy allows it, but it never exposes secrets or expands access. It remains presentation-only and account-aware.

## Privacy and security boundaries

Council contributions may contain approved, non-sensitive context only. They cannot transfer private memory, raw conversations, credentials, or owner-only Project Journey detail.

## Validation approach

Validation is by contract definition and transfer-boundary intent. The repository evidence confirms the Council advisory boundary remains a governance rule and not a runtime implementation.

## Failure behavior

If a Council contribution lacks attribution, purpose, expiry, or safe scope, it is blocked or treated as advisory-only without effect. The user impact is safe refusal and preserved decision ownership.

## Recovery and rollback

Recovery remains anchored in explicit owner review and evidence capture. Council disagreements are not silently discarded. Rollback policy must preserve the decision record and avoid reintroducing protected data.

## Known limitations

- no runtime Council orchestration exists
- no live gateway exists
- no live recommendation engine exists
- no real contribution persistence exists

## Acceptance references

This document maps to the Council acceptance identities and the governance boundary requirements in the acceptance registry.

## Next safe step

Future implementation should treat Council as a decision-support layer that never bypasses Rahul authority or overrides policy.
