# Phase 1A.4 Threat Model

## Purpose

This threat model protects the ONYX/NOVA boundary while the programme introduces governed automation, persistent memory, multiple characters, and derived character assets. It is a design constraint for future implementation, not an implementation plan.

## Trust boundaries

1. **Human approval boundary**: a human approves one named capability, repository, base branch, isolated branch, scope, and expiry.
2. **Cloud ONYX boundary**: GitHub metadata and approved remote mutations are handled here.
3. **Local NOVA boundary**: local reasoning, drafts, private context, and local-first tools remain here unless explicitly exported.
4. **Memory boundary**: session, shared, character, knowledge, and archive records are classified and permissioned independently.
5. **Asset boundary**: Canva drafts are untrusted workspace material; GitHub is the approved source of truth for accepted assets.

## Threats and controls

| Threat | Control |
| --- | --- |
| Prompt or tool request escalates a read into a write | Capability allowlist and exact approval binding |
| Approval is replayed or broadened | Scope hash, expiry, single-use operation record, and capability match |
| Protected branch or unrelated work is overwritten | Isolated branch requirement, base/head checks, and force-push prohibition |
| A failed remote write is repeated dangerously | No automatic write retry; require a new approval and idempotency check |
| Secrets or permissions leak through context or logs | Secret redaction, least privilege, no secret-change or permission-change capability |
| Memory becomes an authorization source | Memory can inform context only; authorization comes from current policy and approval |
| One character impersonates another | Immutable identity contract, signed/versioned profile, and explicit speaker routing |
| Conflicting characters trigger concurrent tools | Voice Floor Manager and one-tool-action-at-a-time invariant |
| Draft assets are treated as approved | Canva status is draft-only; accepted assets must be versioned and evidenced in GitHub |
| Unvalidated 2D/3D assets enter production | Automated and human validation gates, evidence, contact sheets, and LOD checks |

## Allowed Phase 1A.4 operations

Only these named mutations may be implemented: `CREATE_GITHUB_ISSUE`, `CREATE_ISOLATED_BRANCH`, `PUSH_ISOLATED_BRANCH`, and `CREATE_DRAFT_PR`. All are approval-gated and restricted to isolated work.

## Prohibited operations

`MERGE_PULL_REQUEST`, `PRODUCTION_DEPLOYMENT`, `LIVE_NETLIFY_UPDATE`, `SECRET_CHANGE`, `PERMISSION_CHANGE`, `BRANCH_PROTECTION_CHANGE`, `FORCE_PUSH`, and `DESTRUCTIVE_GIT_OPERATION` are hard-denied. The denial must be observable in evidence and must not be converted into a different action.

## Incident response and rollback

On policy mismatch, identity mismatch, scope drift, unexpected response, or evidence failure: stop, preserve the audit record, expose the failure, and revoke the pending approval. Rollback means restoring the last approved document, memory, branch state, or asset version; it never means force-pushing or deleting evidence. Any recovery requiring a prohibited capability is escalated to a human operator outside this phase.

## Required evidence

Each approved operation records the requester, approver, capability, repository, base and head, scope hash, timestamps, result, provider response identifiers, and redacted failure details. Evidence must be sufficient to reconstruct what was proposed, approved, attempted, and retained.

<!-- architecture-hardening-v1 -->

## Actor verification

Every approval and execution request must resolve:

- Authenticated actor identity
- Actor authority
- Approved capability
- Repository scope
- Branch scope
- Exact scope hash
- Approval validity
- Approval expiry
- Approval consumption state

An identity mismatch, missing authority, expired approval, or unresolved actor stops execution before any remote mutation.

## Repository verification

Only repositories on the configured allowlist may receive live actions.

The execution boundary must verify:

- Repository owner
- Repository name
- Canonical repository identifier
- Configured remote URL
- Approved base branch
- Approved isolated branch
- Current base commit
- Repository visibility where relevant

The repository values must match the approval envelope exactly.

A mismatch must stop execution and create failure evidence.

## Replay protection

Every approval receives:

- Unique approval ID
- Capability
- Exact scope hash
- Issued timestamp
- Expiry timestamp
- Single-use status
- Consumed timestamp

A consumed, expired, revoked, rejected, or mismatched approval cannot be reused.

Approval consumption must be recorded atomically with the operation result or reconciliation state.

## Idempotency and duplicate suppression

Every allowed remote operation requires an idempotency key.

The idempotency key must bind:

- Capability
- Repository
- Base branch
- Head branch when applicable
- Scope hash
- Approved plan version

A repeated request with the same idempotency key must return the recorded result or reconciliation state. It must not create a duplicate issue, branch, push, or Draft PR.

A repeated request with altered scope but a reused key must be rejected.

## Branch protection and naming

Isolated branches must use an approved naming policy.

A branch request must be rejected when:

- The target is a protected branch.
- The name matches a prohibited branch.
- The branch already exists with incompatible provenance.
- The requested base commit differs from the approved base commit.
- The operation would overwrite unrelated work.
- A force push would be required.

## Partial failure and reconciliation

The execution system must distinguish:

- NOT_STARTED
- STARTED
- REMOTE_SUCCEEDED
- EVIDENCE_PENDING
- RECONCILIATION_REQUIRED
- COMPLETED
- FAILED_SAFE

After an uncertain provider response, the system must inspect the authoritative remote state before attempting any subsequent action.

Automatic remote-write retry is prohibited unless the original idempotency key proves that the operation is safe to reconcile.

## Multi-character coordination threats

Threats include:

- Duplicate responses
- Contradictory factual context
- Cross-character prompt manipulation
- Tool ownership conflict
- Unbounded conversation loops
- Cost amplification
- One character attempting to grant authority to another

Controls include:

- Shared authoritative factual envelope
- Structured inter-character messages
- Maximum turn budget
- One Tool and Action Coordinator
- One speaking floor
- Explicit cost budget
- No implicit inter-character authority
- Rahul approval for every sensitive action

## Offline operation threats

Threats include:

- Stale memory
- Stale knowledge
- Delayed synchronization
- Conflicting local and remote updates
- Missing cloud-provider access
- Device compromise
- Unsynchronized approval state

Controls include:

- Freshness metadata
- Versioning
- Integrity hashes
- Conflict detection
- Re-synchronization validation
- Device-local encryption
- No offline authorization for remote GitHub mutations
- Explicit disclosure that current external data is unavailable

## Trusted execution boundary

Live GitHub credentials and remote-write capabilities must remain outside the browser character runtime.

The trusted execution boundary must:

- Receive a validated action request.
- Resolve current actor authority.
- Validate the approval envelope.
- Validate the repository.
- Validate the exact scope hash.
- Enforce idempotency.
- Execute only the named capability.
- Capture provider identifiers.
- Return redacted evidence.
- Expose reconciliation requirements.

The trusted boundary must not expose reusable credentials to ONYX, NOVA, browser code, generated content, memory records, or logs.
