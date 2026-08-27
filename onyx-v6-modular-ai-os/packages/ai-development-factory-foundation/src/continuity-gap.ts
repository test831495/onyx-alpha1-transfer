import { cloneFreeze, isSafeRecord } from "./factory-constitution";
export const CONTINUITY_GAP_REASONS = ["MISSING_BASELINE_PROOF", "MISSING_COMMIT_PROOF", "MISSING_PULL_REQUEST_PROOF", "MISSING_REVIEW_PROOF", "MISSING_APPROVAL_PROOF", "MISSING_TEST_EVIDENCE", "MISSING_RESTORE_EVIDENCE", "MISSING_FINGERPRINT", "STALE_EVIDENCE", "CONFLICTING_EVIDENCE", "EXPIRED_EVIDENCE", "INACCESSIBLE_SOURCE", "UNSUPPORTED_EVIDENCE_FORMAT", "REPRESENTATION_OVERFLOW", "UNKNOWN_CAPABILITY", "UNKNOWN_POLICY", "AUDIT_UNAVAILABLE", "REVIEWER_INDEPENDENCE_NOT_PROVEN", "SENSITIVE_EVIDENCE_EXCLUDED", "DETERMINISTIC_VERIFICATION_UNAVAILABLE"] as const;
export type ContinuityGapReason = (typeof CONTINUITY_GAP_REASONS)[number];
export type ContinuityGap = Readonly<Record<string, unknown>>;
export const freezeContinuityGap = (gap: Record<string, unknown>): ContinuityGap => cloneFreeze(gap);
export const REPRESENTATION_LIMIT = 1000 as const;
export const BLOCKER_STATES = ["BLOCKED", "OPEN", "RESOLVED", "NOT_ASSESSABLE"] as const;
export const AUTHORITY_IMPACTS = ["NONE", "REQUIRES_OWNER", "PROHIBITS_AUTHORIZATION"] as const;
export const isValidContinuityGap = (input: unknown): input is ContinuityGap => {
	if (!isSafeRecord(input)) return false;
	const value = input as Record<string, unknown>;
	const required = ["gapId", "reasonCode", "subject", "requiredEvidence", "observedEvidence", "impact", "blockerStatus", "remediationOwner", "recheckTrigger", "provenance", "authorityImpact", "relatedEvidenceIds", "baseline", "policyVersion"];
	return Object.keys(value).length === required.length && Object.keys(value).every((key) => required.includes(key)) && ["gapId", "subject", "requiredEvidence", "observedEvidence", "impact", "remediationOwner", "recheckTrigger", "provenance", "policyVersion"].every((key) => typeof value[key] === "string" && String(value[key]).trim() !== "") && CONTINUITY_GAP_REASONS.includes(value.reasonCode as ContinuityGapReason) && Array.isArray(value.relatedEvidenceIds) && (value.relatedEvidenceIds as unknown[]).every((id) => typeof id === "string" && id.trim() !== "") && new Set(value.relatedEvidenceIds as unknown[]).size === (value.relatedEvidenceIds as unknown[]).length && BLOCKER_STATES.includes(value.blockerStatus as never) && AUTHORITY_IMPACTS.includes(value.authorityImpact as never) && /^[0-9a-f]{40}$/.test(String(value.baseline));
};
export const projectContinuityGaps = (gaps: readonly ContinuityGap[]): Readonly<{ outcome: "VALID" | "NOT_ASSESSABLE"; gaps: readonly ContinuityGap[]; reasonCode?: "REPRESENTATION_OVERFLOW"; createsAuthority: false; authorityStatus: "NON_AUTHORIZING" }> => {
	if (gaps.length > REPRESENTATION_LIMIT || gaps.some((gap) => !isValidContinuityGap(gap))) return cloneFreeze({ outcome: "NOT_ASSESSABLE" as const, gaps: [], reasonCode: "REPRESENTATION_OVERFLOW" as const, createsAuthority: false as const, authorityStatus: "NON_AUTHORIZING" as const });
	const sorted = [...gaps].sort((a, b) => String(a.gapId).localeCompare(String(b.gapId))).map((gap) => freezeContinuityGap(gap as Record<string, unknown>));
	return Object.freeze({ outcome: "VALID" as const, gaps: Object.freeze(sorted), createsAuthority: false as const, authorityStatus: "NON_AUTHORIZING" as const });
};
