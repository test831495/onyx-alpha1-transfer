import { cloneFreeze, isSafeRecord } from "./factory-constitution";
export const CONTINUITY_SOURCE_STATUSES = ["REPOSITORY_OBSERVED", "EXTERNALLY_SUPPLIED", "DETERMINISTICALLY_VERIFIED", "GOVERNANCE_ACCEPTED", "MISSING", "STALE", "CONFLICTING", "NOT_ASSESSABLE"] as const;
export type ContinuitySourceStatus = (typeof CONTINUITY_SOURCE_STATUSES)[number];
export type ContinuityDraft = Readonly<Record<string, unknown>>;
export const freezeContinuityDraft = (value: Record<string, unknown>): ContinuityDraft => cloneFreeze(value);
export const isValidContinuityDraft = (input: unknown): boolean => {
  if (!isSafeRecord(input)) return false;
  const value = input as Record<string, unknown>;
  if (value.authorityStatus !== "NON_AUTHORIZING" || value.reviewStatus !== "UNREVIEWED" || value.promotedToAuthoritative !== false) return false;
  if (Object.keys(value).length !== 4 || !Array.isArray(value.entries)) return false;
  return (value.entries as unknown[]).every((entry) => isSafeRecord(entry) && Object.keys(entry).every((key) => ["entryId", "subject", "sourceStatus", "sourceLocator", "baseline", "provenance", "evidenceReferences", "timestamp", "freshnessRule", "authorityStatus", "reviewStatus", "promotedToAuthoritative", "externalAcceptedDecisionId", "acceptedBy", "acceptedAt", "decisionSourceLocator", "digest"].includes(key)) && typeof entry.entryId === "string" && typeof entry.subject === "string" && CONTINUITY_SOURCE_STATUSES.includes((entry as Record<string, unknown>).sourceStatus as ContinuitySourceStatus) && typeof entry.provenance === "string" && Array.isArray(entry.evidenceReferences) && entry.authorityStatus === "NON_AUTHORIZING" && entry.reviewStatus === "UNREVIEWED" && entry.promotedToAuthoritative === false && ((entry.sourceStatus !== "GOVERNANCE_ACCEPTED") || (typeof entry.externalAcceptedDecisionId === "string" && typeof entry.acceptedBy === "string" && typeof entry.acceptedAt === "string" && typeof entry.decisionSourceLocator === "string" && typeof entry.digest === "string" && /^[0-9a-f]{40}$/.test(String(entry.baseline)))));
};
