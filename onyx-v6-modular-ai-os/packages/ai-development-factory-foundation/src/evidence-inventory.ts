import { cloneFreeze } from "./factory-constitution";
import type { EvidenceRecord } from "./evidence-record";
import { isValidEvidenceRecord } from "./evidence-record";
export type EvidenceInventory = Readonly<{ records: readonly EvidenceRecord[]; byStatus: Readonly<Record<string, number>>; duplicateIds: readonly string[]; conflicts: readonly EvidenceRecord[]; stale: readonly EvidenceRecord[]; missing: readonly EvidenceRecord[]; invalid: readonly EvidenceRecord[]; observed: readonly EvidenceRecord[]; reported: readonly EvidenceRecord[]; verified: readonly EvidenceRecord[]; externallyAccepted: readonly EvidenceRecord[]; expired: readonly EvidenceRecord[]; sensitiveExcluded: readonly EvidenceRecord[]; authorityStatus: "NON_AUTHORIZING" }>;
// EXPIRED is intentionally not an EvidenceStatus; expiry is derived from STALE records plus their expiresAt fact against an explicit evaluation time.
const EVALUATION_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const isValidEvaluationTime = (value: unknown): value is string => typeof value === "string" && EVALUATION_TIME.test(value) && !Number.isNaN(Date.parse(value));
export const projectEvidenceInventory = (records: readonly EvidenceRecord[], evaluationTime: string): EvidenceInventory => {
  if (!isValidEvaluationTime(evaluationTime)) throw new Error("INVALID_EVALUATION_TIME");
  const evaluationTimestamp = Date.parse(evaluationTime);
  const sorted = [...records].sort((a, b) => String(a.evidenceId).localeCompare(String(b.evidenceId)));
  const ids = sorted.map((record) => String(record.evidenceId));
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const byStatus: Record<string, number> = Object.create(null);
  for (const record of sorted) byStatus[String(record.status)] = (byStatus[String(record.status)] ?? 0) + 1;
  const valid = sorted.filter(isValidEvidenceRecord);
  const stale = valid.filter((r) => r.status === "STALE");
  const expired = stale.filter((r) => isValidEvaluationTime(r.expiresAt) && Date.parse(String(r.expiresAt)) <= evaluationTimestamp);
  return cloneFreeze({ records: sorted, byStatus, duplicateIds: [...new Set(duplicateIds)], invalid: sorted.filter((r) => !isValidEvidenceRecord(r)), observed: valid.filter((r) => r.status === "OBSERVED"), reported: valid.filter((r) => r.status === "REPORTED"), verified: valid.filter((r) => r.status === "VERIFIED"), externallyAccepted: valid.filter((r) => r.status === "ACCEPTED"), conflicts: valid.filter((r) => r.status === "CONFLICTING"), stale, expired, missing: valid.filter((r) => r.status === "MISSING"), sensitiveExcluded: valid.filter((r) => r.status === "NOT_ASSESSABLE"), authorityStatus: "NON_AUTHORIZING" as const });
};
