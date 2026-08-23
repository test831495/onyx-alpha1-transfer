import { describe, expect, it } from "vitest";
import { auditAcceptanceRegistry, P19_ACCEPTANCE_IDS } from "../src/validation/acceptance-audit";

const validEntry = { implementationIdentifiers: ["impl"], testFiles: ["test.ts"], validationMethod: "test", acceptanceEvidence: "evidence", documentationReference: "docs", coveredTestIds: ["T01"], coveredEvidenceArtifactIds: ["artifact"], acceptanceStatus: "pending" as const, acceptanceLifecycleState: "FOCUSED_TESTED" };
describe("Phase 1A.9 acceptance audit", () => {
  it("audits all 22 P19 IDs", () => expect(auditAcceptanceRegistry(Object.fromEntries(P19_ACCEPTANCE_IDS.map((id) => [id, validEntry])), new Set(["artifact"])).auditedIds).toHaveLength(22));
  it("rejects a missing acceptance ID", () => { const entries = Object.fromEntries(P19_ACCEPTANCE_IDS.slice(1).map((id) => [id, validEntry])); expect(auditAcceptanceRegistry(entries).passed).toBe(false); });
  it("rejects incomplete evidence", () => expect(auditAcceptanceRegistry(Object.fromEntries(P19_ACCEPTANCE_IDS.map((id) => [id, validEntry]))).passed).toBe(false));
});