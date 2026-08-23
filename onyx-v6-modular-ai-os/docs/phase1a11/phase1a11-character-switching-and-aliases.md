# Character Switching and Aliases

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: product designers, identity reviewers, architects

## Purpose

This document defines the contract for account-bound character switching and aliases in the household identity model. It explains the distinction between presentation and authority.

## What this means for the user

The user can switch between ONYX and NOVA presentation without changing authorization. The experience remains consistent, safe, and respectful of ownership boundaries.

## Current state

The current state is validated in the contract package: character switching is allowed as a presentation change only. It is not a runtime UI implementation.

## Wave A contract state

The contract establishes:

- ONYX and NOVA are canonical identities
- character switching changes presentation style only
- authorization remains unchanged
- history access remains unchanged
- connector access remains unchanged
- approval authority remains unchanged
- account switching clears prior private context

## Key decisions

- Character identity is not authorization.
- Council mode remains advisory only.
- A character alias cannot widen access or change ownership.
- Account-bound character preferences are distinct from account authorization.

## Normal user experience

The user might choose a different presentation, but they do not gain access to another account's data or broader permissions. Friendly labels remain in place, and stored technical identifiers stay hidden from default view.

## Technical Information behavior

Technical Information may expose presentation metadata, but it must not expose secrets or grant any new authority. If a future UI offers a technical indicator for a character mode, it must remain descriptive and policy-controlled.

## Privacy and security boundaries

Character separation prevents authorization drift. A user cannot alter the authority chain by switching between ONYX and NOVA. Account boundaries remain strict and enforceable.

## Validation approach

The contract package includes focused tests for non-authorization character switching. This is direct evidence for the contract semantics but not runtime implementation proof.

## Failure behavior

If the character state is inconsistent or ambiguous, the system denies the operation or maintains existing authority. The user impact is safe continuity without escalation.

## Recovery and rollback

Recovery is based on preserving the current account and role state and revalidating the presentation context. No runtime character state is assumed in this wave.

## Known limitations

- character presentation UI does not exist
- no runtime alias engine exists
- no live Character Studio boundary exists
- no persistent preferences store exists

## Acceptance references

This document aligns with the Character and household-identity acceptance entries, including character-switch safety and authorization separation.

## Next safe step

The next safe step is to maintain the separation between presentation choice and authorization during any future implementation.
