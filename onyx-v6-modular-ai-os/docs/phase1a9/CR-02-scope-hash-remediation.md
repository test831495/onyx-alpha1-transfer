# CR-02 Scope Hash Remediation

## Root cause

`createScopeHash` previously used a 32-bit FNV-1a-style hash. It was used in approval scope comparisons and GitHub idempotency keys, making collisions too practical for an authorization boundary.

## Canonicalization and digest

The current contract accepts JSON-compatible values only: null, booleans, strings, finite numbers, dense arrays, and plain objects with enumerable string properties. Object keys are sorted recursively. Undefined values, sparse arrays, non-finite numbers, Date, BigInt, Map, Set, circular values, accessors, symbol keys, and non-plain prototypes fail deterministically.

The digest is synchronous Node `crypto` SHA-256 over the canonical UTF-8 representation:

`sha256-v1-` followed by 64 lowercase hexadecimal characters.

The prefix identifies both the digest algorithm and canonicalization version. The full digest is retained without truncation.

## Legacy policy

`fnv1a-*` values remain identifiable for historical evidence and diagnostics through `isLegacyScopeHash`, but they are not current authorization values. Current approval validation accepts only an exact `sha256-v1-<64 hex>` value. Missing, malformed, unknown, legacy, or mismatched values fail closed.

Existing approvals containing FNV values require explicit re-approval against a newly computed SHA-256 scope. No authority is converted automatically, and no historical evidence is rewritten.

## Idempotency policy

New idempotency keys use the `sha256-v1-` namespace. Legacy `fnv1a-*` keys cannot equal current keys and are not interpreted as approval authority. Existing legacy records require an explicit compatibility policy or re-execution review; this remediation does not silently reuse them.

## Affected consumers

- `automation-foundation`: plan and approval scope hashing and validation.
- `github-automation`: idempotency keys and approval gate.
- Phase 1A.4B branch bridge: approval scope and idempotency checks.
- Phase 1A.4C push bridge: approval scope and idempotency checks.
- Phase 1A.4D Draft PR bridge: approval scope and idempotency checks.
- Existing FNV evidence artifacts: historical/evidence-only and not rewritten.

Workflow IDs, approval IDs, policy versions, expiry, material-change checks, and higher-level bridge gates remain separate controls and are not replaced by the digest.

## Validation and rollback

Focused tests cover canonical ordering, nested arrays and objects, digest format, materially different values, unsupported inputs, legacy recognition and rejection, approval invalidation, and idempotency namespace separation. Package tests and no-emit typechecks are local-only.

Rollback must preserve the fail-closed rule for legacy approvals. Reverting the implementation would restore the weak FNV authority boundary and therefore requires explicit review; historical evidence remains unchanged in either case.

Scheduler execution and promotion remain disabled. Runtime and promotion lane limits remain unchanged.
