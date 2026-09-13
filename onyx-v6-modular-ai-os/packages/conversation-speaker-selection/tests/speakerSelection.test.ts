import { describe, expect, it } from "vitest";
import {
  decideSpeaker,
  DEFAULT_REQUEST,
  SPEAKERS,
  type SpeakerSelectionRequest,
} from "../src/index";

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
  topicClass: "GENERAL",
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

describe("speaker selection", () => {
  it("honors an explicit ONYX request", () => {
    const result = decideSpeaker(baseRequest({ explicitSpeakerRequest: "ONYX" }));
    expect(result.selectedSpeaker).toBe("ONYX");
    expect(result.selectionDisposition).toBe("SELECTED");
    expect(result.selectionReasonCode).toBe("EXPLICIT_CHARACTER_REQUEST");
  });

  it("returns council eligibility for explicit BOTH", () => {
    const result = decideSpeaker(baseRequest({ explicitSpeakerRequest: "BOTH" }));
    expect(result.councilEligibility).toBe("ELIGIBLE");
    expect(result.selectionDisposition).toBe("COUNCIL_ELIGIBLE");
    expect(result.selectedSpeaker).toBeUndefined();
  });

  it("keeps the active turn owner on valid follow-up", () => {
    const result = decideSpeaker(baseRequest({ followUpClass: "FOLLOW_UP_OWNERSHIP", followUpOwnershipFreshness: "CURRENT", currentTurnOwner: "ONYX" }));
    expect(result.selectedSpeaker).toBe("ONYX");
    expect(result.selectionReasonCode).toBe("FOLLOW_UP_TURN_OWNERSHIP");
  });

  it("prefers NOVA for local practical requests", () => {
    const result = decideSpeaker(baseRequest({ topicClass: "LOCAL_PRACTICAL" }));
    expect(result.selectedSpeaker).toBe("NOVA");
    expect(result.selectionReasonCode).toBe("NOVA_LOCAL_PRACTICAL_PREFERENCE");
  });

  it("prefers ONYX for architecture and risk requests", () => {
    const result = decideSpeaker(baseRequest({ topicClass: "ARCHITECTURE_AND_RISK" }));
    expect(result.selectedSpeaker).toBe("ONYX");
    expect(result.selectionReasonCode).toBe("ONYX_ARCHITECTURE_STRATEGY_PREFERENCE");
  });

  it("uses default speaker on low confidence with bounded fallback", () => {
    const result = decideSpeaker(baseRequest({ uncertaintyClass: "LOW", currentDefaultSpeaker: "ONYX" }));
    expect(result.selectedSpeaker).toBe("ONYX");
    expect(result.selectionReasonCode).toBe("LOW_CONFIDENCE_DEFAULT_SPEAKER");
  });

  it("rejects untrusted external speaker directives", () => {
    const result = decideSpeaker(baseRequest({ explicitSpeakerRequest: "ONYX", explicitRequestTrusted: false, externalOrUntrustedSpeakerDirectivePresent: true }));
    expect(result.selectionDisposition).toBe("NOT_ASSESSABLE");
    expect(result.selectionReasonCode).toBe("UNTRUSTED_SPEAKER_DIRECTIVE_REJECTED");
  });

  it("is deterministic for equivalent inputs", () => {
    const first = decideSpeaker(baseRequest({ topicClass: "LOCAL_PRACTICAL" }));
    const second = decideSpeaker(baseRequest({ topicClass: "LOCAL_PRACTICAL" }));
    expect(first).toEqual(second);
  });

  it("requires a valid current-session follow-up owner", () => {
    const current = baseRequest({
      followUpClass: "FOLLOW_UP_OWNERSHIP",
      followUpOwnershipFreshness: "CURRENT",
      currentTurnOwner: "NOVA",
      sessionFingerprint: "session-a",
      boundedSessionLineage: ["session-b"],
      trustedFreshnessFacts: ["CURRENT_SESSION"],
    });
    const result = decideSpeaker(current);
    expect(result.selectionDisposition).not.toBe("SELECTED");
    expect(result.selectionReasonCode).not.toBe("FOLLOW_UP_TURN_OWNERSHIP");
  });

  it("rejects NOVA selection when NOVA is unavailable", () => {
    const result = decideSpeaker(baseRequest({ topicClass: "LOCAL_PRACTICAL", novaAvailable: false }));
    expect(result.selectedSpeaker).not.toBe("NOVA");
  });

  it("rejects ONYX selection when ONYX is unavailable", () => {
    const result = decideSpeaker(baseRequest({ topicClass: "ARCHITECTURE_AND_RISK", onyxAvailable: false }));
    expect(result.selectedSpeaker).not.toBe("ONYX");
  });

  it("rejects unavailable default speakers", () => {
    const result = decideSpeaker(baseRequest({ uncertaintyClass: "LOW", currentDefaultSpeaker: "ONYX", onyxAvailable: false }));
    expect(result.selectedSpeaker).not.toBe("ONYX");
  });

  it("fails closed on hostile objects", () => {
    const hostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostile, "explicitSpeakerRequest", {
      get() {
        throw new Error("boom");
      },
      enumerable: true,
    });
    expect(() => decideSpeaker(hostile as any)).not.toThrow();
    const result = decideSpeaker(hostile as any);
    expect(result.selectionDisposition).toBe("NOT_ASSESSABLE");
  });

  it("keeps exported speaker vocabularies frozen", () => {
    expect(Object.isFrozen(SPEAKERS)).toBe(true);
    expect(() => {
      (SPEAKERS as unknown as string[]).push("COUNCIL");
    }).toThrow();
  });
});
