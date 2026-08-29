export interface P2AcceptanceDefinition {
  readonly id: string;
  readonly family: "COLLECT" | "DRIFT" | "ORCH" | "SAFE";
  readonly invariant: string;
  readonly rationale: string;
  readonly bundle: "BUNDLE_A" | "BUNDLE_B";
}

export const P2_COLLECT_IDS = Object.freeze([
  "POSTH1-P2-COLLECT-001",
  "POSTH1-P2-COLLECT-002",
  "POSTH1-P2-COLLECT-003",
  "POSTH1-P2-COLLECT-004",
  "POSTH1-P2-COLLECT-005",
  "POSTH1-P2-COLLECT-006",
] as const);

export const P2_DRIFT_IDS = Object.freeze([
  "POSTH1-P2-DRIFT-001",
  "POSTH1-P2-DRIFT-002",
  "POSTH1-P2-DRIFT-003",
  "POSTH1-P2-DRIFT-004",
  "POSTH1-P2-DRIFT-005",
  "POSTH1-P2-DRIFT-006",
  "POSTH1-P2-DRIFT-007",
  "POSTH1-P2-DRIFT-008",
] as const);

export const P2_ORCH_IDS = Object.freeze([
  "POSTH1-P2-ORCH-001",
  "POSTH1-P2-ORCH-002",
  "POSTH1-P2-ORCH-003",
  "POSTH1-P2-ORCH-004",
  "POSTH1-P2-ORCH-005",
  "POSTH1-P2-ORCH-006",
] as const);

export const P2_SAFE_IDS = Object.freeze([
  "POSTH1-P2-SAFE-001",
  "POSTH1-P2-SAFE-002",
  "POSTH1-P2-SAFE-003",
  "POSTH1-P2-SAFE-004",
] as const);

export const P2_ACCEPTANCE_IDS = Object.freeze([
  ...P2_COLLECT_IDS,
  ...P2_DRIFT_IDS,
  ...P2_ORCH_IDS,
  ...P2_SAFE_IDS,
] as const);

export const P2_ACCEPTANCE_REGISTRY: readonly P2AcceptanceDefinition[] = Object.freeze([
  {
    id: "POSTH1-P2-COLLECT-001",
    family: "COLLECT",
    invariant: "Raw evidence envelopes are normalized with SHA-256 payload integrity.",
    rationale: "Ensures evidence raw payload integrity and hash verification.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-COLLECT-002",
    family: "COLLECT",
    invariant: "Provider-neutral pull request facts are extracted deterministically.",
    rationale: "Ensures pull request attributes are normalized to provider-neutral contracts.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-COLLECT-003",
    family: "COLLECT",
    invariant: "Review facts and review thread states are normalized to closed schemas.",
    rationale: "Ensures review approval counts and thread resolution states are standardized.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-COLLECT-004",
    family: "COLLECT",
    invariant: "Check status facts are mapped to SUCCESS, FAILURE, or PENDING.",
    rationale: "Standardizes check suite outcomes without missing ambiguity.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-COLLECT-005",
    family: "COLLECT",
    invariant: "Incomplete pagination returns NOT_ASSESSABLE with PAGINATION_INCOMPLETE.",
    rationale: "Prevents partial evidence collection from producing false drift or authority.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-COLLECT-006",
    family: "COLLECT",
    invariant: "Evidence freshness is evaluated against supplied timestamp and max age.",
    rationale: "Verifies evidence freshness without ambient time access.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-DRIFT-001",
    family: "DRIFT",
    invariant: "Repository identity or base branch mismatch produces TARGET_MISMATCH drift.",
    rationale: "Detects repository and branch drift against target lock.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-002",
    family: "DRIFT",
    invariant: "HEAD commit SHA mismatch against target lock produces HEAD_SHA drift.",
    rationale: "Detects commit SHA drift against target lock.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-003",
    family: "DRIFT",
    invariant: "PR draft status or closed/merged state mismatch produces PR state drift.",
    rationale: "Detects PR state drift.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-004",
    family: "DRIFT",
    invariant: "Review state mismatch or changes requested produces review drift.",
    rationale: "Detects review approval drift.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-005",
    family: "DRIFT",
    invariant: "Unresolved review threads produce blocking thread drift.",
    rationale: "Detects unresolved review threads.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-006",
    family: "DRIFT",
    invariant: "Failed or pending checks produce status check drift.",
    rationale: "Detects status check failure or pending state.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-007",
    family: "DRIFT",
    invariant: "Incomplete acceptance coverage produces acceptance coverage drift.",
    rationale: "Ensures all required acceptance IDs are validated.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-DRIFT-008",
    family: "DRIFT",
    invariant: "Stale supplied facts return NOT_ASSESSABLE with EVIDENCE_STALE and never create drift or authority.",
    rationale: "Ensures stale evidence is classified as NOT_ASSESSABLE without false drift.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-001",
    family: "ORCH",
    invariant: "P1 readiness assessment is consumed without logic duplication.",
    rationale: "Orchestrates P1 merge readiness assessment.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-002",
    family: "ORCH",
    invariant: "P1 main closure assessment is consumed without logic duplication.",
    rationale: "Orchestrates P1 main closure assessment.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-003",
    family: "ORCH",
    invariant: "Governance reconciliation result is generated deterministically.",
    rationale: "Produces structured governance reconciliation result.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-004",
    family: "ORCH",
    invariant: "Evidence manifest projection calculates cryptographic hash summaries.",
    rationale: "Projects audit manifest with hashes across all facts and reports.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-005",
    family: "ORCH",
    invariant: "Read-only automation plan projects non-authorizing advisory actions.",
    rationale: "Outlines read-only next checks with explicit non-authorizing disclaimers.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-ORCH-006",
    family: "ORCH",
    invariant: "Equal normalized inputs produce byte-for-byte identical manifest hashes.",
    rationale: "Ensures complete determinism of output projections.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-SAFE-001",
    family: "SAFE",
    invariant: "All outputs carry non-authorizing authority markers.",
    rationale: "Guarantees no state transition or execution authority is created.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-SAFE-002",
    family: "SAFE",
    invariant: "The provider-neutral normalization, reconciliation, and projection core performs no filesystem, database, network, subprocess, Git, GitHub, persistence, or protected-action side effects.",
    rationale: "Enforces strict pure-core boundary.",
    bundle: "BUNDLE_A",
  },
  {
    id: "POSTH1-P2-SAFE-003",
    family: "SAFE",
    invariant: "Provider failures and unavailability map to NOT_ASSESSABLE.",
    rationale: "Prevents provider outages or rate limits from creating false drift.",
    bundle: "BUNDLE_B",
  },
  {
    id: "POSTH1-P2-SAFE-004",
    family: "SAFE",
    invariant: "Hostile objects, throwing proxies, and null prototypes are safely handled.",
    rationale: "Protects core against prototype pollution and hostile proxy reflection.",
    bundle: "BUNDLE_A",
  },
]);

export const validateP2AcceptanceCoverage = (
  validatedIds: readonly string[]
): { readonly coverageComplete: boolean; readonly missingIds: readonly string[] } => {
  const set = new Set(validatedIds);
  const missingIds = P2_ACCEPTANCE_IDS.filter((id) => !set.has(id));
  return {
    coverageComplete: missingIds.length === 0,
    missingIds: Object.freeze(missingIds),
  };
};
