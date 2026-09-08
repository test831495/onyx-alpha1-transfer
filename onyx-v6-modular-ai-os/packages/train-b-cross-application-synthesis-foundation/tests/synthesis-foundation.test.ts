import { describe, expect, it } from "vitest";
import { createSynthesisRequest, admitEvidence, assessClaimSupport, createSynthesisPlan, validateAcceptanceRegistry } from "../src/index.js";

describe("cross-application synthesis foundation", () => {
  it("accepts a bounded request and rejects unsupported claims", () => {
    const request = createSynthesisRequest({ requestId: "r1", accountScopeReference: "account:1", purposeReference: "purpose:1", mode: "STATUS_SUMMARY", questionReference: "status", searchReceiptReferences: ["receipt:1"], resultReferences: ["result:1"], applicationScopes: ["application.calendar"], dataClasses: ["metadata"], detailLevel: "STANDARD", privacyRequirements: ["PRIVATE"], freshnessRequirements: ["CURRENT"], maximumClaims: 4, maximumApplicationContributions: 2, missingSourcePolicy: "DISCLOSE", conflictPolicy: "PRESERVE" });
    expect(request.nonAuthorizing).toBe(true);
    expect(assessClaimSupport({ claimId: "c1", evidenceIds: [], admittedEvidenceIds: [], contradictionEvidenceIds: [] }).label).toBe("UNSUPPORTED");
  });

  it("admits attributed evidence deterministically and produces a non-prose plan", () => {
    const decision = admitEvidence({ evidenceId: "e1", resultId: "result:1", applicationId: "calendar", accountScopeReference: "account:1", dataClass: "metadata", freshnessState: "CURRENT", privacyDecision: "AUTHORIZED", attributionComplete: true, placeholder: false, evidenceReferences: ["evidence:1"] }, { accountScopeReference: "account:1", allowStale: false });
    expect(decision.disposition).toBe("ADMITTED");
    expect(createSynthesisPlan({ requestId: "r1", claims: [], conflicts: [], coverageGaps: [], citations: [] }).proseGenerationAllowed).toBe(false);
  });

  it("keeps the acceptance registry exact and unique", () => {
    expect(validateAcceptanceRegistry()).toEqual({ valid: true, count: 134 });
  });
});