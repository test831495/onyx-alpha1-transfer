import { cloneFreeze, isSafeRecord } from "./factory-constitution";
export const EVIDENCE_STATUSES = ["OBSERVED", "REPORTED", "VERIFIED", "ACCEPTED", "SUPERSEDED", "STALE", "CONFLICTING", "MISSING", "NOT_APPLICABLE", "NOT_ASSESSABLE"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];
export const REVIEW_STATUSES = ["UNREVIEWED", "INDEPENDENTLY_REVIEWED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const AUTHORITY_STATUSES = ["NON_AUTHORIZING", "EXTERNALLY_ACCEPTED"] as const;
export type AuthorityStatus = (typeof AUTHORITY_STATUSES)[number];
export type EvidenceRecord = Readonly<Record<string, unknown>>;
export const freezeEvidenceRecord = (record: Record<string, unknown>): EvidenceRecord => cloneFreeze(record);
export const isValidEvidenceRecord = (input: unknown): input is EvidenceRecord => {
	if (!isSafeRecord(input)) return false;
	const value = input as Record<string, unknown>;
	const common = ["evidenceId", "status", "subject", "sourceOrigin", "sourceLocator", "baseline", "provenance", "digest", "validationMethod", "validationResult", "completenessStatus", "freshnessPolicy", "observedAt", "authorityStatus", "reviewStatus"];
	const accepted = ["externalDecisionId", "acceptedBy", "acceptedAt", "externalReviewEvidence"];
	const historical = value.status === "SUPERSEDED" ? ["supersedes"] : value.status === "STALE" ? ["staleReason", "expiresAt"] : value.status === "CONFLICTING" ? ["contradictionIds"] : value.status === "MISSING" ? ["absenceReason"] : value.status === "NOT_APPLICABLE" ? ["applicabilityReason"] : value.status === "NOT_ASSESSABLE" ? ["assessmentLimitationReason"] : [];
	const allowed = value.status === "ACCEPTED" ? [...common, ...accepted] : [...common, ...historical];
	if (Object.keys(value).length !== allowed.length || Object.keys(value).some((key) => !allowed.includes(key))) return false;
	if (!["evidenceId", "subject", "sourceOrigin", "sourceLocator", "provenance", "digest", "validationMethod", "completenessStatus", "freshnessPolicy", "observedAt"].every((key) => typeof value[key] === "string" && String(value[key]).trim() !== "" && String(value[key]).length <= 4096)) return false;
	if (!EVIDENCE_STATUSES.includes(value.status as EvidenceStatus) || !ISO.test(String(value.observedAt)) || Number.isNaN(Date.parse(String(value.observedAt)))) return false;
	if (value.authorityStatus !== "NON_AUTHORIZING" && value.authorityStatus !== "EXTERNALLY_ACCEPTED") return false;
	if (value.reviewStatus !== "UNREVIEWED" && value.reviewStatus !== "INDEPENDENTLY_REVIEWED") return false;
	if (value.status !== "ACCEPTED" && value.authorityStatus !== "NON_AUTHORIZING") return false;
	const validIds = (key: string): boolean => Array.isArray(value[key]) && value[key].length > 0 && value[key].every((id) => typeof id === "string" && /^[A-Za-z0-9._:-]+$/.test(id) && id !== value.evidenceId) && new Set(value[key] as unknown[]).size === (value[key] as unknown[]).length;
	const validReason = (key: string): boolean => typeof value[key] === "string" && String(value[key]).trim() !== "" && String(value[key]).length <= 256 && !/^(?:TODO|TBD|UNKNOWN|N\/A|NONE)$/i.test(String(value[key]));
	if (value.status === "SUPERSEDED" && !validIds("supersedes")) return false;
	if (value.status === "CONFLICTING" && !validIds("contradictionIds")) return false;
	if (value.status === "STALE" && (!validReason("staleReason") || typeof value.expiresAt !== "string" || !ISO.test(value.expiresAt) || Number.isNaN(Date.parse(value.expiresAt)))) return false;
	if (value.status === "MISSING" && (!validReason("absenceReason") || value.sourceLocator !== "NOT_AVAILABLE" || value.digest !== "NOT_AVAILABLE")) return false;
	if (value.status === "NOT_APPLICABLE" && !validReason("applicabilityReason")) return false;
	if (value.status === "NOT_ASSESSABLE" && !validReason("assessmentLimitationReason")) return false;
	if (value.status === "ACCEPTED") return value.authorityStatus === "EXTERNALLY_ACCEPTED" && accepted.every((key) => typeof value[key] === "string" && String(value[key]).trim() !== "") && ISO.test(String(value.acceptedAt)) && !Number.isNaN(Date.parse(String(value.acceptedAt))) && /^[0-9a-f]{40}$/.test(String(value.baseline)) && !String(value.sourceOrigin).includes("FACTORY");
	if (value.status === "VERIFIED") {
		const placeholders = /^(?:TODO|TBD|UNKNOWN|PASSED)$/i;
		return /^[0-9a-f]{40}$/.test(String(value.baseline)) && !placeholders.test(String(value.validationMethod)) && isSafeRecord(value.validationResult) && !placeholders.test(String(value.sourceLocator)) && !placeholders.test(String(value.provenance)) && value.completenessStatus === "COMPLETE" && (value.validationResult as Record<string, unknown>).outcome === "VALID" && !/^0+$/.test(String(value.digest));
	}
	return true;
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
