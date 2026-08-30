import { inspectRecordSnapshot } from "../factory-constitution";

export const P4_BOUNDS = Object.freeze({
  MAX_DEPTH: 10,
  MAX_OBJECT_KEYS: 64,
  MAX_COLLECTION_ITEMS: 64,
  MAX_EVIDENCE_ITEMS: 64,
  MAX_CHANGED_PATHS: 128,
  MAX_COMMITS: 64,
  MAX_ACCEPTANCE_IDS: 64,
  MAX_FINDINGS: 32,
  MAX_REVIEW_THREADS: 32,
  MAX_BLOCKERS: 32,
  MAX_WARNINGS: 32,
  MAX_GAPS: 32,
  MAX_CONTRADICTIONS: 32,
  MAX_HUMAN_ACTIONS: 16,
  MAX_OWNER_DECISIONS: 16,
  MAX_INVALIDATION_TRIGGERS: 32,
  MAX_RESIDUAL_RISKS: 16,
  MAX_PROVENANCE_ENTRIES: 32,
  MAX_STRING_LENGTH: 1024,
  MAX_REPORT_SECTION_LENGTH: 2048,
  MAX_CERTIFICATE_SERIALIZATION_LENGTH: 8192,
} as const);

export const P4_ASSURANCE_PROFILES = Object.freeze([
  "LOCAL_IMPLEMENTATION_ASSURANCE",
  "PR_MERGE_READINESS_ASSURANCE",
  "MAIN_CLOSURE_ASSURANCE",
] as const);
export type P4AssuranceProfile = (typeof P4_ASSURANCE_PROFILES)[number];

export const P4_EVIDENCE_CLASSIFICATIONS = Object.freeze([
  "PRESENT",
  "MISSING",
  "STALE",
  "CONTRADICTORY",
  "TARGET_MISMATCHED",
  "SCOPE_MISMATCHED",
  "INVALIDATED",
  "NOT_APPLICABLE",
] as const);
export type P4EvidenceClassification = (typeof P4_EVIDENCE_CLASSIFICATIONS)[number];

export const P4_EVIDENCE_CLASSES = Object.freeze([
  "TARGET_LOCK",
  "CANDIDATE_IDENTITY",
  "FILE_DIFF_MANIFEST",
  "FOCUSED_TESTS",
  "PACKAGE_TESTS",
  "PREDECESSOR_REGRESSION_TESTS",
  "PACKAGE_TYPECHECK",
  "MONOREPO_TYPECHECK",
  "ACCEPTANCE_COVERAGE",
  "DETERMINISTIC_BEHAVIOR",
  "HOSTILE_INPUT_TESTS",
  "PROHIBITED_CAPABILITY_SCAN",
  "SECURITY_AND_SECRET_SCAN",
  "REVIEW_FINDINGS",
  "REVIEW_THREAD_RESOLUTION",
  "APPROVAL_EVIDENCE",
  "MERGE_TOPOLOGY",
  "MAIN_SYNCHRONIZATION",
  "POST_MERGE_VALIDATION",
  "CLOSURE_EVIDENCE",
] as const);
export type P4EvidenceClass = (typeof P4_EVIDENCE_CLASSES)[number];

export type P4InputValidationResult = Readonly<{
  outcome: "PASS" | "NOT_ASSESSABLE";
  authority: "NON_AUTHORIZING";
  reasons: readonly string[];
}>;

export type P4CandidateIdentity = Readonly<{
  repository: string;
  baseBranch: string;
  baseSha: string;
  headBranch: string;
  headSha: string;
  prNumber?: number;
  commits: readonly string[];
  changedPaths: readonly string[];
  targetLockFingerprint?: string;
}>;

export type P4EvidenceBundleItem = Readonly<{
  id: string;
  evidenceClass: P4EvidenceClass;
  hash: string;
  provenance: string;
  observedAtEpochMilliseconds: number;
  fresh: boolean;
}>;

export type P4EvidenceCompletenessEntry = Readonly<{
  evidenceClass: P4EvidenceClass;
  classification: P4EvidenceClassification;
  referenceId?: string;
  hash?: string;
  details: string;
}>;

export type P4EvidenceCompletenessMatrix = Readonly<{
  authority: "NON_AUTHORIZING";
  totalClasses: number;
  presentCount: number;
  missingCount: number;
  staleCount: number;
  contradictoryCount: number;
  mismatchedCount: number;
  invalidatedCount: number;
  notApplicableCount: number;
  entries: readonly P4EvidenceCompletenessEntry[];
}>;

export type P4ResidualRisk = Readonly<{
  riskId: string;
  description: string;
  affectedProfile: P4AssuranceProfile;
  supportingEvidenceReferences: readonly string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  treatmentStatus: "ACCEPTED_BY_OWNER" | "UNRESOLVED" | "DEFERRED";
  ownerDecisionRequired: boolean;
  reassessmentTrigger: string;
  reopeningTrigger: string;
}>;

export type P4EvidenceBundle = Readonly<{
  authority: "NON_AUTHORIZING";
  candidateHash: string;
  profile: P4AssuranceProfile;
  registryId: string;
  registryFingerprint: string;
  evaluationEpochMilliseconds: number;
  items: readonly P4EvidenceBundleItem[];
  evidenceSetHash: string;
  gaps: readonly string[];
  contradictions: readonly string[];
}>;

export type P4GovernanceAssuranceInput = Readonly<{
  evaluationEpochMilliseconds: number;
  profile: P4AssuranceProfile;
  candidate: P4CandidateIdentity;
  acceptanceRegistry: unknown;
  targetLock?: unknown;
  lifecycleRegistry?: unknown;
  reconciliationInput?: unknown;
  evidenceItems: readonly unknown[];
  suppliedFacts?: unknown;
  provenance: readonly unknown[];
  residualRisks?: readonly unknown[];
}>;

const REQUIRED_KEYS = [
  "evaluationEpochMilliseconds",
  "profile",
  "candidate",
  "acceptanceRegistry",
  "evidenceItems",
  "provenance",
] as const;

const ALLOWED_KEYS = new Set([
  ...REQUIRED_KEYS,
  "targetLock",
  "lifecycleRegistry",
  "reconciliationInput",
  "suppliedFacts",
  "residualRisks",
]);

const validationResult = (
  outcome: P4InputValidationResult["outcome"],
  reasons: readonly string[]
): P4InputValidationResult =>
  Object.freeze({
    outcome,
    authority: "NON_AUTHORIZING",
    reasons: Object.freeze([...reasons].sort()),
  });

const withinBounds = (value: unknown, depth = 0, currentKey?: string): boolean => {
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= P4_BOUNDS.MAX_STRING_LENGTH;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || depth > P4_BOUNDS.MAX_DEPTH) return false;
  if (Array.isArray(value)) {
    const maxItems =
      currentKey === "changedPaths"
        ? P4_BOUNDS.MAX_CHANGED_PATHS
        : currentKey === "commits"
        ? P4_BOUNDS.MAX_COMMITS
        : currentKey === "evidenceItems"
        ? P4_BOUNDS.MAX_EVIDENCE_ITEMS
        : P4_BOUNDS.MAX_COLLECTION_ITEMS;
    return (
      value.length <= maxItems &&
      value.every((entry) => withinBounds(entry, depth + 1, undefined))
    );
  }
  const keys = Object.keys(value as Record<string, unknown>);
  return (
    keys.length <= P4_BOUNDS.MAX_OBJECT_KEYS &&
    keys.every((key) => withinBounds((value as Record<string, unknown>)[key], depth + 1, key))
  );
};

const uniqueItemIds = (items: readonly unknown[]): boolean => {
  const ids = items.map((item) => {
    const inspected = inspectRecordSnapshot(item);
    return inspected.valid && typeof inspected.snapshot.id === "string"
      ? (inspected.snapshot.id as string)
      : "";
  });
  return ids.every(Boolean) && new Set(ids).size === ids.length;
};

const validateCandidateIdentityShape = (candidate: unknown): boolean => {
  const inspected = inspectRecordSnapshot(candidate);
  if (!inspected.valid) return false;
  const c = inspected.snapshot as Record<string, unknown>;

  if (typeof c.repository !== "string" || c.repository.trim().length === 0 || c.repository.length > P4_BOUNDS.MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof c.baseBranch !== "string" || c.baseBranch.trim().length === 0 || c.baseBranch.length > P4_BOUNDS.MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof c.headBranch !== "string" || c.headBranch.trim().length === 0 || c.headBranch.length > P4_BOUNDS.MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof c.baseSha !== "string" || !/^[0-9a-fA-F]{40}$/.test(c.baseSha)) {
    return false;
  }
  if (typeof c.headSha !== "string" || !/^[0-9a-fA-F]{40}$/.test(c.headSha)) {
    return false;
  }
  if (c.prNumber !== undefined && (typeof c.prNumber !== "number" || !Number.isInteger(c.prNumber) || c.prNumber < 1)) {
    return false;
  }
  if (c.targetLockFingerprint !== undefined && (typeof c.targetLockFingerprint !== "string" || c.targetLockFingerprint.length > P4_BOUNDS.MAX_STRING_LENGTH)) {
    return false;
  }

  if (!Array.isArray(c.commits) || c.commits.length > P4_BOUNDS.MAX_COMMITS) {
    return false;
  }
  for (const commit of c.commits) {
    if (typeof commit !== "string" || commit.trim().length === 0 || commit.length > P4_BOUNDS.MAX_STRING_LENGTH) {
      return false;
    }
  }

  if (!Array.isArray(c.changedPaths) || c.changedPaths.length > P4_BOUNDS.MAX_CHANGED_PATHS) {
    return false;
  }
  for (const p of c.changedPaths) {
    if (typeof p !== "string" || p.trim().length === 0 || p.length > P4_BOUNDS.MAX_STRING_LENGTH) {
      return false;
    }
  }

  return true;
};

export const validateP4GovernanceAssuranceInput = (
  input: unknown
): P4InputValidationResult => {
  const inspected = inspectRecordSnapshot(input);
  if (!inspected.valid) {
    return validationResult("NOT_ASSESSABLE", ["P4_INPUT_UNVERIFIABLE"]);
  }
  const value = inspected.snapshot as unknown as Record<string, unknown>;
  const keys = Object.keys(value);
  if (REQUIRED_KEYS.some((req) => !keys.includes(req))) {
    return validationResult("NOT_ASSESSABLE", ["P4_INPUT_REQUIRED_FIELD_MISSING"]);
  }
  if (keys.some((key) => !ALLOWED_KEYS.has(key))) {
    return validationResult("NOT_ASSESSABLE", ["P4_INPUT_UNEXPECTED_FIELD"]);
  }
  if (!withinBounds(value)) {
    return validationResult("NOT_ASSESSABLE", ["P4_INPUT_BOUND_EXCEEDED"]);
  }
  if (!validateCandidateIdentityShape(value.candidate)) {
    return validationResult("NOT_ASSESSABLE", ["P4_CANDIDATE_INVALID"]);
  }
  if (
    typeof value.evaluationEpochMilliseconds !== "number" ||
    !Number.isFinite(value.evaluationEpochMilliseconds) ||
    value.evaluationEpochMilliseconds < 0
  ) {
    return validationResult("NOT_ASSESSABLE", ["P4_EVALUATION_EPOCH_INVALID"]);
  }
  if (!P4_ASSURANCE_PROFILES.includes(value.profile as P4AssuranceProfile)) {
    return validationResult("NOT_ASSESSABLE", ["P4_PROFILE_INVALID"]);
  }
  if (
    !Array.isArray(value.evidenceItems) ||
    value.evidenceItems.length > P4_BOUNDS.MAX_EVIDENCE_ITEMS ||
    !uniqueItemIds(value.evidenceItems)
  ) {
    return validationResult("NOT_ASSESSABLE", ["P4_EVIDENCE_ITEMS_INVALID"]);
  }
  if (
    !Array.isArray(value.provenance) ||
    value.provenance.length > P4_BOUNDS.MAX_PROVENANCE_ENTRIES
  ) {
    return validationResult("NOT_ASSESSABLE", ["P4_PROVENANCE_INVALID"]);
  }
  if (value.residualRisks !== undefined) {
    if (
      !Array.isArray(value.residualRisks) ||
      value.residualRisks.length > P4_BOUNDS.MAX_RESIDUAL_RISKS
    ) {
      return validationResult("NOT_ASSESSABLE", ["P4_RESIDUAL_RISKS_INVALID"]);
    }
    for (const risk of value.residualRisks) {
      const rInspected = inspectRecordSnapshot(risk);
      if (
        !rInspected.valid ||
        typeof rInspected.snapshot.riskId !== "string" ||
        rInspected.snapshot.riskId.trim().length === 0 ||
        rInspected.snapshot.riskId.length > P4_BOUNDS.MAX_STRING_LENGTH
      ) {
        return validationResult("NOT_ASSESSABLE", ["P4_RESIDUAL_RISKS_INVALID"]);
      }
    }
  }
  return validationResult("PASS", []);
};
