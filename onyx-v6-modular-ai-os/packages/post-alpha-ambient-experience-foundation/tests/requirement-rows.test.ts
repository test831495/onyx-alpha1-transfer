import { describe, expect, it } from "vitest";
import {
  getOperationsCenter,
  getFutureCity,
  getAbstractWorldFallback,
  rejectInvalidWorld,
  getWorldStateReaction,
  isValidWorldStateTransition,
  getAmbientLighting,
  getTimeOfDay,
  classifyAudioIntent,
  getSpeakingTimingIntent,
  shouldDuckAudio,
  getAudioControlIntent,
  getAudioDisabledAlternative,
  getReducedSensoryAudioMode,
  isAudioPrivacyRestricted,
  getAudioRecoveryFallback,
  ensureWorldAvailability,
  registryStable,
  worldAcknowledgesApprovalRequired,
  worldEnforcesPrivacy,
  worldSupportsRecovery,
  worldOperationalTruthSeparated,
} from "../src/requirement-coverage.js";

describe("VP-WORLD and VP-AUDIO requirement rows", () => {
  // VP-WORLD-01: Operations Center
  it("VP-WORLD-01-POS-001: Operations Center is available", () => {
    const ops = getOperationsCenter();
    expect(ops.available).toBe(true);
    expect(ops.id).toBe("operations-center-v1");
  });
  it("VP-WORLD-01-NEG-001: Operations Center cannot fallback", () => {
    const ops = getOperationsCenter();
    expect(ops.canFallback).toBe(false);
  });

  // VP-WORLD-02: Future City
  it("VP-WORLD-02-POS-001: Future City is available", () => {
    const future = getFutureCity();
    expect(future.available).toBe(true);
    expect(future.id).toBe("future-city-v1");
  });
  it("VP-WORLD-02-NEG-001: Future City cannot fallback", () => {
    const future = getFutureCity();
    expect(future.canFallback).toBe(false);
  });

  // VP-WORLD-03: Abstract fallback world
  it("VP-WORLD-03-POS-001: Abstract fallback is available and can fallback", () => {
    const fallback = getAbstractWorldFallback();
    expect(fallback.available).toBe(true);
    expect(fallback.canFallback).toBe(true);
  });
  it("VP-WORLD-03-NEG-001: Abstract world ID is stable", () => {
    const fallback = getAbstractWorldFallback();
    expect(fallback.id).toBe("abstract-fallback");
  });

  // VP-WORLD-04: Invalid world rejection
  it("VP-WORLD-04-POS-001: Invalid world ID is rejected", () => {
    expect(rejectInvalidWorld("unknown-world")).toBe(true);
  });
  it("VP-WORLD-04-NEG-001: Known world IDs are accepted", () => {
    expect(rejectInvalidWorld("operations-center-v1")).toBe(false);
    expect(rejectInvalidWorld("future-city-v1")).toBe(false);
  });

  // VP-WORLD-05: World state reactions
  it("VP-WORLD-05-POS-001: State reactions produce lighting metadata", () => {
    const ops = getOperationsCenter();
    const reaction = getWorldStateReaction(ops, "LISTENING");
    expect(reaction.lighting).toBe("operational");
    expect(reaction.mood).toBe("responsive");
  });
  it("VP-WORLD-05-NEG-001: Reactions include world reference", () => {
    const ops = getOperationsCenter();
    const reaction = getWorldStateReaction(ops, "IDLE");
    expect(reaction.world).toBe(ops.id);
  });

  // VP-WORLD-06: Deterministic state transitions
  it("VP-WORLD-06-POS-001: Valid transition from IDLE to LISTENING", () => {
    expect(isValidWorldStateTransition("IDLE", "LISTENING")).toBe(true);
  });
  it("VP-WORLD-06-NEG-001: Invalid transition is rejected", () => {
    expect(isValidWorldStateTransition("IDLE", "SPEAKING")).toBe(false);
  });

  // VP-WORLD-07: Lighting metadata without operational claims
  it("VP-WORLD-07-POS-001: Ambient lighting marked non-operational", () => {
    const ops = getOperationsCenter();
    const lighting = getAmbientLighting(ops, "THINKING");
    expect(lighting.operational).toBe(false);
    expect(lighting.intensity).toBe("bright");
  });
  it("VP-WORLD-07-NEG-001: Lighting intensity varies with state", () => {
    const ops = getOperationsCenter();
    const idle = getAmbientLighting(ops, "IDLE");
    const recovering = getAmbientLighting(ops, "RECOVERING");
    expect(idle.intensity).not.toEqual(recovering.intensity);
  });

  // VP-WORLD-08: Time-of-day metadata
  it("VP-WORLD-08-POS-001: Time-of-day marked presentational", () => {
    const time = getTimeOfDay(14);
    expect(time.presentational).toBe(true);
    expect(time.period).toBe("afternoon");
  });
  it("VP-WORLD-08-NEG-001: Time period varies by hour", () => {
    const morning = getTimeOfDay(9);
    const night = getTimeOfDay(22);
    expect(morning.period).not.toEqual(night.period);
  });

  // VP-AUDIO-01: Audio intent classification
  it("VP-AUDIO-01-POS-001: SPEAKING state produces speaking intent", () => {
    const intent = classifyAudioIntent("SPEAKING");
    expect(intent).toBe("intent-speaking");
  });
  it("VP-AUDIO-01-NEG-001: Different states produce different intents", () => {
    const idle = classifyAudioIntent("IDLE");
    const speaking = classifyAudioIntent("SPEAKING");
    expect(idle).not.toEqual(speaking);
  });

  // VP-AUDIO-02: Speaking timing coordination
  it("VP-AUDIO-02-POS-001: SPEAKING state allows speech", () => {
    const timing = getSpeakingTimingIntent("SPEAKING");
    expect(timing.can_speak).toBe(true);
    expect(timing.timing_constraint).toBe("strict");
  });
  it("VP-AUDIO-02-NEG-001: IDLE state disallows speech", () => {
    const timing = getSpeakingTimingIntent("IDLE");
    expect(timing.can_speak).toBe(false);
  });

  // VP-AUDIO-03: Audio ducking
  it("VP-AUDIO-03-POS-001: SPEAKING state triggers audio ducking", () => {
    expect(shouldDuckAudio("SPEAKING")).toBe(true);
  });
  it("VP-AUDIO-03-NEG-001: IDLE state does not duck audio", () => {
    expect(shouldDuckAudio("IDLE")).toBe(false);
  });

  // VP-AUDIO-04: Mute and stop audio handling
  it("VP-AUDIO-04-POS-001: Audio control intent includes mute/stop", () => {
    const control = getAudioControlIntent("IDLE");
    expect(control.can_mute).toBe(true);
    expect(control.can_stop).toBe(true);
  });
  it("VP-AUDIO-04-NEG-001: PRIVACY_RESTRICTED defaults to mute", () => {
    const control = getAudioControlIntent("PRIVACY_RESTRICTED");
    expect(control.default_mute).toBe(true);
  });

  // VP-AUDIO-05: Audio-disabled fallback
  it("VP-AUDIO-05-POS-001: SPEAKING produces captions fallback", () => {
    const alt = getAudioDisabledAlternative("SPEAKING");
    expect(alt).toBe("captions");
  });
  it("VP-AUDIO-05-NEG-001: Different states produce different fallbacks", () => {
    const speaking = getAudioDisabledAlternative("SPEAKING");
    const privacy = getAudioDisabledAlternative("PRIVACY_RESTRICTED");
    expect(speaking).not.toEqual(privacy);
  });

  // VP-AUDIO-06: Reduced-sensory audio mode
  it("VP-AUDIO-06-POS-001: Reduced sensory mode is defined", () => {
    const mode = getReducedSensoryAudioMode("IDLE");
    expect(mode).toBeDefined();
    expect(typeof mode).toBe("string");
  });
  it("VP-AUDIO-06-NEG-001: Reduced sensory is state-independent", () => {
    const mode1 = getReducedSensoryAudioMode("IDLE");
    const mode2 = getReducedSensoryAudioMode("SPEAKING");
    expect(mode1).toEqual(mode2);
  });

  // VP-AUDIO-07: Privacy and audio coordination
  it("VP-AUDIO-07-POS-001: PRIVACY_RESTRICTED restricts audio", () => {
    expect(isAudioPrivacyRestricted("PRIVACY_RESTRICTED")).toBe(true);
  });
  it("VP-AUDIO-07-NEG-001: Other states do not restrict audio", () => {
    expect(isAudioPrivacyRestricted("IDLE")).toBe(false);
  });

  // VP-AUDIO-08: Audio recovery fallback
  it("VP-AUDIO-08-POS-001: RECOVERING produces minimal ambient", () => {
    const fallback = getAudioRecoveryFallback("RECOVERING");
    expect(fallback).toBe("minimal-ambient");
  });
  it("VP-AUDIO-08-NEG-001: Non-recovering states produce no audio fallback", () => {
    const fallback = getAudioRecoveryFallback("IDLE");
    expect(fallback).toBe("none");
  });

  // VP-WORLD-09: World availability handling
  it("VP-WORLD-09-POS-001: Available world is preserved", () => {
    const ops = getOperationsCenter();
    const result = ensureWorldAvailability(ops);
    expect(result.id).toBe(ops.id);
  });
  it("VP-WORLD-09-NEG-001: Unavailable world falls back to abstract", () => {
    const unavailable = { id: "broken-world", name: "Broken", category: "abstract" as const, available: false, canFallback: false };
    const result = ensureWorldAvailability(unavailable);
    expect(result.id).toBe("abstract-fallback");
  });

  // VP-WORLD-10: Registry stability
  it("VP-WORLD-10-POS-001: World registry is stable", () => {
    expect(registryStable()).toBe(true);
  });
  it("VP-WORLD-10-NEG-001: Registry IDs are immutable", () => {
    const ops = getOperationsCenter();
    const ops2 = getOperationsCenter();
    expect(ops.id).toEqual(ops2.id);
  });

  // VP-WORLD-11: Approval coordination
  it("VP-WORLD-11-POS-001: Non-fallback world acknowledges approval", () => {
    const ops = getOperationsCenter();
    expect(worldAcknowledgesApprovalRequired(ops, "APPROVAL_REQUIRED")).toBe(true);
  });
  it("VP-WORLD-11-NEG-001: Fallback world does not enforce approval", () => {
    const fallback = getAbstractWorldFallback();
    expect(worldAcknowledgesApprovalRequired(fallback, "APPROVAL_REQUIRED")).toBe(false);
  });

  // VP-WORLD-12: Privacy coordination
  it("VP-WORLD-12-POS-001: Available world enforces privacy", () => {
    const ops = getOperationsCenter();
    expect(worldEnforcesPrivacy(ops, "PRIVACY_RESTRICTED")).toBe(true);
  });
  it("VP-WORLD-12-NEG-001: Non-private states do not trigger enforcement", () => {
    const ops = getOperationsCenter();
    expect(worldEnforcesPrivacy(ops, "IDLE")).toBe(false);
  });

  // VP-WORLD-13: Recovery coordination
  it("VP-WORLD-13-POS-001: Non-fallback world supports recovery", () => {
    const ops = getOperationsCenter();
    expect(worldSupportsRecovery(ops)).toBe(true);
  });
  it("VP-WORLD-13-NEG-001: Recovery support is consistent", () => {
    const future = getFutureCity();
    const fallback = getAbstractWorldFallback();
    expect(worldSupportsRecovery(future)).toEqual(worldSupportsRecovery(fallback));
  });

  // VP-WORLD-14: Operational-truth separation
  it("VP-WORLD-14-POS-001: Lighting is non-operational", () => {
    expect(worldOperationalTruthSeparated()).toBe(true);
  });
  it("VP-WORLD-14-NEG-001: World metadata is presentational only", () => {
    const ops = getOperationsCenter();
    const lighting = getAmbientLighting(ops, "IDLE");
    expect("operational_control" in lighting).toBe(false);
  });
});
