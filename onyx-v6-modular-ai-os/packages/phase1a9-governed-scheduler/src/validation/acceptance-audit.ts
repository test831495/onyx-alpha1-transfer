export const P19_ACCEPTANCE_IDS = [
  "P19-CONTRACT", "P19-STATES", "P19-LANES", "P19-DEPS", "P19-LEASE", "P19-HEARTBEAT",
  "P19-LOCK", "P19-CHECKPOINT", "P19-CANCEL", "P19-JOIN", "P19-BUDGET", "P19-RECOVERY",
  "P19-PROMOTION", "P19-EVIDENCE", "P19-UX", "P19-SECURITY", "P19-REGRESSION", "P19-SIMULATION",
  "P19-MEMORY", "P19-COUNCIL", "P19-DRAFT", "P19-CONNECTOR",
] as const;

export type AcceptanceStatus = "accepted" | "pending" | "blocked" | "reconciliation_required";

export interface AcceptanceEntry {
  implementationIdentifiers: string[];
  testFiles: string[];
  validationMethod: string;
  acceptanceEvidence: string;
  documentationReference: string;
  coveredTestIds: string[];
  coveredEvidenceArtifactIds: string[];
  acceptanceStatus: AcceptanceStatus;
  acceptanceLifecycleState: string;
}

export interface AcceptanceAuditResult {
  auditedIds: string[];
  acceptedIds: string[];
  pendingIds: string[];
  blockedIds: string[];
  reconciliationIds: string[];
  blockers: string[];
  passed: boolean;
}

const requiredFields: (keyof AcceptanceEntry)[] = [
  "implementationIdentifiers", "testFiles", "validationMethod", "acceptanceEvidence",
  "documentationReference", "coveredTestIds", "coveredEvidenceArtifactIds",
  "acceptanceStatus", "acceptanceLifecycleState",
];

export function auditAcceptanceRegistry(
  entries: Record<string, AcceptanceEntry>,
  availableEvidence: ReadonlySet<string> = new Set(),
): AcceptanceAuditResult {
  const keys = Object.keys(entries);
  const blockers: string[] = [];
  const expected = new Set<string>(P19_ACCEPTANCE_IDS);
  const duplicates = keys.filter((id, index) => keys.indexOf(id) !== index);
  if (keys.length !== expected.size || keys.some((id) => !expected.has(id))) blockers.push("acceptance registry must contain exactly the 22 P19 IDs");
  if (duplicates.length > 0) blockers.push(`duplicate acceptance IDs: ${duplicates.join(", ")}`);

  for (const id of P19_ACCEPTANCE_IDS) {
    const entry = entries[id];
    if (!entry) {
      blockers.push(`${id}: missing acceptance entry`);
      continue;
    }
    for (const field of requiredFields) {
      const value = entry[field];
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) blockers.push(`${id}: missing ${field}`);
    }
    for (const artifact of entry.coveredEvidenceArtifactIds) {
      if (!availableEvidence.has(artifact)) blockers.push(`${id}: missing evidence ${artifact}`);
    }
  }
  const status = (value: AcceptanceStatus) => keys.filter((id) => entries[id]?.acceptanceStatus === value);
  const acceptedIds = status("accepted");
  const pendingIds = status("pending");
  const blockedIds = status("blocked");
  const reconciliationIds = status("reconciliation_required");
  return { auditedIds: keys, acceptedIds, pendingIds, blockedIds, reconciliationIds, blockers, passed: blockers.length === 0 };
}