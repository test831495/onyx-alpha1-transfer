import { describe, expect, it } from "vitest";
import {
  CHARACTER_PROFILES, CONTENT_CLASSES, RESPONSE_CLASSES, buildCharacterResponseEnvelope,
  classifySensitiveEvidence, validateDisplaySpokenParity,
} from "../src/index";

describe("B4B response envelope", () => {
  const candidate = (overrides: Record<string, unknown> = {}) => ({
    candidateVersion: "B4B-1", suppliedSpeaker: "NOVA", responseClassHint: "ANSWER",
    displayCandidate: "The local explanation is ready.", spokenCandidate: "The local explanation is ready.",
    contentClass: "GENERAL_EXPLANATION", generatedOrGroundedClass: "GENERATED_GENERAL",
    truthSourceClass: "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT",
    responseLanguageClass: "ENGLISH", criticalFacts: [], ...overrides,
  });

  it("exposes closed frozen vocabularies and supplied profiles", () => {
    expect(RESPONSE_CLASSES).toEqual(["ANSWER", "CLARIFICATION", "LIMITATION", "RECOMMENDATION", "ACTION_PREVIEW", "REFUSAL", "RECOVERY", "UNAVAILABLE"]);
    expect(CONTENT_CLASSES).toContain("BRAINSTORMING");
    expect(CHARACTER_PROFILES.NOVA.characterId).toBe("NOVA");
    expect(Object.isFrozen(CHARACTER_PROFILES)).toBe(true);
  });

  it("builds a deeply immutable non-authorizing generated envelope", () => {
    const result = buildCharacterResponseEnvelope(candidate());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.responseClass).toBe("ANSWER");
    expect(result.envelope.generatedOrGroundedClass).toBe("GENERATED_GENERAL");
    expect(result.envelope.nonAuthority).toBe(true);
    expect(result.envelope.executionAuthorized).toBe(false);
    expect(result.envelope.speakerSelectedByB4B).toBe(false);
    expect(Object.isFrozen(result.envelope)).toBe(true);
    expect(Object.isFrozen(result.envelope.replayEvidence)).toBe(true);
  });

  it("adopts a B4A receipt and never resolves operational content itself", () => {
    const receipt = {
      resolverVersion: "B4A-1", requestVersion: "1", policyVersion: "B4A-1", claimType: "PR_STATE",
      resolutionStatus: "RESOLVED", truthSourceClass: "CONNECTOR_GROUNDED", uncertaintyClass: "KNOWN",
      selectedEvidenceIds: ["e-1"], rejectedEvidenceIds: [], rejectionReasons: {}, evidenceClassDecision: "CONNECTOR_GROUNDED",
      conflictTypes: [], materialConflict: false, assumptions: [], limitations: [], missingEvidenceClasses: [], fallbackUsed: false,
      fallbackPolicy: "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", preferredClassUnavailable: false, selectedLowerClass: "NONE",
      fallbackReasonCodes: [], rejectedEvidenceOverflow: false, provenanceComplete: true, privacyResult: "ELIGIBLE", replayEvidence: "1234567800000000",
      nonAuthority: true, executionAuthorized: false, approvalGranted: false, memoryWriteAuthorized: false, connectorExecutionAuthorized: false,
    } as const;
    const result = buildCharacterResponseEnvelope(candidate({ contentClass: "TECHNICAL_DISCUSSION", truthSourceClass: "CONNECTOR_GROUNDED", generatedOrGroundedClass: "GROUNDED", provenanceClass: "B4A_RECEIPT", b4aReceipt: receipt, operationalClaim: true }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.truthSourceClass).toBe("CONNECTOR_GROUNDED");
  });

  it("fails closed when an operational claim has no B4A receipt", () => {
    const result = buildCharacterResponseEnvelope(candidate({ operationalClaim: true }));
    expect(result.ok).toBe(false);
  });

  it("maps uncertainty and preserves conflicts without confident answers", () => {
    const result = buildCharacterResponseEnvelope(candidate({ operationalClaim: true, b4aReceipt: {
      resolutionStatus: "CONFLICTING", uncertaintyClass: "CONFLICTING", truthSourceClass: "CONFLICTING", materialConflict: true,
      conflictTypes: ["STATUS_CONFLICT"], selectedEvidenceIds: [], rejectedEvidenceIds: [], missingEvidenceClasses: [],
      assumptions: [], limitations: [], privacyResult: "ELIGIBLE", nonAuthority: true, executionAuthorized: false,
      approvalGranted: false, memoryWriteAuthorized: false, connectorExecutionAuthorized: false,
    } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.responseClass).toBe("LIMITATION");
  });

  it("rejects critical spoken omissions and authority implications", () => {
    expect(validateDisplaySpokenParity({ displayText: "Risk exists and Owner approval is required.", spokenText: "The operation is ready.", criticalFacts: ["RISK", "OWNER_DECISION"] })).toBe("CRITICAL_OMISSION");
    expect(validateDisplaySpokenParity({ displayText: "It is approved.", spokenText: "It is approved.", criticalFacts: [] })).toBe("MATERIAL_CONTRADICTION");
  });

  it("rejects sensitive content and unknown speakers", () => {
    expect(buildCharacterResponseEnvelope(candidate({ suppliedSpeaker: "AUTO" }))).toEqual({ ok: false, reason: "INVALID_SPEAKER" });
    expect(buildCharacterResponseEnvelope(candidate({ displayCandidate: "Bearer abcdefghijklmnop" }))).toEqual({ ok: false, reason: "PROHIBITED_CONTENT" });
  });

  it("is property-order independent and supports all general families", () => {
    const first = buildCharacterResponseEnvelope(candidate({ contentClass: "BRAINSTORMING" }));
    const second = buildCharacterResponseEnvelope({ ...candidate({ contentClass: "BRAINSTORMING" }), candidateVersion: "B4B-1" });
    expect(second).toEqual(first);
    for (const contentClass of CONTENT_CLASSES) expect(buildCharacterResponseEnvelope(candidate({ contentClass })).ok).toBe(true);
  });

  it("classifies sensitive evidence and avoids leaking raw suspect values", () => {
    expect(classifySensitiveEvidence("my secret token is abc123")).toBe("SENSITIVE");
    expect(classifySensitiveEvidence("user@example.com")).toBe("SENSITIVE");
    expect(classifySensitiveEvidence("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature")).toBe("SENSITIVE");
    expect(classifySensitiveEvidence("dGVzdC1zdHJpbmctb2Ytc2VjdXJlLWFjY2Vzcy12YWx1ZQ")).toBe("SENSITIVE");
    expect(classifySensitiveEvidence("Bearer sk_test_abcdefghijklmnopqrstuvwxyz")).toBe("SENSITIVE");
    expect(classifySensitiveEvidence("pR9Q7sK4mN1xZ2tY")).toBe("SAFE");
    expect(classifySensitiveEvidence("ordinary-evidence-citation")).toBe("SAFE");
    expect(classifySensitiveEvidence("not-a-token-1")).toBe("SAFE");
    expect(classifySensitiveEvidence("bad value-------------")).toBe("SENSITIVE");
    expect(() => JSON.stringify({ suspect: classifySensitiveEvidence("x"), extra: "" })).not.toThrow();
    expect(() => JSON.stringify({ suspect: "abc123", leaked: "" })).not.toThrow();
  });

  it("requires evidence for grounded and operational claims regardless of optional markers", () => {
    const groundedReceipt = {
      resolverVersion: "B4A-1", requestVersion: "1", policyVersion: "B4A-1", claimType: "PR_STATE",
      resolutionStatus: "RESOLVED", truthSourceClass: "CONNECTOR_GROUNDED", uncertaintyClass: "KNOWN",
      selectedEvidenceIds: ["e-1"], rejectedEvidenceIds: [], rejectionReasons: {}, evidenceClassDecision: "CONNECTOR_GROUNDED",
      conflictTypes: [], materialConflict: false, assumptions: [], limitations: [], missingEvidenceClasses: [],
      fallbackUsed: false, fallbackPolicy: "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", preferredClassUnavailable: false,
      selectedLowerClass: "NONE", fallbackReasonCodes: [], rejectedEvidenceOverflow: false, provenanceComplete: true,
      privacyResult: "ELIGIBLE", replayEvidence: "abc12300000000", nonAuthority: true, executionAuthorized: false,
      approvalGranted: false, memoryWriteAuthorized: false, connectorExecutionAuthorized: false,
    } as const;
    expect(buildCharacterResponseEnvelope(candidate({ generatedOrGroundedClass: "GROUNDED", provenanceClass: "B4A_RECEIPT", b4aReceipt: groundedReceipt, operationalClaim: true })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ generatedOrGroundedClass: "GROUNDED", provenanceClass: "B4A_RECEIPT", operationalClaim: true })).ok).toBe(false);
    expect(buildCharacterResponseEnvelope(candidate({ generatedOrGroundedClass: "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT", b4aReceipt: groundedReceipt, operationalClaim: true })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ generatedOrGroundedClass: "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT", operationalClaim: true })).ok).toBe(false);
    expect(buildCharacterResponseEnvelope(candidate({ generatedOrGroundedClass: "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "UNAVAILABLE" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope({ ...candidate(), responseClassHint: "UNAVAILABLE", b4aReceipt: { ...groundedReceipt, selectedEvidenceIds: [], privacyResult: "NOT_ELIGIBLE" } }).ok).toBe(false);
  });

  it("routes every explicit response class and rejects malformed ones", () => {
    const receipt = {
      resolverVersion: "B4A-1", requestVersion: "1", policyVersion: "B4A-1", claimType: "PR_STATE",
      resolutionStatus: "RESOLVED", truthSourceClass: "CONNECTOR_GROUNDED", uncertaintyClass: "KNOWN",
      selectedEvidenceIds: ["e-1"], rejectedEvidenceIds: [], rejectionReasons: {}, evidenceClassDecision: "CONNECTOR_GROUNDED",
      conflictTypes: [], materialConflict: false, assumptions: [], limitations: [], missingEvidenceClasses: [],
      fallbackUsed: false, fallbackPolicy: "STOP_ON_PREFERRED_CLASS_UNAVAILABLE", preferredClassUnavailable: false,
      selectedLowerClass: "NONE", fallbackReasonCodes: [], rejectedEvidenceOverflow: false, provenanceComplete: true,
      privacyResult: "ELIGIBLE", replayEvidence: "abc12300000000", nonAuthority: true, executionAuthorized: false,
      approvalGranted: false, memoryWriteAuthorized: false, connectorExecutionAuthorized: false,
    } as const;
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "UNAVAILABLE" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "ANSWER" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "CLARIFICATION" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "LIMITATION" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "RECOMMENDATION" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "ACTION_PREVIEW" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "REFUSAL" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope(candidate({ responseClassHint: "RECOVERY" })).ok).toBe(true);
    expect(buildCharacterResponseEnvelope({ ...candidate(), responseClassHint: "NOT_A_CLASS" as any }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({ ...candidate(), responseLanguageClass: "FRENCH" as any }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({ ...candidate(), provenanceClass: "BAD" as any }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({ ...candidate(), truthSourceClass: "BAD" as any }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({ ...candidate(), b4aReceipt: { ...receipt, privacyResult: "ELIGIBLE" }, generatedOrGroundedClass: "GROUNDED", operationalClaim: true }).ok).toBe(true);
  });

  it("fully validates the candidate before projection and rejects malformed optional fields", () => {
    expect(buildCharacterResponseEnvelope({
      candidateVersion: "B4B-1",
      suppliedSpeaker: "NOVA",
      displayCandidate: "Valid response.",
      spokenCandidate: "Valid response.",
      contentClass: "GENERAL_EXPLANATION",
      generatedOrGroundedClass: "GENERATED_GENERAL",
      truthSourceClass: "GENERATED_GENERAL",
      provenanceClass: "SUPPLIED_SAFE_CONTENT",
      responseLanguageClass: "ENGLISH",
      criticalFacts: [],
      assumptions: ["valid"],
      limitations: ["valid"],
      followUpClass: "NEXT_STEP",
    })).toEqual(expect.objectContaining({ ok: true }));
    expect(buildCharacterResponseEnvelope({
      candidateVersion: "B4B-1",
      suppliedSpeaker: "NOVA",
      displayCandidate: "Valid response.",
      spokenCandidate: "Valid response.",
      contentClass: "GENERAL_EXPLANATION",
      generatedOrGroundedClass: "GENERATED_GENERAL",
      truthSourceClass: "GENERATED_GENERAL",
      provenanceClass: "SUPPLIED_SAFE_CONTENT",
      responseLanguageClass: "FRENCH",
      criticalFacts: [],
    }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({
      candidateVersion: "B4B-1",
      suppliedSpeaker: "NOVA",
      displayCandidate: "Valid response.",
      spokenCandidate: "Valid response.",
      contentClass: "GENERAL_EXPLANATION",
      generatedOrGroundedClass: "GENERATED_GENERAL",
      truthSourceClass: "GENERATED_GENERAL",
      provenanceClass: "SUPPLIED_SAFE_CONTENT",
      responseLanguageClass: "ENGLISH",
      criticalFacts: ["RISK", "BAD" as any],
    }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope({
      candidateVersion: "B4B-1",
      suppliedSpeaker: "NOVA",
      displayCandidate: "Long ".repeat(6000),
      spokenCandidate: "Long ".repeat(6000),
      contentClass: "GENERAL_EXPLANATION",
      generatedOrGroundedClass: "GENERATED_GENERAL",
      truthSourceClass: "GENERATED_GENERAL",
      provenanceClass: "SUPPLIED_SAFE_CONTENT",
      responseLanguageClass: "ENGLISH",
      criticalFacts: [],
    }).ok).toBe(false);
    expect(buildCharacterResponseEnvelope(Object.assign(Object.create(null), candidate())).ok).toBe(true);
  });
});
