# Phase 1A.4 Architecture Foundation

Phase 1A.4 defines the documentation-only foundation for the next ONYX/NOVA programme. It establishes the boundary between governed GitHub automation, character identity, presence, secure shared memory, multi-character coordination, and the character asset factory.

## Scope

This package defines contracts and decision boundaries. It does not add runtime code, provider adapters, workflows, scripts, credentials, deployment behavior, or repository mutations.

The phase is intentionally limited to these GitHub capabilities:

- `CREATE_GITHUB_ISSUE`: create an issue from an approved, immutable issue plan.
- `CREATE_ISOLATED_BRANCH`: create a branch from an approved base and isolated work scope.
- `PUSH_ISOLATED_BRANCH`: push only the approved isolated branch and commit scope.
- `CREATE_DRAFT_PR`: create a Draft PR whose base, head, title, body, and evidence match the approved plan.

Every remote mutation requires explicit, capability-specific approval, an audit record, preflight validation, and evidence. Approval does not expand the capability or permit a later operation.

## Explicit prohibitions

The following capabilities are outside this phase and must be rejected, not silently downgraded:

- `MERGE_PULL_REQUEST`
- `PRODUCTION_DEPLOYMENT`
- `LIVE_NETLIFY_UPDATE`
- `SECRET_CHANGE`
- `PERMISSION_CHANGE`
- `BRANCH_PROTECTION_CHANGE`
- `FORCE_PUSH`
- `DESTRUCTIVE_GIT_OPERATION`

Destructive Git operations include branch deletion, history rewriting, direct protected-branch pushes, and any operation that removes or overwrites unrelated work.

## Contract set

- [Threat model](phase1a4-threat-model.md)
- [ONYX and NOVA character identity contracts](../personality/PER-1-character-identity-contracts.md)
- [Presence mode contracts](../presence/PER-2-presence-mode-contracts.md)
- [Secure shared memory contract](../memory/PER-3-secure-shared-memory-contract.md)
- [Multi-character foundation contract](../multicharacter/MC-foundation-contract.md)
- [Character Asset Factory foundation](../character-factory/CAF-0-foundation.md)

## Completion criteria

The foundation is complete when each contract has an owner, an explicit input/output boundary, permission and rollback rules, evidence requirements, and a validation path. Runtime implementation requires a separately approved phase.

<!-- architecture-hardening-v1 -->

## Current status

- Architecture state: DESIGN_IN_PROGRESS
- Runtime implementation: NOT_STARTED
- Required baseline: DRY_RUN_READY
- Confirmed baseline commit: 3aebbc9
- Confirmed baseline tag: phase1a3e10-supervised-orchestration-final
- Remote mutation authority: NOT_GRANTED
- Merge authority: NOT_AVAILABLE
- Production authority: NOT_AVAILABLE

## Delivery dependency chain

1. Complete and approve the Phase 1A.4 architecture contracts.
2. Implement and validate CREATE_GITHUB_ISSUE.
3. Implement and validate CREATE_ISOLATED_BRANCH.
4. Implement and validate PUSH_ISOLATED_BRANCH.
5. Implement and validate CREATE_DRAFT_PR.
6. Conduct a supervised end-to-end live validation.
7. Stop before merge.

A later capability cannot inherit approval from an earlier capability.

## Approval envelope

Every live capability requires an approval envelope containing:

- Approval ID
- Approver identity
- Approver authority
- Capability
- Repository owner
- Repository name
- Base branch
- Head branch when applicable
- Exact scope hash
- Approval reason
- Issued timestamp
- Expiry timestamp
- Idempotency key
- Approval status
- Consumed timestamp
- Evidence reference

Approval status is one of:

- PENDING
- ACTIVE
- CONSUMED
- EXPIRED
- REVOKED
- REJECTED

An approval envelope is valid for one capability and one exact scope only.

## Architecture acceptance criteria

The architecture foundation is accepted only when:

- Actor verification is defined.
- Repository verification is defined.
- Approval envelopes are single-use and scope-bound.
- Replay protection is defined.
- Idempotency is defined for every allowed action.
- Protected branches are hard-denied.
- Partial failures can be reconciled safely.
- Audit evidence can reconstruct every attempt.
- Rollback does not require destructive Git operations.
- Merge and production remain unavailable.
