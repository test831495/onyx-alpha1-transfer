# Phase 1A.8 Wave 3C: Governed Context Assembly and Model Routing

## Overview

Wave 3C implements the complete governed context assembly pipeline and provider-neutral model routing framework. This wave establishes the deterministic, contract-based approach to context gathering, source validation, and model selection that enables secure, auditable autonomous agent reasoning.

## Architecture

### Fixed Context Assembly Pipeline

The assembly pipeline enforces a strict 9-stage ordering with failure blocking semantics:

1. **CLASSIFY_REQUEST**: Categorizes incoming requests (READ_ONLY_QUERY, CODE_IMPLEMENTATION, DOCUMENTATION, etc.)
2. **IDENTIFY_DOMAIN**: Classifies request domain (ENGINEERING, PROJECT_GOVERNANCE, MEMORY, CONNECTOR, etc.)
3. **IDENTIFY_PERMISSIONS**: Generates permission decision with deny-by-default semantics
4. **IDENTIFY_FRESHNESS**: Establishes freshness requirements (STATIC_ACCEPTABLE, REPOSITORY_CURRENT, REAL_TIME_REQUIRED, etc.)
5. **RETRIEVE_SOURCES**: Collects source references (no live retrieval in Wave 3C - deterministic only)
6. **RANK_SOURCES**: Orders candidates by precedence, trust, freshness with stable tie breaking
7. **DEDUPLICATE_SOURCES**: Groups duplicates, preserves conflicts and attribution
8. **BUILD_CONTEXT_PACKAGE**: Assembles immutable package with version and parent tracking
9. **AUDIT_PROVENANCE**: Validates all decisions and source integrity

A failed stage prevents all later stages from claiming success via `assertPipelineStepFailureBlocksSuccess()`.

### Source Precedence (Authoritative Order)

The 8-tier source precedence establishes authority without granting permission:

```
1. CURRENT_USER_INSTRUCTION    (highest authority, still requires permission validation)
2. CURRENT_APPROVAL_STATE       (approval records are not factual memory)
3. REPOSITORY_TRUTH             (authoritative for repository state only)
4. ADR                          (architecture decision records)
5. ARCHITECTURE_DOCUMENTATION   (design specifications)
6. DURABLE_MEMORY               (M2, M3, M5 retained across sessions)
7. SESSION_MEMORY               (M1 ephemeral, M3 session-bound)
8. LOW_TRUST_SOURCE             (lowest precedence, never overrides authority)
```

Higher precedence sources must still pass permission, freshness, and provenance validation.

### Permission and Freshness Decisions

**Permission Decision Contract** enforces deny-by-default:
- `ALLOWED`: Full access to requested resources
- `DENIED`: Access explicitly rejected with reasons
- `REQUIRES_APPROVAL`: Approval gate must clear before proceeding
- `REQUIRES_FRESH_APPROVAL`: Prior approval invalidated, fresh approval required
- `REQUIRES_RECONCILIATION`: Ambiguous access state requires resolution
- `PROHIBITED`: Governance policy prevents access (cannot be overridden)

Missing permission information cannot default to allowed; character attribution does not grant permissions.

**Freshness Decision Contract** prevents stale and unknown timestamps:
- Requirement classes: STATIC_ACCEPTABLE, REPOSITORY_CURRENT, SESSION_CURRENT, CONNECTOR_CURRENT, WEB_CURRENT, REAL_TIME_REQUIRED, HISTORICAL_AS_OF, UNKNOWN_FRESHNESS
- Decision values: FRESH, STALE, UNKNOWN, UNAVAILABLE, REQUIRES_REFRESH, PROHIBITED
- Unknown timestamps (`sourceObservedAt === "UNKNOWN"`) cannot be labeled FRESH
- REAL_TIME_REQUIRED fails safe when real-time verification is unavailable (no live verification in Wave 3C)

### Source References and Retrieval Candidates

**Source Reference Contract** provides immutable source metadata:
- `sourceType`: REPOSITORY_TRUTH, ARCHITECTURE_DOCUMENTATION, ADR, DURABLE_MEMORY, SESSION_MEMORY, CURRENT_APPROVAL_STATE, CURRENT_USER_INSTRUCTION, LOW_TRUST_SOURCE, CONNECTOR_BACKED, INDEXED_WEB, LIVE_WEB, UNKNOWN_SOURCE
- `trustClassification`: CANONICAL_REPOSITORY, AUTHORED_DOCUMENTATION, GOVERNANCE_RECORD, AGENT_GENERATED, USER_GENERATED, CONNECTOR_PROVIDED, INDEXED_EXTERNAL, UNKNOWN_TRUST
- `authorityClass`: AUTHORITATIVE_SOURCE, SUPPORTING_EVIDENCE, DERIVED_INFERENCE, CONTEXTUAL_REFERENCE, DISPUTED_FACT, UNVALIDATED_CLAIM, UNKNOWN_AUTHORITY
- Includes `sourceDigest` (required), `observedAt` timestamp, tombstone/quarantine status, permission status

**Retrieval Candidate Contract** gates candidate eligibility:
- Candidates are rejected when: permission denied, freshness requirement not satisfied, quarantined, tombstoned, source digest missing, provenance missing, permission status denied, or P0 content in non-authorized path
- Eligible candidates proceed to ranking

### Source Ranking, Deduplication, and Redaction

**Source Ranking Contract** provides deterministic ordering:
- Candidates ranked by source precedence, permission eligibility, freshness, provenance validation, poisoning status, and relevance
- Tie breaker is always stable (canonical source-reference ID), never current time or random values
- Ranking never converts low-trust sources into authority
- No quarantined or tombstoned content in ranked set

**Source Deduplication Contract** preserves information integrity:
- Deduplicate by canonical identity and validated source digest
- Preserve source attribution, provenance, and disagreement
- Record conflicting versions as conflicts, not collapsed duplicates
- Retained canonical candidate may be highest-ranked duplicate, but all duplicate relationships remain auditable

**Context Redaction Decision Contract** prevents sensitive content exposure:
- Redaction classes: SECRET, AUTHORIZATION_HEADER, API_KEY, GITHUB_TOKEN, CONNECTOR_CREDENTIAL, PERSONAL_ACCOUNT_IDENTIFIER, PRIVATE_PERSONA_CONTENT, PRIVATE_USER_CONTENT, CHAIN_OF_THOUGHT, UNAUTHORIZED_MEMORY_CONTENT, UNKNOWN_SENSITIVE_CONTENT
- Incomplete mandatory redaction blocks context package creation
- Unredacted sensitive content must never be stored in decision contracts

### Immutable Context Packages

**Context Package Contract** is immutable after creation:
- No update-in-place methods exist
- Material changes create new package ID, version, parent reference, and provenance digest
- Material changes: source set, source version/digest, permission decision, freshness requirement/decision, scope hash, connector/memory scope, redaction decision, budgets, model routing, cache decision, approval state
- Packages must not contain: raw secrets, credentials, raw auth headers, chain-of-thought, private persona content, full P0 records, or execution authority

**Context Package Versioning Contract** tracks material evolution:
- `parentContextPackageId` links to prior version
- Each version incremented on material change
- Full provenance chain auditable from root version

### Provenance Audit

**Context Provenance Audit Contract** validates all decisions before acceptance:
- Audit result values: VALID, INVALID, INCOMPLETE, REQUIRES_RECONCILIATION, PROHIBITED
- Validates all source references, canonical sources, digests
- Cross-references permission, freshness, ranking, deduplication, redaction decisions
- Validates poisoning review status and tombstone review status
- Validates model routing and budget decisions
- Context package cannot be accepted without valid provenance audit

## Model Routing (Provider-Neutral)

### Model Routing Classes

Routing classes are provider-neutral and provider-agnostic:

```
LOCAL_SMALL     - Small local model (e.g., on-device or inference server)
LOCAL_MEDIUM    - Medium local model
CLOUD_SMALL     - Small cloud model
CLOUD_MEDIUM    - Medium cloud model
CLOUD_PREMIUM   - Premium cloud model (highest capability, likely costliest)
```

No model routing contract includes provider names (OpenAI, Azure, Anthropic, Google, Claude, GPT-, Gemini, etc.). Provider selection is deferred to a future provider registry.

### Model Routing Profile and Decision

**Model Routing Profile Contract** defines routing constraints:
- `allowedClasses`: Available routing classes for this context
- `preferredClass`: Default routing choice
- `fallbackOrder`: Ordered fallback classes if preferred unavailable
- `localFirst`: Prefer local models when applicable
- `cachePreferred`: Use cache before paid execution when policy permits
- `premiumApprovalThreshold`: Token/cost threshold requiring approval for premium routing
- `paidActionApprovalRequired`: Paid actions always require explicit approval
- `privacyRequirement`: LOCAL_ONLY, PRIVATE_CLOUD, COMPLIANCE_REGION, NO_SENSITIVE_DATA, UNRESTRICTED
- `dataResidencyRequirement`: LOCAL, US_ONLY, EU_ONLY, CONTRACTUAL_REGION, UNRESTRICTED
- `connectorContentAllowed`: Connector data may be routed to this class
- `privateMemoryAllowed`: Private memory may be routed to this class

**Model Routing Decision Contract** makes deterministic routing choice:
- Decision values: SELECTED, FALLBACK_SELECTED, REQUIRES_APPROVAL, DENIED_BY_PRIVACY, DENIED_BY_BUDGET, DENIED_BY_PERMISSION, UNAVAILABLE, FAILED_SAFE, PROHIBITED
- Local-first selection when `localFirst: true`
- Cache before paid execution when `cachePreferred` and policy permits
- Cloud premium requires approval when threshold reached
- Paid action requires explicit approval
- Private memory and connector content not routed to classes lacking permission
- No model call is executed in this wave

## Budget and Cache Decisions

### Token and Cost Budget Decisions

**Token Budget Decision Contract** and **Cost Budget Decision Contract** govern resource consumption:
- `decision`: ALLOWED, ALLOWED_WITH_WARNING, FALLBACK_REQUIRED, APPROVAL_REQUIRED, DENIED, FAILED_SAFE
- Hard limit never exceeded; exceeding hard limit rejects action fail-safe
- Unknown budget state fails safe
- Paid action requires explicit approval
- Premium routing obeys cost and token thresholds
- Budget availability does not grant permission or approval

### Cache Decision Contract

Cache decisions validate governance even on cache hits:
- `cachePolicy`: CACHE_DISABLED, CACHE_READ_ONLY, CACHE_READ_WRITE_LOCAL, CACHE_REBUILD_REQUIRED
- `cacheStatus`: HIT, MISS, STALE, INVALIDATED, BLOCKED, REBUILD_REQUIRED, PROHIBITED
- Cache hit must validate: permission, freshness, tombstone, poisoning, redaction, scope
- Stale cache cannot be used as fresh truth
- No actual cache reads/writes executed in this wave

### Delta-Index Decision Boundary

**Delta-Index Decision Contract** marks the boundary between context assembly and indexing infrastructure:
- `changedSegments`, `unchangedSegments`, `deletedSegments` track source changes
- Deleted segments must never be reintroduced
- Unknown tombstone state requires reconciliation or rebuild
- Boundary only; no actual indexing executed in this wave

## Approval Gates

### Premium Approval Gate

Paid model selection or premium routing decisions exceeding cost threshold require explicit approval before proceeding.

### Paid Action Approval Gate

Any action with non-zero estimated cost requires explicit approval when `paidActionApprovalRequired: true`.

### Budget Exhaustion Fail-Safe

**Budget Exhaustion Fail-Safe Classification** handles resource unavailability:
- Classification values: TOKEN_EXHAUSTION, COST_EXHAUSTION, CACHE_REBUILD_REQUIRED, LOCAL_FALLBACK_REQUIRED, NO_AVAILABLE_MODEL
- Fail-safe must specify fallback action (cache rebuild, local model fallback, etc.)

## Governance Invariants

### Preserved from Earlier Waves

- Phase 1A.5 workflow contract 1.0.0 and all 32 workflow states
- Phase 1A.6 runtime contract 1.0.0 and ACTIVE_PHASE1A8_RUNTIME_LIMIT = 1
- Phase 1A.7 UI integration contract 1.0.0
- All shared governance contracts and Track A contracts
- All Wave 3A memory and persona contracts
- All Wave 3B poisoning, tombstone, and non-resurrection contracts
- All frozen-false safety flags

### Context Assembly Invariants

- **Context is not approval**: Context packages do not grant execution authority
- **Context is not permission**: Context packages do not grant access rights
- **Source trust is not authority**: Trust classification does not grant authority
- **Source ranking is not authority**: Ranking order does not convert low-trust sources
- **Retrieval score is not authority**: Relevance scores do not grant authority
- **Model routing is not approval**: Routing decision does not approve execution
- **Budget availability is not approval**: Budget status does not approve action
- **Cache presence is not canonical truth**: Cache hit is not authoritative without validation
- **Embedding similarity is not canonical truth**: Vector distance does not establish fact
- **Generated summary is not canonical truth**: LLM summaries must not override source truth
- **Repository truth remains authoritative**: For repository state, repository is canonical
- **Active approval state remains authoritative**: For approved action scope
- **Canonical source records remain authoritative**: For sourced facts
- **M2 retained memory does not override its canonical source**
- **Low-trust content cannot override governance**
- **Quarantined content cannot enter active context package**
- **Tombstoned content cannot enter active context package**
- **P0 persona content must not be copied into general context packages**
- **Persona attribution metadata is not persona content**
- **Track A and Track B remain separate namespaces**
- **Track A references context packages only through stable context IDs**
- **No unrestricted context packages embedded in task, lease, heartbeat, lock, checkpoint, or evidence contracts**
- **Phase 1A.8 remains contract-only and deterministic-test-only**

## Testing Strategy

Wave 3C includes 36 deterministic tests covering:

- Request and domain classification with unknown fail-safe
- Permission decisions with deny-by-default and prohibition override
- Freshness requirements and decisions preventing stale/unknown labeling as fresh
- Real-time requirements failing safe without verification
- Source precedence enforcing 8-tier order and permission validation
- Source ranking with deterministic tie breaking
- Source deduplication preserving attribution and conflicts
- Redaction decision blocking incomplete mandatory redaction
- Immutable context packages with version management
- Material change tracking with parent references
- Provenance audit requiring valid status before acceptance
- Provider-neutral model routing classes
- Model routing decisions with budget and permission gating
- Token and cost budget decisions with hard limits
- Cache decisions with governance validation
- Delta-index boundary preventing segment reintroduction
- Premium and paid-action approval gates
- Budget exhaustion fail-safe classification

All tests use deterministic IDs, timestamps (no `now()`), and avoid live sources, connectors, models, caches, indexes, or providers.

## Implementation Notes

### No Live Execution in Wave 3C

Wave 3C is contract-only and deterministic-test-only. The following are explicitly deferred to later waves or external services:

- Live source retrieval
- Live repository search
- Live connector reads and mutations
- Live web search
- Live RAG execution
- Live embedding generation
- Live vector-store queries
- Live model calls
- Live local-model execution
- Live cloud-model execution
- Paid API calls
- Live caching
- Live delta indexing
- Live durable-memory writes
- Council Mode contracts
- Saved Draft contracts
- Automation Center V2 contracts
- Accessibility contracts
- Complete Phase 1A.8 simulation
- Final Phase 1A.8 validator
- Active scheduler

### Key Design Decisions

1. **Deterministic Everything**: All IDs, tie breakers, and ordering depend only on input data, never time or random values
2. **Fail-Safe by Default**: Missing information defaults to denial, unknown states fail safe
3. **Immutable Packages**: Context packages cannot be modified in-place; changes create new versioned packages
4. **Separated Concerns**: Permission (access control), freshness (currency), authority (source rank), and approval (explicit override) are distinct axes
5. **Auditable Everything**: All decisions include references to supporting evidence and prior decision contracts
6. **No Provider Lock-In**: Routing classes are provider-agnostic; real model provider selection deferred

## Acceptance Criteria Met

- ✅ Fixed 9-stage context assembly pipeline
- ✅ Source precedence with 8-tier authoritative order
- ✅ Permission and freshness decision contracts
- ✅ Source reference and retrieval candidate contracts
- ✅ Ranking with deterministic tie breaking
- ✅ Deduplication preserving conflicts and attribution
- ✅ Redaction decision blocking incomplete mandatory redaction
- ✅ Immutable context package contracts with versioning
- ✅ Provenance audit required for acceptance
- ✅ Provider-neutral model routing profile and decision
- ✅ Budget decision contracts with hard limits
- ✅ Cache decision contracts with governance validation
- ✅ Delta-index decision boundary
- ✅ Premium and paid-action approval gates
- ✅ Budget exhaustion fail-safe classification
- ✅ 36 deterministic tests passing
- ✅ Complete package typecheck
- ✅ All prior tests remain passing (153 → 189)
- ✅ Documentation complete

## References

- [Phase 1A.8 Architecture](./ROADMAP_TO_V6.md)
- [Memory Governance (Wave 3A)](./phase1a8/phase1a8-memory-governance.md)
- [Poisoning Protection (Wave 3B)](./phase1a8/phase1a8-poisoning-protection.md)
- [Workflow Contract (Phase 1A.5)](../packages/phase1a5-workflow-engine/README.md)
- [Runtime Contract (Phase 1A.6)](../packages/phase1a6-workflow-runtime/README.md)
- [Command Center UI (Phase 1A.7)](../apps/command-center/README.md)
