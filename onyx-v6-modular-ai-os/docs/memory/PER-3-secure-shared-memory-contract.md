# PER.3 Secure Shared Memory Contract

Memory stores context; it never grants authority. Authorization comes from current policy, capability boundaries, and explicit approval.

## Memory classes

- **Session Memory**: ephemeral context for the active conversation or task.
- **Summary Memory**: reviewed, compact summaries that preserve useful continuity without unnecessary raw content.
- **Shared Memory**: approved context available to both ONYX and NOVA under classification and consent rules.
- **Character Memory**: preferences, observations, and continuity owned by one character and unavailable to another unless explicitly shared.
- **Knowledge Base**: sourced, versioned reference material with provenance and freshness metadata.
- **Archive**: immutable or append-only historical records retained for audit, recovery, or legal obligations.

## Memory provenance

Every durable record has an owner, source, creation time, classification, consent or policy basis, confidence, transformations, and supersession links. Imported knowledge retains its source and retrieval context. Inferred content is labeled as inference and cannot be presented as fact without validation.

## Memory retention

Retention is purpose-bound and classification-aware. Session Memory expires by default; Summary, Shared, Character, and Knowledge Base records use explicit review and expiry policies; Archive is retained only for its stated audit or recovery purpose. Expiry and deletion events are themselves auditable.

## Memory permissions

Access is least-privilege and scoped by character, user, workspace, record class, and operation. Write, share, export, correct, and delete permissions are distinct. Sensitive records require consent and redaction before crossing the ONYX/NOVA boundary.

## Memory rollback

A correction creates a new version linked to the prior record. Rollback restores the last approved version, marks the invalid version superseded, and records actor, reason, and timestamp. Archive evidence is not silently rewritten.

## Non-authorization rule

Memory may supply context for a plan, but it cannot approve `CREATE_GITHUB_ISSUE`, `CREATE_ISOLATED_BRANCH`, `PUSH_ISOLATED_BRANCH`, or `CREATE_DRAFT_PR`. It cannot permit merge, deployment, secret, permission, branch-protection, force-push, or destructive Git operations. Stale, conflicting, or unproven memory must lower confidence and trigger review rather than expand access.

<!-- architecture-hardening-v1 -->

## Candidate memory writes

Characters cannot directly create or modify durable memory.

A candidate memory contains:

- Candidate ID
- Proposed value
- Proposing character or process
- Source
- Source trust level
- Supporting evidence
- Proposed record class
- Proposed owner
- Proposed scope
- Proposed visibility
- Sensitivity
- Confidence
- Retention proposal
- Confirmation requirement

The Memory Control Plane may:

- Reject the candidate
- Quarantine the candidate
- Store it temporarily
- Request Rahul review
- Merge it with an existing record
- Store it as an approved durable record
- Mark an earlier record superseded

External content cannot directly approve its own storage.

## Memory integrity metadata

Every durable record contains:

- Record ID
- Version
- Integrity hash
- Previous version
- Superseded-by reference
- Snapshot reference
- Created by
- Updated by
- Deleted by when applicable
- Created timestamp
- Updated timestamp
- Deletion timestamp when applicable
- Audit event references

Integrity mismatch places the record in quarantine and excludes the record from active context until resolved.

## Memory conflict resolution

When local, cloud, character-specific, or shared records conflict:

1. Preserve all source versions.
2. Compare scope, provenance, freshness, and authority.
3. Do not silently overwrite either record.
4. Lower confidence.
5. Create a reconciliation event.
6. Request Rahul review when the conflict affects durable project truth, permissions, identity, or execution.

## Memory poisoning protection

Controls include:

- Data and instruction separation
- Source trust classification
- Injection scanning
- Sensitive-data detection
- Candidate-write isolation
- Write-rate limits
- Record-size limits
- Protected-field controls
- Integrity hashes
- Snapshots
- Rollback
- Quarantine
- User-visible memory history
