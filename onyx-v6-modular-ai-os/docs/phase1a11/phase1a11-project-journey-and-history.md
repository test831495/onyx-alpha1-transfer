# Project Journey and History

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: owners, reviewers, architects, privacy stakeholders

## Purpose

This document defines the contract for Project Journey and historical record handling. It preserves the owner-only rule for detailed history while keeping curated, lower-risk summaries available to other roles.

## What this means for the user

The user sees a clear boundary: rich history, technical reasons, validation details, and design context belong to Rahul and are restricted by default. Other profiles may receive curated, non-sensitive summaries only.

## Current state

This wave contains a validated contract for owner-only Project Journey access and HIST-016 typed missing semantics. No semantic retrieval, ingestion, or persistence exists.

## Wave A contract state

The contract requires:

- detailed history is Rahul-only
- curated basic history is available to others
- provenance is required
- corrections and supersessions are explicit
- tombstones prevent deleted records from reappearing
- typed missing states are required for unavailable facts
- retrieval requires explicit authorization, classification, and policy state

## Key decisions

- Authorization filtering occurs before search, retrieval, or evidence expansion.
- Missing information must not be invented.
- Original event time remains distinct from recording or summary time.
- Compressed summaries preserve authoritative evidence references.
- Council or presentation state does not override owner-only authority.

## Normal user experience

Ordinary users see a safe summary, not the full technical archive. Owner-level detail is intentionally hidden unless Rahul enters the appropriate policy-bound context.

## Technical Information behavior

Technical Information may enable richer explanations for authorized users only. It never expands access or reveals secrets or private details to other profiles.

## Privacy and security boundaries

Detailed historical data includes design decisions, technical context, validation evidence, and owner-sensitive records. These remain inaccessible to non-owner accounts and are not retrievable through unauthorized summary or index access.

## Validation approach

The contract package validates owner-only retrieval, HIST-016 missing-value handling, and secret-display rejection. This is contract evidence only, not runtime search or retrieval evidence.

## Failure behavior

An invalid or unauthorized attempt fails closed. No partial history is exposed, and missing facts must remain explicitly typed rather than guessed or fabricated.

## Recovery and rollback

Recovery must preserve the evidence trail and not silently rehydrate deleted or superseded records. Rollback can only restore policy state or governed metadata, not expose hidden information by default.

## Known limitations

- semantic retrieval is not implemented
- continuous ingestion is not implemented
- persistent Project Journey storage is not implemented
- search and indexing do not exist
- voice or narrative history delivery does not exist

## Acceptance references

This document corresponds to the Project Journey and HIST-016 acceptance requirements, including owner-only access, typed missing values, and evidence preservation.

## Next safe step

The next safe step is to build a future retrieval layer only after the contract freeze is preserved and authorization filtering remains stricter than any data access layer.
