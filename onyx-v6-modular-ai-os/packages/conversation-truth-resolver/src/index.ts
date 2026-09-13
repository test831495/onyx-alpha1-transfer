export const RESOLVER_VERSION = "B4A-1" as const;
export const REQUEST_VERSION = "1" as const;

export const CLAIM_TYPES = [
  "CALENDAR_EVENT", "MAIL_METADATA", "PR_STATE", "CHECK_STATUS",
  "CURRENT_PROJECT_READINESS", "OWNER_DECISION", "PUBLIC_TECHNICAL_FACT",
  "GENERAL_EXPLANATION", "GENERATED_RECOMMENDATION",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const TRUTH_SOURCE_CLASSES = [
  "DETERMINISTIC_LOCAL", "CONNECTOR_GROUNDED", "CURRENT_GOVERNANCE",
  "STRATEGIC_MEMORY", "PUBLIC_EXTERNAL", "GENERATED_GENERAL", "UNAVAILABLE",
  "UNKNOWN", "CONFLICTING",
] as const;
export type TruthSourceClass = (typeof TRUTH_SOURCE_CLASSES)[number];

export const UNCERTAINTY_CLASSES = [
  "KNOWN", "MOSTLY_KNOWN", "PARTIAL", "UNKNOWN", "STALE", "CONFLICTING", "NOT_ASSESSABLE",
] as const;
export type UncertaintyClass = (typeof UNCERTAINTY_CLASSES)[number];

export const CONFLICT_TYPES = [
  "DIRECT_VALUE_CONFLICT", "ASSERTION_DENIAL_CONFLICT", "STATUS_CONFLICT",
  "TEMPORAL_CONFLICT", "SCOPE_CONFLICT", "ACCOUNT_CONFLICT", "PROVENANCE_CONFLICT",
  "FRESHNESS_CONFLICT", "COMPLETENESS_CONFLICT", "AUTHORITY_CONFLICT",
] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

export const FALLBACK_POLICIES = [
  "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", "ALLOW_LOWER_CLASS_WITH_DISCLOSURE",
  "RETURN_PARTIAL", "RETURN_NOT_ASSESSABLE",
] as const;
export type FallbackPolicy = (typeof FALLBACK_POLICIES)[number];

export const BOUNDS = Object.freeze({
  MAX_EVIDENCE: 64,
  MAX_SELECTED: 16,
  MAX_REJECTED: 64,
  MAX_REASONS: 8,
  MAX_STRING: 256,
});

const REASON_CODES = [
  "CLAIM_MISMATCH", "ACCOUNT_MISMATCH", "PURPOSE_MISMATCH", "SCOPE_MISMATCH",
  "PRIVACY_INELIGIBLE", "INTEGRITY_FAILURE", "STALE_EVIDENCE", "REVOKED_EVIDENCE",
  "SUPERSEDED_EVIDENCE", "MISSING_PROVENANCE", "UNTRUSTED_CONTENT", "SCHEMA_FAILURE",
  "AUTHORITY_INELIGIBLE", "UNSUPPORTED_EVIDENCE_CLASS",
] as const;
type ReasonCode = (typeof REASON_CODES)[number];

type Freshness = "CURRENT" | "STALE" | "UNKNOWN";
type Provenance = "COMPLETE" | "INCOMPLETE" | "UNKNOWN";
type Integrity = "VERIFIED" | "FAILED" | "UNKNOWN";
type Privacy = "ELIGIBLE" | "INELIGIBLE" | "UNKNOWN";

export type EvidenceItem = Readonly<{
  evidenceId: string;
  claimType: ClaimType;
  subject: string;
  predicate: string;
  valueFingerprint: string;
  truthSourceClass: TruthSourceClass;
  purpose: string;
  scope: string;
  freshness: Freshness;
  provenance: Provenance;
  integrity: Integrity;
  privacy: Privacy;
  directness: number;
  specificity: number;
  account?: string;
  revoked?: boolean;
  superseded?: boolean;
  untrusted?: boolean;
}>;

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= BOUNDS.MAX_STRING;
const enumValue = <T extends readonly string[]>(values: T, value: unknown): T[number] => {
  if (typeof value === "string" && (values as readonly string[]).includes(value)) return value as T[number];
  throw new Error("SCHEMA_FAILURE");
};

export function createEvidenceItem(input: Record<string, unknown>): EvidenceItem {
  if ("rawContent" in input || "rawPayload" in input || "body" in input || "content" in input) throw new Error("PROHIBITED_FIELD");
  if (typeof input.claimType !== "string" || !(CLAIM_TYPES as readonly string[]).includes(input.claimType)) throw new Error("UNKNOWN_CLAIM_TYPE");
  const claimType = enumValue(CLAIM_TYPES, input.claimType);
  const truthSourceClass = enumValue(TRUTH_SOURCE_CLASSES, input.truthSourceClass);
  const item: EvidenceItem = {
    evidenceId: isString(input.evidenceId) ? input.evidenceId : `evidence-${claimType}`,
    claimType,
    subject: isString(input.subject) ? input.subject : "unknown",
    predicate: isString(input.predicate) ? input.predicate : "asserts",
    valueFingerprint: isString(input.valueFingerprint) ? input.valueFingerprint : "unknown",
    truthSourceClass,
    purpose: isString(input.purpose) ? input.purpose : "unknown",
    scope: isString(input.scope) ? input.scope : "unknown",
    freshness: enumValue(["CURRENT", "STALE", "UNKNOWN"] as const, input.freshness ?? "UNKNOWN"),
    provenance: enumValue(["COMPLETE", "INCOMPLETE", "UNKNOWN"] as const, input.provenance ?? "UNKNOWN"),
    integrity: enumValue(["VERIFIED", "FAILED", "UNKNOWN"] as const, input.integrity ?? "UNKNOWN"),
    privacy: enumValue(["ELIGIBLE", "INELIGIBLE", "UNKNOWN"] as const, input.privacy ?? "UNKNOWN"),
    directness: typeof input.directness === "number" && Number.isFinite(input.directness) ? input.directness : 0,
    specificity: typeof input.specificity === "number" && Number.isFinite(input.specificity) ? input.specificity : 0,
    ...(isString(input.account) ? { account: input.account } : {}),
    ...(typeof input.revoked === "boolean" ? { revoked: input.revoked } : {}),
    ...(typeof input.superseded === "boolean" ? { superseded: input.superseded } : {}),
    ...(typeof input.untrusted === "boolean" ? { untrusted: input.untrusted } : {}),
  };
  return deepFreeze(item);
}

type Policy = Readonly<{ precedence: readonly TruthSourceClass[]; fallback: FallbackPolicy; currentOnly: boolean }>;
const claimPolicies: Readonly<Record<ClaimType, Policy>> = Object.freeze({
  CALENDAR_EVENT: { precedence: ["CONNECTOR_GROUNDED"], fallback: "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", currentOnly: true },
  MAIL_METADATA: { precedence: ["CONNECTOR_GROUNDED"], fallback: "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", currentOnly: true },
  PR_STATE: { precedence: ["CONNECTOR_GROUNDED"], fallback: "RETURN_NOT_ASSESSABLE", currentOnly: true },
  CHECK_STATUS: { precedence: ["CONNECTOR_GROUNDED"], fallback: "RETURN_NOT_ASSESSABLE", currentOnly: true },
  CURRENT_PROJECT_READINESS: { precedence: ["CURRENT_GOVERNANCE", "CONNECTOR_GROUNDED", "DETERMINISTIC_LOCAL"], fallback: "RETURN_NOT_ASSESSABLE", currentOnly: true },
  OWNER_DECISION: { precedence: ["CURRENT_GOVERNANCE", "STRATEGIC_MEMORY"], fallback: "RETURN_NOT_ASSESSABLE", currentOnly: true },
  PUBLIC_TECHNICAL_FACT: { precedence: ["PUBLIC_EXTERNAL"], fallback: "ALLOW_LOWER_CLASS_WITH_DISCLOSURE", currentOnly: false },
  GENERAL_EXPLANATION: { precedence: ["PUBLIC_EXTERNAL", "GENERATED_GENERAL"], fallback: "ALLOW_LOWER_CLASS_WITH_DISCLOSURE", currentOnly: false },
  GENERATED_RECOMMENDATION: { precedence: [], fallback: "RETURN_NOT_ASSESSABLE", currentOnly: true },
});

export type ResolutionRequest = Readonly<{
  requestVersion: string;
  claimType: ClaimType;
  purpose: string;
  scope: string;
  account?: string;
  evidence: readonly EvidenceItem[];
}>;

export type TruthResolutionReceipt = Readonly<{
  resolverVersion: string;
  requestVersion: string;
  policyVersion: string;
  claimType: ClaimType;
  resolutionStatus: "RESOLVED" | "UNAVAILABLE" | "NOT_ASSESSABLE" | "CONFLICTING";
  truthSourceClass: TruthSourceClass;
  uncertaintyClass: UncertaintyClass;
  selectedEvidenceIds: readonly string[];
  rejectedEvidenceIds: readonly string[];
  rejectionReasons: Readonly<Record<string, readonly ReasonCode[]>>;
  evidenceClassDecision: string;
  conflictTypes: readonly ConflictType[];
  materialConflict: boolean;
  assumptions: readonly string[];
  limitations: readonly string[];
  missingEvidenceClasses: readonly TruthSourceClass[];
  fallbackUsed: boolean;
  provenanceComplete: boolean;
  privacyResult: "ELIGIBLE" | "NOT_ELIGIBLE" | "UNKNOWN";
  replayEvidence: string;
  nonAuthority: true;
  executionAuthorized: false;
  approvalGranted: false;
  memoryWriteAuthorized: false;
  connectorExecutionAuthorized: false;
}>;

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function fingerprint(value: unknown): string {
  let hash = 2166136261;
  for (const char of stableStringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0") + "00000000";
}

function reject(item: EvidenceItem, request: ResolutionRequest): ReasonCode[] {
  const reasons: ReasonCode[] = [];
  if (item.claimType !== request.claimType) reasons.push("CLAIM_MISMATCH");
  if (item.purpose !== request.purpose) reasons.push("PURPOSE_MISMATCH");
  if (item.scope !== request.scope) reasons.push("SCOPE_MISMATCH");
  if (request.account !== undefined && item.account !== request.account) reasons.push("ACCOUNT_MISMATCH");
  if (item.privacy !== "ELIGIBLE") reasons.push("PRIVACY_INELIGIBLE");
  if (item.integrity !== "VERIFIED") reasons.push("INTEGRITY_FAILURE");
  if (item.provenance !== "COMPLETE") reasons.push("MISSING_PROVENANCE");
  if (item.revoked) reasons.push("REVOKED_EVIDENCE");
  if (item.superseded) reasons.push("SUPERSEDED_EVIDENCE");
  if (item.untrusted) reasons.push("UNTRUSTED_CONTENT");
  return reasons.slice(0, BOUNDS.MAX_REASONS);
}

function conflictType(claim: ClaimType): ConflictType {
  if (claim === "PR_STATE" || claim === "CHECK_STATUS") return "STATUS_CONFLICT";
  if (claim === "CALENDAR_EVENT") return "TEMPORAL_CONFLICT";
  return "DIRECT_VALUE_CONFLICT";
}

export function resolveTruth(request: ResolutionRequest): TruthResolutionReceipt {
  const policy = claimPolicies[request.claimType];
  if (!policy || request.requestVersion !== REQUEST_VERSION || request.evidence.length > BOUNDS.MAX_EVIDENCE) throw new Error("SCHEMA_FAILURE");
  const eligible: EvidenceItem[] = [];
  const rejectedEvidenceIds: string[] = [];
  const rejectionReasons: Record<string, readonly ReasonCode[]> = {};
  for (const item of request.evidence) {
    const reasons = reject(item, request);
    if (reasons.length || !policy.precedence.includes(item.truthSourceClass) || (policy.currentOnly && item.freshness !== "CURRENT")) {
      rejectedEvidenceIds.push(item.evidenceId);
      rejectionReasons[item.evidenceId] = Object.freeze(reasons.length ? reasons : [policy.currentOnly ? "STALE_EVIDENCE" : "UNSUPPORTED_EVIDENCE_CLASS"]);
    } else eligible.push(item);
  }
  const missingEvidenceClasses = Object.freeze(policy.precedence.filter((source) => !eligible.some((item) => item.truthSourceClass === source)));
  const staleOnly = eligible.length === 0 && request.evidence.some((item) => item.claimType === request.claimType && item.freshness === "STALE");
  const selectedClass = policy.precedence.find((source) => eligible.some((item) => item.truthSourceClass === source));
  const candidates = eligible.filter((item) => item.truthSourceClass === selectedClass).sort((a, b) =>
    Number(b.directness) - Number(a.directness) || Number(b.specificity) - Number(a.specificity) || a.evidenceId.localeCompare(b.evidenceId));
  const conflict = candidates.length > 1 && new Set(candidates.map((item) => item.valueFingerprint)).size > 1;
  const conflicts = conflict ? Object.freeze([conflictType(request.claimType)]) : Object.freeze([] as ConflictType[]);
  const uncertaintyClass: UncertaintyClass = conflict ? "CONFLICTING" : selectedClass ? "KNOWN" : staleOnly ? "STALE" : "UNKNOWN";
  const status: TruthResolutionReceipt["resolutionStatus"] = conflict ? "CONFLICTING" : selectedClass ? "RESOLVED" : policy.fallback === "RETURN_NOT_ASSESSABLE" ? "NOT_ASSESSABLE" : "UNAVAILABLE";
  const privacyResult: TruthResolutionReceipt["privacyResult"] = selectedClass ? "ELIGIBLE" : "UNKNOWN";
  const selectedEvidenceIds = Object.freeze(conflict ? [] : candidates.slice(0, BOUNDS.MAX_SELECTED).map((item) => item.evidenceId));
  const receipt = {
    resolverVersion: RESOLVER_VERSION, requestVersion: request.requestVersion, policyVersion: RESOLVER_VERSION,
    claimType: request.claimType, resolutionStatus: status, truthSourceClass: conflict ? "CONFLICTING" : selectedClass ?? "UNAVAILABLE",
    uncertaintyClass, selectedEvidenceIds, rejectedEvidenceIds: Object.freeze(rejectedEvidenceIds.slice(0, BOUNDS.MAX_REJECTED)),
    rejectionReasons: Object.freeze(rejectionReasons), evidenceClassDecision: selectedClass ?? "NONE", conflictTypes: conflicts,
    materialConflict: conflict, assumptions: Object.freeze([] as string[]), limitations: Object.freeze([] as string[]),
    missingEvidenceClasses, fallbackUsed: !selectedClass, provenanceComplete: selectedClass ? candidates.every((item) => item.provenance === "COMPLETE") : false,
    privacyResult, replayEvidence: "", nonAuthority: true as const,
    executionAuthorized: false as const, approvalGranted: false as const, memoryWriteAuthorized: false as const, connectorExecutionAuthorized: false as const,
  };
  return deepFreeze({ ...receipt, replayEvidence: fingerprint({ ...receipt, replayEvidence: undefined }) });
}