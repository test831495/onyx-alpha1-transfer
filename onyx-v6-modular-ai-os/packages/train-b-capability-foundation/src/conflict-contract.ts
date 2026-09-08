export const CONFLICT_KINDS = [
  "CAPABILITY_CONFLICT",
  "REQUIREMENT_CONFLICT",
  "DATA_CLASS_CONFLICT",
  "FRESHNESS_CONFLICT",
  "PRIVACY_CONFLICT",
  "REGION_CONFLICT",
  "COST_CONFLICT",
  "ACCOUNT_SCOPE_CONFLICT",
  "LIFECYCLE_CONFLICT",
  "VERSION_CONFLICT",
  "DEPENDENCY_CONFLICT",
  "UNKNOWN_CONFLICT",
] as const;
export type ConflictKind = (typeof CONFLICT_KINDS)[number];

export const CONFLICT_SEVERITY = ["INFO", "WARNING", "BLOCKING"] as const;
export type ConflictSeverity = (typeof CONFLICT_SEVERITY)[number];

export const CONFLICT_RESOLUTION_DISPOSITIONS = [
  "NO_CONFLICT",
  "REQUIRES_CLARIFICATION",
  "REQUIRES_POLICY_DECISION",
  "BLOCKED",
  "PARTIAL_ALLOWED",
  "NOT_ASSESSABLE",
] as const;
export type ConflictResolutionDisposition = (typeof CONFLICT_RESOLUTION_DISPOSITIONS)[number];

export interface ConflictRecord {
  readonly id: string;
  readonly kind: ConflictKind;
  readonly severity: ConflictSeverity;
  readonly title: string;
  readonly detail: string;
  readonly evidenceIds: readonly string[];
  readonly resolution: ConflictResolutionDisposition;
  readonly nonAuthorizing: true;
}

export interface ConflictEvaluationResult {
  readonly disposition: ConflictResolutionDisposition;
  readonly conflicts: readonly ConflictRecord[];
  readonly suggestions: readonly string[];
}

export function evaluateConflicts(conflicts: readonly ConflictRecord[]): ConflictEvaluationResult {
  if (!Array.isArray(conflicts)) {
    return Object.freeze({ disposition: "NOT_ASSESSABLE", conflicts: Object.freeze([]), suggestions: Object.freeze([]) });
  }
  const ordered = [...conflicts].sort((a, b) => a.id.localeCompare(b.id));
  const blocking = ordered.some((conflict) => conflict.severity === "BLOCKING" && conflict.kind === "PRIVACY_CONFLICT");
  const disposition: ConflictResolutionDisposition = blocking ? "BLOCKED" : ordered.length > 0 ? "REQUIRES_CLARIFICATION" : "NO_CONFLICT";
  return Object.freeze({
    disposition,
    conflicts: Object.freeze(ordered),
    suggestions: Object.freeze(ordered.map((conflict) => `review ${conflict.id}: ${conflict.title}`)),
  });
}
