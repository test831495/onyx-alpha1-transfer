import { cloneFreeze } from "./factory-constitution";
import type { EvidenceRecord } from "./evidence-record";
import { isValidEvidenceRecord } from "./evidence-record";
export type EvidenceInventory = Readonly<{ records: readonly EvidenceRecord[]; byStatus: Readonly<Record<string, number>>; duplicateIds: readonly string[]; conflicts: readonly EvidenceRecord[]; stale: readonly EvidenceRecord[]; missing: readonly EvidenceRecord[]; invalid: readonly EvidenceRecord[]; observed: readonly EvidenceRecord[]; reported: readonly EvidenceRecord[]; verified: readonly EvidenceRecord[]; externallyAccepted: readonly EvidenceRecord[]; expired: readonly EvidenceRecord[]; sensitiveExcluded: readonly EvidenceRecord[]; authorityStatus: "NON_AUTHORIZING" }>;
export const projectEvidenceInventory = (records: readonly EvidenceRecord[]): EvidenceInventory => {
  const sorted = [...records].sort((a, b) => String(a.evidenceId).localeCompare(String(b.evidenceId)));
  const ids = sorted.map((record) => String(record.evidenceId));
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const byStatus: Record<string, number> = Object.create(null);
  for (const record of sorted) byStatus[String(record.status)] = (byStatus[String(record.status)] ?? 0) + 1;
  const valid = sorted.filter(isValidEvidenceRecord);
  return cloneFreeze({ records: sorted, byStatus, duplicateIds: [...new Set(duplicateIds)], invalid: sorted.filter((r) => !isValidEvidenceRecord(r)), observed: valid.filter((r) => r.status === "OBSERVED"), reported: valid.filter((r) => r.status === "REPORTED"), verified: valid.filter((r) => r.status === "VERIFIED"), externallyAccepted: valid.filter((r) => r.status === "ACCEPTED"), conflicts: valid.filter((r) => r.status === "CONFLICTING"), stale: valid.filter((r) => r.status === "STALE"), expired: valid.filter((r) => r.status === "STALE" || r.status === "EXPIRED"), missing: valid.filter((r) => r.status === "MISSING"), sensitiveExcluded: valid.filter((r) => r.status === "NOT_ASSESSABLE"), authorityStatus: "NON_AUTHORIZING" as const });
};
