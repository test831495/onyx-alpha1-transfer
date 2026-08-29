# Post-H1 P0 Lifecycle Architecture

## Purpose and status

This document describes the local, provider-neutral, non-authorizing P0 contract
candidate that is currently under final remediation review. It is not a Git,
merge, release, approval, persistence, or production authority decision. The
authoritative baseline is the fixed commit `b88236650b8b6ca8ddc40d3b3aff079be98e88f3`.

The implementation remains intentionally local to the package and does not create
provider integrations, execution authority, or write capability. This document
uses conservative classifications only: `IMPLEMENTED_EXECUTABLE`,
`IMPLEMENTED_CONTRACT_ONLY`, `DEFERRED`, and `NON_GOAL`.

## Boundary

The P0 candidate is intentionally bounded to the following nine file paths:

- [packages/ai-development-factory-foundation/POST_H1_LIFECYCLE_ARCHITECTURE.md](packages/ai-development-factory-foundation/POST_H1_LIFECYCLE_ARCHITECTURE.md)
- [packages/ai-development-factory-foundation/src/post-h1/lifecycle-contracts.ts](packages/ai-development-factory-foundation/src/post-h1/lifecycle-contracts.ts)
- [packages/ai-development-factory-foundation/src/post-h1/lifecycle-vocabulary.ts](packages/ai-development-factory-foundation/src/post-h1/lifecycle-vocabulary.ts)
- [packages/ai-development-factory-foundation/src/post-h1/target-lock.ts](packages/ai-development-factory-foundation/src/post-h1/target-lock.ts)
- [packages/ai-development-factory-foundation/src/post-h1/architecture-constitution.ts](packages/ai-development-factory-foundation/src/post-h1/architecture-constitution.ts)
- [packages/ai-development-factory-foundation/tests/post-h1-lifecycle-contracts.test.ts](packages/ai-development-factory-foundation/tests/post-h1-lifecycle-contracts.test.ts)
- [packages/ai-development-factory-foundation/tests/post-h1-target-lock.test.ts](packages/ai-development-factory-foundation/tests/post-h1-target-lock.test.ts)
- [packages/ai-development-factory-foundation/src/factory-constitution.ts](packages/ai-development-factory-foundation/src/factory-constitution.ts)
- [packages/ai-development-factory-foundation/tests/validators.test.ts](packages/ai-development-factory-foundation/tests/validators.test.ts)

Factory snapshot files remain `PRESERVE_AND_REVALIDATE_ONLY`. P0 source files in
`src/post-h1/` remain `PRESERVE_ONLY`. No fourth path is authorized in this gate.

## Capability classification register

The document below uses the current verified implementation status and does not
claim runtime behavior that is not present in the local candidate.

### Current capability classifications

- Factory inspection snapshot: `IMPLEMENTED_EXECUTABLE`
- Lifecycle record validation: `IMPLEMENTED_EXECUTABLE`
- Lifecycle graph validation: `IMPLEMENTED_EXECUTABLE`
- Target-lock validation and comparison: `IMPLEMENTED_EXECUTABLE`
- Evidence freshness: `IMPLEMENTED_EXECUTABLE`
- Tombstone validation: `IMPLEMENTED_EXECUTABLE`
- Successor-only reopening: `IMPLEMENTED_EXECUTABLE`
- Sensitivity validation: `IMPLEMENTED_EXECUTABLE`
- Partial-state readback mapping: `IMPLEMENTED_EXECUTABLE`
- Canonicalization: `IMPLEMENTED_EXECUTABLE`
- Supplied hash syntax: `IMPLEMENTED_CONTRACT_ONLY`
- Domain labels: `IMPLEMENTED_CONTRACT_ONLY`
- Persistence: `IMPLEMENTED_CONTRACT_ONLY` for P0 ephemeral-only rejection semantics
- Provider integration: `NON_GOAL`
- Runtime governance state machine: `IMPLEMENTED_CONTRACT_ONLY`
- Controlled PR-body updater: `NON_GOAL`
- Merge-readiness validator: `NON_GOAL`
- Main-branch closure automation: `NON_GOAL`

## Contracts

`lifecycle-vocabulary.ts` defines the closed values, status classes, reason codes,
acceptance IDs, test IDs, and named bounds used by the candidate. It is not a
runtime authority model and does not permit persistence semantics beyond the
accepted P0 ephemeral-only contract.

`lifecycle-contracts.ts` validates records, graph lineage, evidence freshness,
projection references, sensitivity enforcement, partial-state readbacks, and
canonically safe record snapshots. It reuses the existing Factory one-pass
snapshot inspection primitive without second inspection or mutation.

`target-lock.ts` validates immutable provider-neutral target fields for repository,
branch, SHA, state, hashes, thread IDs, ruleset, actor, purpose, and UTC expiry.
Mismatches fail closed with the current exported target-lock mismatch reasons.

`architecture-constitution.ts` enforces the P0 non-authority contract and the
non-persistence boundaries used by the candidate.

## Truth, privacy, and recovery

The candidate is a contract-only validation layer. It does not create authority,
approval, merge, release, deployment, persistence, or filesystem execution.
Canonical records remain distinct from reports, PR bodies, and runtime actions.

Records are immutable. Parent and supersession links are validated through finite
graph checks with duplicate IDs, missing references, cycles, and bounded
traversal rejected. Tombstone and reopening references remain contract-level data
only; they do not restore authority or silently remove risk, limitation, or
freshness evidence.

Sensitivity classes include `PUBLIC_METADATA`, `REPOSITORY_METADATA`,
`OWNER_RESTRICTED`, `SENSITIVE_REDACTED`, and `PROHIBITED_CONTENT`. Only public
and repository metadata are default-safe. Secrets, tokens, private keys,
credentials, household-private data, media, connector secrets, and decrypted
caches remain prohibited or redacted.

Partial states have no retry authority and require readback mapping for edited,
staged, pushed, ambiguous PR, reply, resolution, review, and merge states. This is
an evidence and contract boundary, not runtime recovery execution.

## Bounds and grammar

The implementation applies the current bound values declared in the vocabulary:
`ID_MAX_LENGTH=128`, `URL_MAX_LENGTH=2048`, `BRANCH_MAX_LENGTH=255`,
`PURPOSE_MAX_LENGTH=512`, `MARKER_MAX_COUNT=128`, `EVIDENCE_REFERENCE_MAX_COUNT=256`,
`LINEAGE_MAX_COUNT=256`, `RISK_MAX_COUNT=64`, `LIMITATION_MAX_COUNT=64`,
`TRIGGER_MAX_COUNT=64`, `ACTION_MAX_COUNT=32`, `EXTENSION_MAX_COUNT=32`,
`OBJECT_KEY_LIMIT=64`, `MAX_NESTING_DEPTH=16`, and `LINEAGE_TRAVERSAL_LIMIT=128`.
These values are enforced by the contract and fail closed; they are not silently
truncated or rewritten.

The candidate validates IDs, branch grammar, lowercase Git SHA-1, SHA-256 syntax,
UTC `Z` timestamps, and NFC-normalized strings via deterministic checks. Hashes
are syntax evidence only. They do not create cryptographic trust or authority.

## Acceptance registry

The accepted IDs remain `POSTH1-P0-ARCH-001` through `POSTH1-P0-ARCH-016` and
map to the current package-local validation, graph, target-lock, privacy,
hostile-object, and documentation boundaries.

## Machine-checkable test mapping

The current candidate uses explicit scenario definitions for the exact 64 T IDs and
separate bound tests for exact/over-bound validation. Every scenario maps to a
bounded acceptance set and uses only the closed vocabulary exported by the P0
contract itself.

The current local evidence is intentionally scoped to the exact final three-file
local remediation and preserves the Factory and source modules.

## Validation and future sequence

The local validation steps remain: the focused P0 test run, the validation and
bound-test suite, the package test suite, package and monorepo typechecks, and
`git diff --check`. Future workflow stages remain outside the P0 contract and
must be separately authorized.

This candidate remains local, unstaged, and uncommitted. Any future production,
provider, merge, or recovery execution remains out of scope and requires a
separate owner decision.