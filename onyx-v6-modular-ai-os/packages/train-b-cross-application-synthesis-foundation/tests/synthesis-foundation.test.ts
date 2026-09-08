import { describe, expect, it } from "vitest";
import { createSynthesisRequest, admitEvidence, assessClaimSupport, createSynthesisPlan, createCoverageSummary, validateAcceptanceRegistry, ACCEPTANCE_MAPPINGS, ACCEPTANCE_REGISTRY, MAX } from "../src/index.js";

const requestInput = (overrides: Record<string, unknown> = {}) => ({ requestId: "r1", accountScopeReference: "account:1", purposeReference: "purpose:1", mode: "STATUS_SUMMARY" as const, questionReference: "status", searchReceiptReferences: ["receipt:1"], resultReferences: ["result:1"], applicationScopes: ["application.calendar"], dataClasses: ["metadata"], detailLevel: "STANDARD" as const, privacyRequirements: ["PRIVATE"], freshnessRequirements: ["CURRENT"], maximumClaims: 4, maximumApplicationContributions: 2, missingSourcePolicy: "DISCLOSE" as const, conflictPolicy: "PRESERVE" as const, ...overrides });
const coverageInput = (overrides: Record<string, unknown> = {}) => ({ requestedSources: ["calendar"], completedSources: ["calendar"], unavailableSources: [], staleSources: [], restrictedSources: [], admittedEvidenceCount: 0, excludedEvidenceCount: 0, fullySupportedClaimCount: 0, partiallySupportedClaimCount: 0, contradictedClaimCount: 0, unsupportedClaimCount: 0, uncertainty: "LOW" as const, ...overrides });

describe("cross-application synthesis foundation", () => {
  it("accepts a bounded request and rejects unsupported claims", () => {
    const request = createSynthesisRequest(requestInput());
    expect(request.nonAuthorizing).toBe(true);
    expect(assessClaimSupport({ claimId: "c1", evidenceIds: [], admittedEvidenceIds: [], contradictionEvidenceIds: [] }).label).toBe("UNSUPPORTED");
  });

  it("admits attributed evidence deterministically and produces a non-prose plan", () => {
    const decision = admitEvidence({ evidenceId: "e1", resultId: "result:1", applicationId: "calendar", accountScopeReference: "account:1", dataClass: "metadata", freshnessState: "CURRENT", privacyDecision: "AUTHORIZED", attributionComplete: true, placeholder: false, evidenceReferences: ["evidence:1"] }, { accountScopeReference: "account:1", allowStale: false });
    expect(decision.disposition).toBe("ADMITTED");
    expect(createSynthesisPlan({ requestId: "r1", claims: [], conflicts: [], coverageGaps: [], citations: [] }).proseGenerationAllowed).toBe(false);
  });

  it("keeps the acceptance registry exact and unique", () => {
    expect(validateAcceptanceRegistry()).toMatchObject({ valid: true, count: 134 });
  });

  it("deeply freezes acceptance mappings and registry identifiers", () => {
    expect(Object.isFrozen(ACCEPTANCE_MAPPINGS)).toBe(true);
    expect(ACCEPTANCE_MAPPINGS.every((mapping) => Object.isFrozen(mapping))).toBe(true);
    expect(Object.isFrozen(ACCEPTANCE_REGISTRY)).toBe(true);
    expect(() => { (ACCEPTANCE_MAPPINGS[0] as { id: string }).id = "changed"; }).toThrow();
    expect(ACCEPTANCE_MAPPINGS[0]?.id).toBe("TB-SYNTH-REQUEST-001");
  });

  it("validates synthesis request bounds as finite integers", () => {
    for (const field of ["maximumClaims", "maximumApplicationContributions"] as const) {
      for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "2", true, null, undefined]) {
        expect(() => createSynthesisRequest(requestInput({ [field]: value }))).toThrow("Invalid synthesis bounds");
      }
    }
    expect(createSynthesisRequest(requestInput({ maximumClaims: MAX.claims, maximumApplicationContributions: MAX.applications }))).toBeTruthy();
  });

  it("validates every coverage counter as a non-negative finite integer", () => {
    const counters = ["admittedEvidenceCount", "excludedEvidenceCount", "fullySupportedClaimCount", "partiallySupportedClaimCount", "contradictedClaimCount", "unsupportedClaimCount"] as const;
    for (const field of counters) {
      expect(createCoverageSummary(coverageInput({ [field]: 0 }))).toBeTruthy();
      for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "1", true, null, undefined]) {
        expect(() => createCoverageSummary(coverageInput({ [field]: value }))).toThrow("Invalid coverage count");
      }
    }
  });

  it("preserves complete claim-support assessments when building plans", () => {
    const assessed = assessClaimSupport({ claimId: "partial", evidenceIds: ["e1", "e2"], admittedEvidenceIds: ["e1"], contradictionEvidenceIds: [], missingEvidenceClasses: ["deadline"] });
    const contradicted = assessClaimSupport({ claimId: "conflict", evidenceIds: ["e3"], admittedEvidenceIds: ["e3"], contradictionEvidenceIds: ["e4"], missingEvidenceClasses: ["source"] });
    const deliberatelyPartial = { ...assessed, evidenceIds: ["e1"], label: "PARTIALLY_SUPPORTED" as const, citationIds: ["citation:partial"], coverageGaps: ["source:missing"], conflicts: ["conflict:1"], reasonCodes: ["PARTIAL_EVIDENCE"] };
    const plan = createSynthesisPlan({ requestId: "r1", claims: [deliberatelyPartial, contradicted], conflicts: ["conflict:1"], coverageGaps: ["source:missing"], citations: ["citation:1"] });
    expect(plan.claims[0]).toMatchObject(deliberatelyPartial);
    expect(plan.claims[0]?.label).toBe("PARTIALLY_SUPPORTED");
    expect(plan.claims[0]?.citationIds).toEqual(["citation:partial"]);
    expect(plan.claims[1]).toEqual(contradicted);
    expect(plan.admittedClaimIds).toEqual(["partial"]);
    expect(plan.excludedClaimIds).toEqual(["conflict"]);
    expect(plan.coverageGaps).toEqual(["source:missing"]);
    expect(plan.conflicts).toEqual(["conflict:1"]);
    expect(Object.isFrozen(plan.claims[0])).toBe(true);
    expect(Object.isFrozen(plan.claims[0]?.admittedEvidenceIds)).toBe(true);
  });
});