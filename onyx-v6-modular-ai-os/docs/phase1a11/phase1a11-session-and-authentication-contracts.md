# Session and Authentication Contracts

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: architects, reviewers, security stakeholders, future implementers

## Purpose

This document captures the contract requirements for server-managed sessions and authentication in Wave A. It defines the required state transitions and safety conditions without implementing them.

## What this means for the user

The user experience should be simple and secure. Sessions should be safe, revocable, and not stored in ordinary browser state. No user should see or manually manage secret session state.

## Current state

The current state is contract-defined and focused-tested for session assurance and account-switch cleanup. It is not implemented as a production session system.

## Wave A contract state

Wave A requires the following contract semantics:

- session creation is explicit
- rotation is supported by policy
- revocation is immediate when required
- inactivity and absolute expiry are defined
- account switching requires cleanup of private state
- step-up authentication is required for sensitive actions
- authentication assurance must be current

## Key decisions

- Session authority must be server-managed.
- Client-side storage is not authorization.
- Account switching clears prior private state before reuse.
- Stale or missing authorization fails closed.

## Normal user experience

The normal user sees a secure sign-in process, clear account boundary behavior, and safe handling when a session is invalid or stale. They should not be asked to manage raw session tokens.

## Technical Information behavior

Technical Information may explain session health when policy allows it, but it never exposes tokens, refresh secrets, or raw session state. It only explains a safe status like session validity or required reauthentication.

## Privacy and security boundaries

Authentication assurance and role policy are account-bound and time-limited. Any invalid session or stale context is denied. Cross-account reuse is blocked by design.

## Validation approach

Validation uses focused contracts and tests to confirm deny-by-default conditions, stale policy rejection, and session cleanup requirements. This is not runtime evidence of a live authentication service.

## Failure behavior

A stale or invalid session denies sensitive actions. The user impact is protected access refusal, preserved work, and a clear path to reauthentication. Recovery is performed through valid step-up or fresh authentication only.

## Recovery and rollback

Recovery depends on reauthentication and policy revalidation. Rollback is limited to preserving contract state and evidence. No live session data or persistent auth state can be assumed in Wave A.

## Known limitations

- no persistent session implementation exists
- no production authentication service exists
- no browser storage authority is allowed by contract
- no live device trust profile exists

## Acceptance references

This document aligns with the session and authentication acceptance definitions, including stale-policy denial, session assurance checks, and account-switch cleanup.

## Next safe step

The next safe step is to keep these contracts as server-side requirements for future implementation and avoid client-side authorization shortcuts.
