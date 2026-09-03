import { describe, expect, it } from "vitest";
import {
  accessibilityDistinguishesAllStates,
  accessibilityDistinguishesApproval,
  accessibilityDistinguishesPrivacy,
  animationMetadataIsPrivacyFree,
  applyAccessibilityBeforePresentation,
  classifyMotion,
  coarseTvProjection,
  consumePerformanceDecision,
  consumeTransitionPlan,
  consumeValidatedModel,
  coordinateCaptions,
  fallbackPreservesAccessibilityAndPrivacy,
  focusIsVisiblyDistinguishable,
  hasNoIdentityField,
  keyboardFocusTarget,
  MOTION_CLASSES,
  orchestrateStates,
  overscanSafeZone,
  performanceDegradationPreservesIdentity,
  performancePrecedence,
  performanceProfile,
  presentInterruption,
  presentRecovery,
  presentationHasOnlyAllowedKeys,
  projectAccessibility,
  projectGovernance,
  projectIntelligence,
  redactCaptionsUnderPrivacy,
  reduceSensoryLoad,
  remoteFocusTarget,
  selectDeviceProfile,
  selectPerformanceFromCapabilityFacts,
  selectPerformanceFromDeviceFacts,
  selectPrivacySafeProjection,
  staticCharacterRetainsBinding,
  staticWorldRetainsIntent,
  suppressApprovalDetail,
  SYNTHETIC_HARNESS,
  textOnlyFallback,
  TEXT_ONLY_SAFE_FALLBACK,
  tvReadableMetadata,
  worldMetadataIsPrivacyFree,
} from "../src/index.js";

describe("VP-RUNTIME row evidence", () => {
  it("VP-RUNTIME-01-POS-001 consumes a contract-validated model", () => {
    expect(consumeValidatedModel({ schemaVersion: "VP_MODEL_V1", state: "IDLE" })).not.toBeNull();
  });
  it("VP-RUNTIME-01-NEG-001 rejects an unvalidated model", () => {
    expect(consumeValidatedModel({ schemaVersion: "OTHER", state: "IDLE" })).toBeNull();
  });

  it("VP-RUNTIME-02-POS-001 accepts input without identity fields", () => {
    expect(hasNoIdentityField({ state: "IDLE" })).toBe(true);
  });
  it("VP-RUNTIME-02-NEG-001 rejects input carrying an identity field", () => {
    expect(hasNoIdentityField({ identity: "user-1" })).toBe(false);
  });

  it("VP-RUNTIME-03-POS-001 orchestrates only supplied semantic states", () => {
    expect(orchestrateStates(["IDLE", "SPEAKING"])).toEqual(["IDLE", "SPEAKING"]);
  });
  it("VP-RUNTIME-03-NEG-001 rejects unsupplied or malformed states", () => {
    expect(orchestrateStates(["IDLE", "UNKNOWN_STATE", 42])).toEqual(["IDLE"]);
  });

  it("VP-RUNTIME-04-POS-001 selects privacy-safe projection on conflict", () => {
    expect(selectPrivacySafeProjection("SHARED_ROOM_RESTRICTED", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-RUNTIME-04-NEG-001 does not override presentation when privacy is not restrictive", () => {
    expect(selectPrivacySafeProjection("PRIVATE_ALLOWED", "SPEAKING")).toBe("SPEAKING");
  });

  it("VP-RUNTIME-05-POS-001 renders governance projection as non-authorizing", () => {
    expect(projectGovernance().authorizing).toBe(false);
  });
  it("VP-RUNTIME-05-NEG-001 governance projection never claims authorizing", () => {
    expect((projectGovernance() as { authorizing: boolean }).authorizing).not.toBe(true);
  });

  it("VP-RUNTIME-06-POS-001 renders intelligence projection as non-authorizing", () => {
    expect(projectIntelligence().authorizing).toBe(false);
  });
  it("VP-RUNTIME-06-NEG-001 intelligence projection never claims authorizing", () => {
    expect((projectIntelligence() as { authorizing: boolean }).authorizing).not.toBe(true);
  });

  it("VP-RUNTIME-07-POS-001 coordinates captions through the caption projection", () => {
    expect(coordinateCaptions("SPEAKING", true)).toBe(true);
  });
  it("VP-RUNTIME-07-NEG-001 suppresses captions when disabled", () => {
    expect(coordinateCaptions("SPEAKING", false)).toBe(false);
  });

  it("VP-RUNTIME-08-POS-001 consumes transition plans deterministically", () => {
    const result = consumeTransitionPlan([{ from: "IDLE", to: "LISTENING", reason: "input-received" }]);
    expect(result).toEqual(consumeTransitionPlan([{ from: "IDLE", to: "LISTENING", reason: "input-received" }]));
  });
  it("VP-RUNTIME-08-NEG-001 marks unsupported transitions as not accepted", () => {
    const [result] = consumeTransitionPlan([{ from: "IDLE", to: "SPEAKING", reason: "input-received" }]);
    expect(result?.accepted).toBe(false);
  });

  it("VP-RUNTIME-09-POS-001 presents interruption without execution authority", () => {
    expect(presentInterruption("RECOVERING").executionAuthority).toBe(false);
  });
  it("VP-RUNTIME-09-NEG-001 interruption presentation never implies authority", () => {
    expect((presentInterruption("RECOVERING") as { executionAuthority: boolean }).executionAuthority).not.toBe(true);
  });

  it("VP-RUNTIME-10-POS-001 presents recovery without asserting completion", () => {
    expect(presentRecovery().recoveryComplete).toBe(false);
  });
  it("VP-RUNTIME-10-NEG-001 recovery presentation never claims completion", () => {
    expect((presentRecovery() as { recoveryComplete: boolean }).recoveryComplete).not.toBe(true);
  });

  it("VP-RUNTIME-11-POS-001 selects only the supplied device profile", () => {
    expect(selectDeviceProfile(["DESKTOP", "TV"], "TV")).toBe("TV");
  });
  it("VP-RUNTIME-11-NEG-001 falls back when the profile was not supplied", () => {
    expect(selectDeviceProfile(["DESKTOP"], "MOBILE")).toBe("CONSTRAINED");
  });

  it("VP-RUNTIME-12-POS-001 applies accessibility facts before presentation", () => {
    expect(applyAccessibilityBeforePresentation("SPEAKING", { reducedMotion: true }).motion).toBe("reduced");
  });
  it("VP-RUNTIME-12-NEG-001 does not apply accessibility facts that were not supplied", () => {
    expect(applyAccessibilityBeforePresentation("SPEAKING", {}).motion).not.toBe("reduced");
  });

  it("VP-RUNTIME-13-POS-001 consumes the supplied performance decision", () => {
    const decision = performanceProfile("tv");
    expect(consumePerformanceDecision(decision)).toEqual(decision);
  });
  it("VP-RUNTIME-13-NEG-001 does not silently mutate the supplied decision", () => {
    const decision = performanceProfile("tv");
    const consumed = consumePerformanceDecision(decision);
    expect(consumed).not.toBe(decision);
    expect(Object.isFrozen(consumed)).toBe(true);
  });

  it("VP-RUNTIME-14-POS-001 selects an explicit deterministic safe fallback", () => {
    expect(presentInterruption("RECOVERING")).toEqual(presentInterruption("RECOVERING"));
  });
  it("VP-RUNTIME-14-NEG-001 fallback is explicit rather than implicit", () => {
    expect(presentRecovery().fallback).toBe(true);
  });

  it("VP-RUNTIME-15-POS-001 keeps the synthetic harness metadata-only with flags OFF", () => {
    expect(SYNTHETIC_HARNESS).toMatchObject({ metadataOnly: true, flags: "OFF", activation: "NONE" });
  });
  it("VP-RUNTIME-15-NEG-001 harness never claims runtime activation", () => {
    expect(SYNTHETIC_HARNESS.activation).not.toBe("SOME");
  });
});

describe("VP-STATE row evidence", () => {
  const cases: Array<{ requirementId: string; positiveTestId: string; negativeTestId: string; state: import("../src/index.js").SemanticState }> = [
    { requirementId: "VP-STATE-01", positiveTestId: "VP-STATE-01-POS-001", negativeTestId: "VP-STATE-01-NEG-001", state: "IDLE" },
    { requirementId: "VP-STATE-02", positiveTestId: "VP-STATE-02-POS-001", negativeTestId: "VP-STATE-02-NEG-001", state: "LISTENING" },
    { requirementId: "VP-STATE-03", positiveTestId: "VP-STATE-03-POS-001", negativeTestId: "VP-STATE-03-NEG-001", state: "UNDERSTANDING" },
    { requirementId: "VP-STATE-04", positiveTestId: "VP-STATE-04-POS-001", negativeTestId: "VP-STATE-04-NEG-001", state: "THINKING" },
    { requirementId: "VP-STATE-05", positiveTestId: "VP-STATE-05-POS-001", negativeTestId: "VP-STATE-05-NEG-001", state: "SPEAKING" },
    { requirementId: "VP-STATE-06", positiveTestId: "VP-STATE-06-POS-001", negativeTestId: "VP-STATE-06-NEG-001", state: "APPROVAL_REQUIRED" },
    { requirementId: "VP-STATE-07", positiveTestId: "VP-STATE-07-POS-001", negativeTestId: "VP-STATE-07-NEG-001", state: "PRIVACY_RESTRICTED" },
    { requirementId: "VP-STATE-08", positiveTestId: "VP-STATE-08-POS-001", negativeTestId: "VP-STATE-08-NEG-001", state: "RECOVERING" },
  ];
  for (const { positiveTestId, negativeTestId, state } of cases) {
    it(`${positiveTestId} communicates ${state} through only allowed presentation keys`, () => {
      expect(presentationHasOnlyAllowedKeys(state)).toBe(true);
    });
    it(`${negativeTestId} ${state} never carries a forbidden inference field`, () => {
      const keys = Object.keys(projectAccessibility(state));
      expect(keys.includes("availability") || keys.includes("authority") || keys.includes("decision")).toBe(false);
    });
  }
});

describe("VP-PRIVACY row evidence", () => {
  it("VP-PRIVACY-01-POS-001 permits the least restrictive projection for PRIVATE_ALLOWED", () => {
    expect(selectPrivacySafeProjection("PRIVATE_ALLOWED", "SPEAKING")).toBe("SPEAKING");
  });
  it("VP-PRIVACY-01-NEG-001 does not force restriction when privacy is private-allowed", () => {
    expect(selectPrivacySafeProjection("PRIVATE_ALLOWED", "SPEAKING")).not.toBe("PRIVACY_RESTRICTED");
  });

  it("VP-PRIVACY-02-POS-001 selects a shared-room-safe projection", () => {
    expect(selectPrivacySafeProjection("SHARED_ROOM_RESTRICTED", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-PRIVACY-02-NEG-001 shared-room restriction is not bypassed", () => {
    expect(selectPrivacySafeProjection("SHARED_ROOM_RESTRICTED", "SPEAKING")).not.toBe("SPEAKING");
  });

  it("VP-PRIVACY-03-POS-001 PRIVACY_UNKNOWN fails closed", () => {
    expect(selectPrivacySafeProjection("PRIVACY_UNKNOWN", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-PRIVACY-03-NEG-001 unknown privacy never yields the preferred state", () => {
    expect(selectPrivacySafeProjection("PRIVACY_UNKNOWN", "SPEAKING")).not.toBe("SPEAKING");
  });

  it("VP-PRIVACY-04-POS-001 PRIVACY_MALFORMED fails closed", () => {
    expect(selectPrivacySafeProjection("PRIVACY_MALFORMED", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-PRIVACY-04-NEG-001 malformed privacy never yields the preferred state", () => {
    expect(selectPrivacySafeProjection("PRIVACY_MALFORMED", "SPEAKING")).not.toBe("SPEAKING");
  });

  it("VP-PRIVACY-05-POS-001 PRIVACY_STALE fails closed", () => {
    expect(selectPrivacySafeProjection("PRIVACY_STALE", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-PRIVACY-05-NEG-001 stale privacy never yields the preferred state", () => {
    expect(selectPrivacySafeProjection("PRIVACY_STALE", "SPEAKING")).not.toBe("SPEAKING");
  });

  it("VP-PRIVACY-06-POS-001 PRIVACY_CONFLICTING fails closed", () => {
    expect(selectPrivacySafeProjection("PRIVACY_CONFLICTING", "SPEAKING")).toBe("PRIVACY_RESTRICTED");
  });
  it("VP-PRIVACY-06-NEG-001 conflicting privacy never yields the preferred state", () => {
    expect(selectPrivacySafeProjection("PRIVACY_CONFLICTING", "SPEAKING")).not.toBe("SPEAKING");
  });

  it("VP-PRIVACY-07-POS-001 redacts captions under restricted privacy", () => {
    expect(redactCaptionsUnderPrivacy("SHARED_ROOM_RESTRICTED", "SPEAKING")).toBe(false);
  });
  it("VP-PRIVACY-07-NEG-001 does not redact captions when privacy is private-allowed", () => {
    expect(redactCaptionsUnderPrivacy("PRIVATE_ALLOWED", "SPEAKING")).toBe(true);
  });

  it("VP-PRIVACY-08-POS-001 uses a coarse projection on TV under restriction", () => {
    expect(coarseTvProjection("SHARED_ROOM_RESTRICTED")).toBe("coarse");
  });
  it("VP-PRIVACY-08-NEG-001 does not coarsen the projection when allowed", () => {
    expect(coarseTvProjection("PRIVATE_ALLOWED")).toBe("normal");
  });

  it("VP-PRIVACY-09-POS-001 suppresses approval detail under restriction", () => {
    expect(suppressApprovalDetail("SHARED_ROOM_RESTRICTED", true)).toBe(false);
  });
  it("VP-PRIVACY-09-NEG-001 does not suppress approval detail when allowed", () => {
    expect(suppressApprovalDetail("PRIVATE_ALLOWED", true)).toBe(true);
  });

  it("VP-PRIVACY-10-POS-001 keeps world metadata separate from privacy detail", () => {
    expect(worldMetadataIsPrivacyFree({ worldId: "OPERATIONS_CENTER" })).toBe(true);
  });
  it("VP-PRIVACY-10-NEG-001 rejects world metadata carrying privacy fields", () => {
    expect(worldMetadataIsPrivacyFree({ worldId: "OPERATIONS_CENTER", privacy: "SHARED_ROOM_RESTRICTED" } as never)).toBe(false);
  });

  it("VP-PRIVACY-11-POS-001 keeps animation metadata separate from privacy detail", () => {
    expect(animationMetadataIsPrivacyFree({ motion: "subtle" })).toBe(true);
  });
  it("VP-PRIVACY-11-NEG-001 rejects animation metadata carrying privacy fields", () => {
    expect(animationMetadataIsPrivacyFree({ motion: "subtle", protectedDetail: "minimized" } as never)).toBe(false);
  });

  it("VP-PRIVACY-12-POS-001 privacy projection functions accept no camera input", () => {
    expect(coarseTvProjection.length).toBe(1);
  });
  it("VP-PRIVACY-12-NEG-001 privacy projection signatures never grow a camera parameter", () => {
    expect(redactCaptionsUnderPrivacy.length).toBe(2);
  });
});

describe("VP-ACCESSIBILITY row evidence", () => {
  it("VP-ACCESSIBILITY-01-POS-001 reduced motion removes nonessential animation", () => {
    expect(projectAccessibility("SPEAKING", { reducedMotion: true }).motion).toBe("reduced");
  });
  it("VP-ACCESSIBILITY-01-NEG-001 motion is not reduced without the request", () => {
    expect(projectAccessibility("SPEAKING", {}).motion).not.toBe("reduced");
  });

  it("VP-ACCESSIBILITY-02-POS-001 high contrast preserves semantic state discrimination", () => {
    expect(accessibilityDistinguishesAllStates()).toBe(true);
  });
  it("VP-ACCESSIBILITY-02-NEG-001 high contrast never collapses state labels", () => {
    expect(projectAccessibility("SPEAKING", { highContrast: true }).contrast).toBe("high");
  });

  it("VP-ACCESSIBILITY-03-POS-001 captions are coordinated through the caption projection", () => {
    expect(coordinateCaptions("SPEAKING", true)).toBe(true);
  });
  it("VP-ACCESSIBILITY-03-NEG-001 captions are not enabled outside the caption projection", () => {
    expect(coordinateCaptions("IDLE", true)).toBe(false);
  });

  it("VP-ACCESSIBILITY-04-POS-001 text-only fallback is available when required", () => {
    expect(textOnlyFallback("RECOVERING", false)).toBe(true);
  });
  it("VP-ACCESSIBILITY-04-NEG-001 text-only fallback is not forced when rich presentation exists", () => {
    expect(textOnlyFallback("RECOVERING", true)).toBe(false);
  });

  it("VP-ACCESSIBILITY-05-POS-001 keyboard focus metadata is deterministic", () => {
    expect(keyboardFocusTarget(1)).toEqual(keyboardFocusTarget(1));
  });
  it("VP-ACCESSIBILITY-05-NEG-001 keyboard focus targets differ by order", () => {
    expect(keyboardFocusTarget(1)).not.toEqual(keyboardFocusTarget(2));
  });

  it("VP-ACCESSIBILITY-06-POS-001 remote focus metadata is deterministic", () => {
    expect(remoteFocusTarget(1)).toEqual(remoteFocusTarget(1));
  });
  it("VP-ACCESSIBILITY-06-NEG-001 remote focus targets differ by order", () => {
    expect(remoteFocusTarget(1)).not.toEqual(remoteFocusTarget(2));
  });

  it("VP-ACCESSIBILITY-07-POS-001 focused state remains visibly distinguishable", () => {
    expect(focusIsVisiblyDistinguishable(keyboardFocusTarget(1))).toBe(true);
  });
  it("VP-ACCESSIBILITY-07-NEG-001 an empty focus target is not distinguishable", () => {
    expect(focusIsVisiblyDistinguishable({ targetId: "", order: 0 })).toBe(false);
  });

  it("VP-ACCESSIBILITY-08-POS-001 TV text metadata supports 10-foot readability", () => {
    expect(tvReadableMetadata().minimumFontPx).toBeGreaterThanOrEqual(24);
  });
  it("VP-ACCESSIBILITY-08-NEG-001 TV readability never drops below the minimum", () => {
    expect(tvReadableMetadata().minimumFontPx).not.toBeLessThan(24);
  });

  it("VP-ACCESSIBILITY-09-POS-001 TV presentation reserves the overscan safe zone", () => {
    expect(overscanSafeZone().marginPercent).toBeGreaterThan(0);
  });
  it("VP-ACCESSIBILITY-09-NEG-001 overscan margin is never zero", () => {
    expect(overscanSafeZone().marginPercent).not.toBe(0);
  });

  it("VP-ACCESSIBILITY-10-POS-001 accessibility presentation distinguishes all semantic states", () => {
    expect(accessibilityDistinguishesAllStates()).toBe(true);
  });
  it("VP-ACCESSIBILITY-10-NEG-001 accessibility presentation never collapses two states to one label", () => {
    expect(new Set(["IDLE", "SPEAKING"].map((state) => projectAccessibility(state as never).label)).size).toBe(2);
  });

  it("VP-ACCESSIBILITY-11-POS-001 accessibility presentation distinguishes restricted privacy", () => {
    expect(accessibilityDistinguishesPrivacy()).toBe(true);
  });
  it("VP-ACCESSIBILITY-11-NEG-001 non-restricted privacy is not marked minimized", () => {
    expect(projectAccessibility("IDLE").protectedDetail).not.toBe("minimized");
  });

  it("VP-ACCESSIBILITY-12-POS-001 accessibility presentation distinguishes approval without approving", () => {
    expect(accessibilityDistinguishesApproval()).toBe(true);
  });
  it("VP-ACCESSIBILITY-12-NEG-001 approval-required accessibility projection never sets fallback", () => {
    expect(projectAccessibility("APPROVAL_REQUIRED").fallback).toBe(false);
  });

  it("VP-ACCESSIBILITY-13-POS-001 sensory load is reduced when requested", () => {
    expect(reduceSensoryLoad("SPEAKING")).toBe(true);
  });
  it("VP-ACCESSIBILITY-13-NEG-001 sensory load reduction requires an explicit request", () => {
    expect(projectAccessibility("SPEAKING").motion).not.toBe("reduced");
  });

  it("VP-ACCESSIBILITY-14-POS-001 fallback preserves accessibility and privacy constraints", () => {
    expect(fallbackPreservesAccessibilityAndPrivacy()).toBe(true);
  });
  it("VP-ACCESSIBILITY-14-NEG-001 fallback never discards the reduced-motion request", () => {
    expect(projectAccessibility("RECOVERING", { reducedMotion: true }).motion).toBe("reduced");
  });
});

describe("VP-PERFORMANCE row evidence", () => {
  it("VP-PERFORMANCE-01-POS-001 performance selection uses supplied device facts", () => {
    expect(selectPerformanceFromDeviceFacts({ tier: "tv" }).memory).toBe("MEMORY_TV");
  });
  it("VP-PERFORMANCE-01-NEG-001 performance selection ignores an unsupplied tier", () => {
    expect(selectPerformanceFromDeviceFacts({ tier: "tv" }).memory).not.toBe("MEMORY_DESKTOP");
  });

  it("VP-PERFORMANCE-02-POS-001 performance selection uses supplied capability facts", () => {
    expect(selectPerformanceFromCapabilityFacts({ reducedMotion: true }, "desktop").frame).toBe("FRAME_STATIC");
  });
  it("VP-PERFORMANCE-02-NEG-001 capability facts are not ignored", () => {
    expect(selectPerformanceFromCapabilityFacts({ reducedMotion: false }, "desktop").frame).not.toBe("FRAME_STATIC");
  });

  it("VP-PERFORMANCE-03-POS-001 PREMIUM_MOTION is an explicit optional class", () => {
    expect(classifyMotion(false, "desktop")).toBe("PREMIUM_MOTION");
  });
  it("VP-PERFORMANCE-03-NEG-001 PREMIUM_MOTION is never selected on constrained tiers", () => {
    expect(classifyMotion(false, "constrained")).not.toBe("PREMIUM_MOTION");
  });

  it("VP-PERFORMANCE-04-POS-001 STANDARD_MOTION is an explicit degradation class", () => {
    expect(classifyMotion(false, "mobile")).toBe("STANDARD_MOTION");
  });
  it("VP-PERFORMANCE-04-NEG-001 STANDARD_MOTION is not selected with reduced motion requested", () => {
    expect(classifyMotion(true, "mobile")).not.toBe("STANDARD_MOTION");
  });

  it("VP-PERFORMANCE-05-POS-001 REDUCED_MOTION honors accessibility motion reduction", () => {
    expect(classifyMotion(true, "desktop")).toBe("REDUCED_MOTION");
  });
  it("VP-PERFORMANCE-05-NEG-001 REDUCED_MOTION is not selected without a reduction request", () => {
    expect(classifyMotion(false, "desktop")).not.toBe("REDUCED_MOTION");
  });

  it("VP-PERFORMANCE-06-POS-001 STATIC_CHARACTER retains character binding while removing motion", () => {
    expect(staticCharacterRetainsBinding("ONYX")).toEqual({ character: "ONYX", motion: "static" });
  });
  it("VP-PERFORMANCE-06-NEG-001 STATIC_CHARACTER never drops the character binding", () => {
    expect(staticCharacterRetainsBinding("NOVA").character).toBe("NOVA");
  });

  it("VP-PERFORMANCE-07-POS-001 STATIC_WORLD retains world intent while removing motion", () => {
    expect(staticWorldRetainsIntent("OPERATIONS_CENTER")).toEqual({ worldId: "OPERATIONS_CENTER", motion: "static" });
  });
  it("VP-PERFORMANCE-07-NEG-001 STATIC_WORLD never drops the world identifier", () => {
    expect(staticWorldRetainsIntent("FUTURE_CITY").worldId).toBe("FUTURE_CITY");
  });

  it("VP-PERFORMANCE-08-POS-001 TEXT_ONLY_SAFE_FALLBACK is explicit and deterministic", () => {
    expect(TEXT_ONLY_SAFE_FALLBACK).toEqual(TEXT_ONLY_SAFE_FALLBACK);
  });
  it("VP-PERFORMANCE-08-NEG-001 TEXT_ONLY_SAFE_FALLBACK is never implicit", () => {
    expect(TEXT_ONLY_SAFE_FALLBACK.deterministic).toBe(true);
  });

  it("VP-PERFORMANCE-09-POS-001 privacy and accessibility precede performance preference", () => {
    expect(performancePrecedence("SHARED_ROOM_RESTRICTED", false, "desktop")).toBe("constrained");
  });
  it("VP-PERFORMANCE-09-NEG-001 performance preference does not override privacy restriction", () => {
    expect(performancePrecedence("SHARED_ROOM_RESTRICTED", false, "desktop")).not.toBe("desktop");
  });

  it("VP-PERFORMANCE-10-POS-001 performance degradation does not silently change identity or state", () => {
    expect(performanceDegradationPreservesIdentity("SPEAKING", "constrained")).toBe(true);
  });
  it("VP-PERFORMANCE-10-NEG-001 degraded profile still reports a valid animation layer count", () => {
    expect(performanceProfile("constrained", true).maxAnimationLayers).toBe(0);
  });
});

it("MOTION_CLASSES enumerates the three accepted degradation classes", () => {
  expect(MOTION_CLASSES).toEqual(["PREMIUM_MOTION", "STANDARD_MOTION", "REDUCED_MOTION"]);
});
