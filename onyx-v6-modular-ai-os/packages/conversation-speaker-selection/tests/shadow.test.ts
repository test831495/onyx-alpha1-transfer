import { describe, expect, it } from "vitest";
import { buildShadowDivergenceReceipt, decideSpeaker, type SpeakerSelectionRequest } from "../src/index";

const baseRequest = (overrides: Partial<SpeakerSelectionRequest> = {}): SpeakerSelectionRequest => ({
  requestVersion: "B4C-1",
  requestFingerprint: "req-123",
  explicitSpeakerRequest: "NONE",
  explicitRequestTrusted: true,
  externalOrUntrustedSpeakerDirectivePresent: false,
  intentClass: "GENERAL_INQUIRY",
  ambiguityClass: "LOW",
  clarificationRequired: false,
  sessionFingerprint: "session-abc",
  currentTurnOwner: "NOVA",
  followUpClass: "NONE",
  followUpOwnershipFreshness: "CURRENT",
  currentDefaultSpeaker: "NOVA",
  onyxAvailable: true,
  novaAvailable: true,
  localCapabilityAvailable: true,
  cloudCapabilityAvailable: true,
  topicClass: "LOCAL_PRACTICAL",
  materialityClass: "LOW",
  truthSourceClass: "DETERMINISTIC_LOCAL",
  uncertaintyClass: "KNOWN",
  materialConflictPresent: false,
  languageClass: "ENGLISH",
  codeSwitchEvidenceClass: "NONE",
  operatingMode: "LOCAL",
  featureMode: "OFF",
  privacyEligibility: "ELIGIBLE",
  emotionalEvidence: [],
  trustedFreshnessFacts: ["CURRENT_SESSION"],
  boundedSessionLineage: ["session-abc"],
  ...overrides,
});

describe("shadow mode", () => {
  it("disables candidate effect in OFF mode", () => {
    const decision = decideSpeaker(baseRequest({ featureMode: "OFF" }));
    expect(decision.shadowOnly).toBe(false);
    expect(decision.featureMode).toBe("OFF");
  });

  it("builds a zero-side-effect shadow receipt", () => {
    const decision = decideSpeaker(baseRequest({ featureMode: "SHADOW", explicitSpeakerRequest: "ONYX" }));
    const receipt = buildShadowDivergenceReceipt({
      featureMode: "SHADOW",
      legacySpeakerClass: "NOVA",
      candidateSpeakerClass: decision.selectedSpeaker ?? "NOVA",
      precedenceLevel: decision.precedenceLevel,
      reasonCode: decision.selectionReasonCode,
      councilEligibility: decision.councilEligibility,
      clarificationRequired: decision.clarificationRequired,
      emotionalContext: "NORMAL",
      confidenceEvidence: decision.confidenceEvidence,
      limitationClass: "NONE",
      authorityInvariantEqual: true,
      replayEvidence: decision.replayEvidence,
    });
    expect(receipt.sideEffectsObserved).toBe(false);
    expect(receipt.persistenceOccurred).toBe(false);
    expect(receipt.candidateVisible).toBe(false);
  });
});
