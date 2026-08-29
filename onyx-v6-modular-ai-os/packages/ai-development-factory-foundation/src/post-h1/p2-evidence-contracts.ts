export type P2ValidationOutcome = "MATCH" | "DRIFT_DETECTED" | "NOT_ASSESSABLE";

export const P2_REASON_CODES = Object.freeze([
  "TARGET_MISMATCH",
  "EVIDENCE_UNAVAILABLE",
  "EVIDENCE_STALE",
  "EVIDENCE_INCOMPLETE",
  "SOURCE_NOT_AUTHENTICATED",
  "SOURCE_NOT_AUTHORIZED_FOR_COLLECTION",
  "PAGINATION_INCOMPLETE",
  "RATE_LIMITED",
  "RULESET_NOT_VISIBLE",
  "CHECK_STATE_AMBIGUOUS",
  "REVIEW_STATE_DRIFT",
  "NORMALIZATION_FAILED",
  "PROVIDER_UNAVAILABLE",
  "MANIFEST_MISMATCH",
  "RECONCILIATION_CONFLICT",
  "ACCEPTANCE_COVERAGE_INCOMPLETE",
  "THREAD_UNRESOLVED",
  "CHECK_PENDING",
  "FINDING_OPEN",
] as const);

export type P2ReasonCode = (typeof P2_REASON_CODES)[number];

export interface EvidenceSourceDescriptor {
  readonly provider: string;
  readonly collectorId: string;
  readonly version: string;
  readonly capturedAtEpochMilliseconds: number;
}

export interface CollectedEvidenceEnvelope {
  readonly source: EvidenceSourceDescriptor;
  readonly rawFactType: string;
  readonly rawPayload: string;
  readonly payloadHash: string;
}

export interface NormalizedRepositoryFacts {
  readonly owner: string;
  readonly repository: string;
  readonly defaultBranch: string;
  readonly currentHeadSha: string;
  readonly isClean: boolean;
}

export interface NormalizedPullRequestFacts {
  readonly prNumber: number;
  readonly state: "OPEN" | "CLOSED" | "MERGED";
  readonly headSha: string;
  readonly baseBranch: string;
  readonly isDraft: boolean;
  readonly title: string;
}

export interface NormalizedReviewFacts {
  readonly totalReviews: number;
  readonly approvedCount: number;
  readonly changesRequestedCount: number;
  readonly reviewState: "APPROVED" | "CHANGES_REQUESTED" | "PENDING" | "NO_REVIEWS";
}

export interface NormalizedReviewThreadFacts {
  readonly totalThreads: number;
  readonly resolvedThreads: number;
  readonly unresolvedThreads: number;
  readonly canResolveAll: boolean;
}

export interface NormalizedCheckFacts {
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly pendingChecks: number;
  readonly overallStatus: "SUCCESS" | "FAILURE" | "PENDING";
}

export interface NormalizedAcceptanceFacts {
  readonly totalRequiredIds: number;
  readonly validatedIds: number;
  readonly missingIds: readonly string[];
  readonly coverageComplete: boolean;
}

export interface EvidenceFreshnessAssessment {
  readonly observedAtEpochMilliseconds: number;
  readonly maxAgeMilliseconds: number;
  readonly ageMilliseconds: number;
  readonly isFresh: boolean;
}

export interface LifecycleDriftDetail {
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
  readonly severity: "BLOCKING" | "WARNING";
}

export interface LifecycleDriftReport {
  readonly outcome: P2ValidationOutcome;
  readonly driftCount: number;
  readonly details: readonly LifecycleDriftDetail[];
  readonly reasons: readonly P2ReasonCode[];
  readonly authority: "NON_AUTHORIZING";
}

export interface GovernanceReconciliationResult {
  readonly outcome: P2ValidationOutcome;
  readonly readinessAssessment: unknown;
  readonly closureAssessment: unknown;
  readonly authority: "NON_AUTHORIZING";
}

export interface EvidenceManifestProjection {
  readonly manifestHash: string;
  readonly targetHash: string;
  readonly rawEvidenceHashes: readonly string[];
  readonly normalizedFactHash: string;
  readonly p1InputHash: string;
  readonly p1OutputHash: string;
  readonly driftReportHash: string;
  readonly governanceResultHash: string;
  readonly freshness: EvidenceFreshnessAssessment;
  readonly isPaginationComplete: boolean;
  readonly authority: "NON_AUTHORIZING";
}

export interface ReadOnlyAutomationPlan {
  readonly pendingActions: readonly unknown[];
  readonly disclaimers: readonly string[];
  readonly authority: "NON_AUTHORIZING";
}
