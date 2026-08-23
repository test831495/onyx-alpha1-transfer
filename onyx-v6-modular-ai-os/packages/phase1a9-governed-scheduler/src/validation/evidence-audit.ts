export interface EvidenceDefinition { fileName: string; format: string; schemaVersion: string; producerComponent: string; requiredFields: string[]; provenanceRequirement: string; validationMethod: string; releaseRequirement: string; implementationWave: string; status: string; }
export interface EvidenceAuditResult { registeredCount: number; missingFiles: string[]; blockers: string[]; passed: boolean; }
export function auditEvidenceRegistry(entries: Record<string, EvidenceDefinition>, existingFiles: ReadonlySet<string>): EvidenceAuditResult {
  const blockers: string[] = [];
  const missingFiles = Object.values(entries).filter((entry) => entry.status !== "NOT_STARTED" && !existingFiles.has(entry.fileName)).map((entry) => entry.fileName);
  if (missingFiles.length) blockers.push(`registered evidence is missing: ${missingFiles.join(", ")}`);
  for (const [id, entry] of Object.entries(entries)) if (!entry.fileName || !entry.format || !entry.schemaVersion || !entry.producerComponent || !entry.requiredFields?.length || !entry.provenanceRequirement || !entry.validationMethod || !entry.releaseRequirement || !entry.implementationWave || !entry.status) blockers.push(`${id}: incomplete artifact definition`);
  return { registeredCount: Object.keys(entries).length, missingFiles, blockers, passed: blockers.length === 0 };
}