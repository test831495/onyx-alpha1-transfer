export const TEST_IDS = Array.from({ length: 40 }, (_, index) => `T${String(index + 1).padStart(2, "0")}`);
export interface TestMatrixEntry {
  testId: string; description: string; fixtureIds: string[]; preconditions: string[]; schedulerStage: string;
  inputContractIds: string[]; expectedEvents?: string[]; expectedEventTypes?: string[]; expectedState: string;
  expectedEvidenceClasses: string[]; recoveryDisposition: string; failureInjectionClass: string;
  coveredAcceptanceIds: string[]; implementationWave: string; status: string; contractVersion: string;
  testImplementationReference?: string; simulationScenarioReferences?: string[];
}
export interface TestMatrixAuditResult { auditedIds: string[]; blockers: string[]; passed: boolean; }
export function auditTestMatrix(entries: Record<string, TestMatrixEntry>): TestMatrixAuditResult {
  const keys = Object.keys(entries);
  const blockers: string[] = [];
  const expected = new Set(TEST_IDS);
  if (keys.length !== 40 || keys.some((id) => !expected.has(id))) blockers.push("test matrix must contain exactly T01 through T40");
  if (keys.some((id, index) => keys.indexOf(id) !== index)) blockers.push("test matrix contains duplicate test IDs");
  for (const id of TEST_IDS) {
    const entry = entries[id];
    if (!entry) { blockers.push(`${id}: missing test entry`); continue; }
    for (const field of ["description", "schedulerStage", "expectedState", "recoveryDisposition", "failureInjectionClass", "implementationWave", "status", "contractVersion"] as const) {
      if (!entry[field]) blockers.push(`${id}: missing ${field}`);
    }
    if (!entry.coveredAcceptanceIds?.length) blockers.push(`${id}: missing covered acceptance IDs`);
  }
  return { auditedIds: keys, blockers, passed: blockers.length === 0 };
}