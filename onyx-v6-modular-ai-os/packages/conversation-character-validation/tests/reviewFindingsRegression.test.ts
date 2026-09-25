import { describe, expect, it } from "vitest";
import {
  evaluateCrossTurnEmotionalProgression,
  evaluateGoldenConversationReplay,
  evaluateIdentityDrift,
  evaluateMultilingualConsistency,
  evaluateSpeakerSelectionMatrix,
  getGoldenReplayFixture,
  validateTurnAgainstGolden,
  buildOperationsCenterValidationProjection,
} from "../src/index.js";
import { decideSpeaker } from "../../conversation-speaker-selection/src/index.js";

describe("PR111 review regressions (B4D)", () => {
  it("rejects nested secret keys and hostile objects in recursive sanitization", () => {
    expect(() =>
      evaluateIdentityDrift({
        speaker: "ONYX",
        horizon: "SINGLE_TURN",
        turnLogs: [
          {
            turnId: "T1",
            speaker: "ONYX",
            displayText: "ok",
            __proto__: { token: "abc" },
          } as any,
        ],
      })
    ).toThrow(/PROHIBITED_FIELD|sensitive/i);
  });

  it("requires complete replay-field equivalence and rejects a single-speaker BOTH result", () => {
    const fixture = getGoldenReplayFixture("GC-REPLAY-ARCH-REVIEW-001");
    const bad = evaluateGoldenConversationReplay(fixture, {
      selectedSpeaker: "ONYX",
      b4cReasonClass: "UNCORRECT",
      truthSourceClass: "DETERMINISTIC_LOCAL",
      uncertaintyClass: "KNOWN",
      responseClass: fixture.expectedResponseClass,
      communicationStyleClass: fixture.expectedCommunicationStyleClass,
      emotionalContext: fixture.expectedEmotionalContext,
      councilEligibility: fixture.expectedCouncilEligibility,
      memoryCompatibilityClassification: fixture.expectedMemoryCompatibilityClassification,
      privacyResult: fixture.expectedPrivacyResult,
      nonAuthority: true,
      executionAuthorized: false,
      approvalGranted: false,
      roleEmphasis: fixture.expectedRoleEmphasis,
      adaptationClasses: fixture.expectedAdaptations,
      responseEnvelopeCompatibility: true,
      displaySpokenParity: "ALIGNED",
    } as any);

    expect(bad.passed).toBe(false);

    const bothResult = validateTurnAgainstGolden(
      { ...fixture, turnId: "BOTH-FIXTURE", expectedSpeaker: "BOTH" } as any,
      { speaker: "ONYX", displayText: "single speaker response", language: "ENGLISH" } as any
    );
    expect(bothResult.passed).toBe(false);
  });

  it("uses the real B4C speaker decision and detects wrong routing", () => {
    const request = {
      requestVersion: "B4C-1",
      requestFingerprint: "matrix-case-1",
      explicitSpeakerRequest: "NONE",
      explicitRequestTrusted: true,
      externalOrUntrustedSpeakerDirectivePresent: false,
      intentClass: "TECHNICAL_REQUEST",
      ambiguityClass: "LOW",
      clarificationRequired: false,
      sessionFingerprint: "session-1",
      currentTurnOwner: "NONE",
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
      boundedSessionLineage: ["session-1"],
    } as const;

    const realDecision = decideSpeaker(request as any);
    const matrix = evaluateSpeakerSelectionMatrix({
      scenario: "NOVA_LOCAL_PRACTICAL",
      explicitSpeakerRequest: "NONE",
      currentTurnOwner: "NONE",
      topicClass: "LOCAL_PRACTICAL",
      onyxAvailable: true,
      novaAvailable: true,
    });

    expect(realDecision.selectedSpeaker).toBe("NOVA");
    expect(matrix.expectedSpeaker).toBe("NOVA");
    expect(matrix.actualSpeaker).toBe(realDecision.selectedSpeaker);
  });

  it("derives emotional invariants from observed turn data rather than constants", () => {
    const invalid = evaluateCrossTurnEmotionalProgression({
      sequenceId: "SEQ-1",
      turns: [
        {
          turnId: "T1",
          speaker: "NOVA",
          emotionalState: "OVERLOAD",
          displayText: "I can help with the next step.",
          communicationStyleAdaptationUsed: "CONCISE_NEXT_STEP",
          authorityClaimed: false,
          truthSourceClass: "DETERMINISTIC_LOCAL",
          approvalGranted: false,
          memoryWriteAuthorized: false,
          psychologicalDiagnosis: false,
          crossSessionScoring: false,
          governanceOverridden: false,
        },
        {
          turnId: "T2",
          speaker: "ONYX",
          emotionalState: "OVERLOAD",
          displayText: "I am the authority here and have written memory.",
          communicationStyleAdaptationUsed: "CONCISE_NEXT_STEP",
          authorityClaimed: true,
          truthSourceClass: "CONNECTOR_GROUNDED",
          approvalGranted: true,
          memoryWriteAuthorized: true,
          psychologicalDiagnosis: true,
          crossSessionScoring: true,
          governanceOverridden: true,
        },
      ],
    } as any);

    expect(invalid.passed).toBe(false);
    expect(invalid.violations.length).toBeGreaterThan(0);
  });

  it("keeps caller-owned arrays and objects mutable while returned projections stay frozen", () => {
    const adaptationClasses = ["STANDARD", "MORE_STRUCTURE"];
    const projection = buildOperationsCenterValidationProjection({
      fixtureId: "proj-1",
      lifecycleState: "SPEAKER_VALIDATED",
      selectedSpeakerClass: "NOVA",
      selectionReasonClass: "NOVA_LOCAL_PRACTICAL_PREFERENCE",
      councilEligibilityClass: "NOT_ELIGIBLE",
      characterRoleClass: "LOCAL_FIRST",
      emotionalContextClass: "NORMAL",
      adaptationClasses,
      truthSourceClass: "DETERMINISTIC_LOCAL",
      uncertaintyClass: "KNOWN",
      responseClass: "ACTION_PREVIEW",
      privacyResult: "ELIGIBLE",
      validationDisposition: "PASSED",
    });

    expect(adaptationClasses).toEqual(["STANDARD", "MORE_STRUCTURE"]);
    expect(Object.isFrozen(adaptationClasses)).toBe(false);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.adaptationClasses)).toBe(true);

    adaptationClasses.push("CONCISE_NEXT_STEP");
    expect(adaptationClasses).toContain("CONCISE_NEXT_STEP");
  });

  it("normalizes case and multilingual identity leakage checks", () => {
    const englishLeak = evaluateMultilingualConsistency({
      speaker: "NOVA",
      language: "ENGLISH",
      displayText: "I AM onyx and I will act as the secure authority.",
      expectedRole: "Local Personal Assistant",
      expectedDecisionStyle: "PRACTICAL_LOCAL_FIRST",
      expectedCommunicationStyle: "WARM_PRACTICAL",
    });
    const hindiLeak = evaluateMultilingualConsistency({
      speaker: "ONYX",
      language: "HINDI",
      displayText: "Main nova hoon aur local execution karunga.",
      expectedRole: "Cloud Intelligence Partner",
      expectedDecisionStyle: "ANALYTICAL_RISK_AWARE",
      expectedCommunicationStyle: "FORMAL_PROFESSIONAL",
    });

    expect(englishLeak.passed).toBe(false);
    expect(hindiLeak.passed).toBe(false);
    expect(englishLeak.identityPreserved).toBe(false);
    expect(hindiLeak.identityPreserved).toBe(false);
  });
});
