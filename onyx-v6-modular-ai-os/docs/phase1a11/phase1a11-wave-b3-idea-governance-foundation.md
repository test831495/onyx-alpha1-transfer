# Phase 1A.11 Wave B3 Idea Governance Foundation

Version: wave-b3-1.2
Date: 2026-08-24
Owner: Rahul
Status: Local deterministic contracts and policy validation
Intended audience: Rahul and implementation reviewers

## Purpose

Define and validate account-bound Idea governance contracts for intake, lifecycle, assessment, authorization, preflight, readiness, deletion, audit, and acceptance mapping.

## What this means for the user

Idea governance remains safe-by-default, understandable in friendly language, and bounded by household/account isolation. Unknown context denies instead of guessing.

## Friendly presentation

Decisions return plain-language titles, explanations, and safe next actions. Denials state that work is preserved.

## Technical Information behavior

Technical Information is presentation-only and does not change authority. Authorization is evaluated separately and fail-closed.

## Implemented contracts

- account-bound Idea ownership and household isolation
- eight Idea dispositions
- twenty lifecycle states with deterministic transitions
- four freshness states and invalidation policies
- deterministic assessment, preflight, and readiness contracts
- advisory-only readiness contracts with explicit non-authorization scope
- deletion lifecycle and privacy-preserving tombstone controls
- audit metadata and protected-operation audit requirements
- deny-by-default Idea authorization evaluator
- deterministic acceptance registry validator for 65 approved IDs and supported statuses

## Security and privacy

- Rahul remains the sole canonical Primary Owner and final architecture decision-maker
- only Rahul may approve architecture-impacting Idea decisions
- cross-account private Idea access denies
- cross-household Idea access denies
- family, supervised, guest, service, device, character, and agent identities cannot approve architecture decisions
- assessment, disposition, preflight, readiness, and acceptance registry never grant execution authority
- no evaluator result authorizes Git, deployment, connectors, permissions, secrets, budgets, cloud actions, or external actions
- prompt-like content in Idea text cannot alter policy

## Account-bound ownership and lifecycle details

- Idea ownership is bound to account and household
- lifecycle transitions are explicit and deterministic
- versioning and material-change classification invalidate stale safety conclusions
- freshness state determines when reassessment/preflight is required
- deletion supports soft-delete, restore, and governed permanent deletion with tombstones
- detailed Idea history remains Rahul-only

## Operating modes

ACTIVE, LIGHT, VACATION, and HIBERNATION remain bounded policy context only. HIBERNATION preserves Ideas and denies active assessment/readiness creation.

## No runtime authority

This package does not implement execution authority. It does not activate connectors, cloud, deployment, or automation actions.

## Actual validation commands and results

- pnpm --dir packages/phase1a11-idea-governance-foundation typecheck: PASS
- pnpm --dir packages/phase1a11-idea-governance-foundation test: PASS (215 tests)

## Failure behavior

Unknown actor, owner, role, household, operation, purpose, policy, mode, or audit state denies. Protected actions deny when audit is unavailable.

## Recovery and rollback

Re-run focused package validation after correcting failing contracts/tests. To roll back this wave’s Idea work, remove the package importer and package paths from the local Wave B3 worktree only.

## Limitations

- no visual Idea Review Center UI
- no attachment ingestion runtime
- no voice processing runtime
- no autonomous Product Manager runtime
- no specialist-agent runtime
- no Council runtime
- no Character Agent Gateway runtime
- no automatic roadmap updates
- no code generation from Ideas
- no Git automation
- no deployment automation
- no connector action runtime
- no budget elevation runtime
- no cloud mutation runtime

## Acceptance references

- IDEA-001 through IDEA-020
- IDEA-UX-001 through IDEA-UX-020
- IDEA-LIFE-001 through IDEA-LIFE-010
- IDEA-PRE-001 through IDEA-PRE-015

## Next safe step

Rahul reviews the uncommitted remediation diff and evidence before B3 closure inclusion.
