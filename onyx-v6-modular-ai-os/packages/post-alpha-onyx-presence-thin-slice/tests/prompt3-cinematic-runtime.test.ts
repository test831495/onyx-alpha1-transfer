import { describe, expect, it } from "vitest";
import { AUDIO_CLASSES, DRONE_ROLES, DRONE_STATES, PROMPT3_ACCEPTANCE_RECORDS, SEMANTIC_STATES, buildCinematicHarness, buildOperationsCenterComposition, buildUniversalDeviceComposition, createAudioClassProjection, createDroneProjection, createHeroPresentation, createRiveHeroAdapter, createUniversalDeviceProfile, createWorldProjection, governCinematicPerformance, mapHeroStateTokens, validatePrompt3AssetCandidate } from "../src/index";

describe("Prompt 3 first cinematic runtime", () => {
  it("covers all ONYX and NOVA semantic states with bounded presentation tokens", () => {
    expect(SEMANTIC_STATES).toHaveLength(8);
    for (const character of ["ONYX", "NOVA"] as const) for (const state of SEMANTIC_STATES) {
      const presentation = createHeroPresentation({ character, state, reducedMotion: false, sharedRoom: true });
      expect(presentation).toMatchObject({ character, state, grantsAuthority: false, mutatesRouting: false, mutatesApproval: false });
      expect(presentation.tokens.textSafeLabel.length).toBeGreaterThan(0);
      expect(presentation.tokens.staticFallbackClass).toMatch(/^static-/);
      expect(presentation.tokens.sharedRoomPrivacyClass).toMatch(/^shared-room-/);
    }
    expect(mapHeroStateTokens("UNKNOWN")).toMatchObject({ textSafeLabel: "Unknown presentation state", staticFallbackClass: "static-unknown" });
    expect(createHeroPresentation({ character: "ONYX", state: "UNKNOWN" })).toMatchObject({ state: "UNKNOWN", stateAccepted: false });
  });

  it("keeps registry candidates truthful and rejects over-promotion or missing provenance", () => {
    const valid = validatePrompt3AssetCandidate({ stableId: "p3-hero-onyx-placeholder", version: "1.0.0", classification: "NON_FINAL_REFERENCE_PLACEHOLDER", provenanceStatus: "REFERENCE_METADATA_INCOMPLETE", licenseStatus: "NOT_PROMOTED", integrityHashOrPlaceholderHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", promotionStatus: "PLACEHOLDER_READY", revocationStatus: "NOT_REVOKED" });
    expect(valid.accepted).toBe(true);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, promotionStatus: "ACTIVE" }).accepted).toBe(false);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, provenanceStatus: "UNKNOWN" }).accepted).toBe(false);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, licenseStatus: "UNKNOWN" }).accepted).toBe(false);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, stableId: "P3 Hero" }).accepted).toBe(false);
  });

  it("provides governed Rive and dotLottie placeholder adapters without executable asset fabrication", () => {
    const rive = createRiveHeroAdapter({ character: "ONYX", assetAvailable: false, integrityOk: false, revoked: false });
    expect(rive.rendererState).toBe("PLACEHOLDER_READY");
    expect(rive.transition("LISTENING")).toMatchObject({ accepted: true, rendererState: "PLACEHOLDER_READY", grantsAuthority: false });
    expect(rive.transition("DANCING")).toMatchObject({ accepted: false, rendererState: "FAILED" });
    expect(DRONE_ROLES).toHaveLength(12);
    expect(DRONE_STATES).toHaveLength(10);
    expect(createDroneProjection({ role: "SECURITY", state: "BLOCKED", freshnessMs: 1, extra: "raw prompt" })).toMatchObject({ role: "SECURITY", state: "BLOCKED", privateFieldsAccepted: false, grantsAuthority: false });
    expect(createDroneProjection({ role: "BUILD", state: "WORKING", freshnessMs: 999_999 }).skin.statusClass).toBe("status-offline");
  });

  it("composes a bounded synthetic Operations Center with HUD, world, audio, TV, accessibility, and fallbacks", () => {
    const composition = buildOperationsCenterComposition({ characterStates: { ONYX: "APPROVAL_REQUIRED", NOVA: "PRIVACY_RESTRICTED" }, reducedMotion: true, sharedRoom: true, tv: true, tasks: [{ id: "task-1", stage: "VALIDATION", status: "RECOVERING", freshnessMs: 999_999 }], route: { status: "BLOCKED", candidateCountBand: "SMALL" }, offline: true });
    expect(composition.syntheticHarness).toBe(true);
    expect(composition.layers).toEqual(["BACKGROUND_WORLD", "HERO", "DRONE_ACTIVITY", "HUD", "ALERTS", "ACCESSIBILITY_OVERLAY"]);
    expect(composition.hud.tasks[0]).toMatchObject({ status: "STALE", rawPromptIncluded: false });
    expect(composition.tv.safeZone).toBe(true);
    expect(composition.accessibility.reducedMotion).toBe(true);
    expect(composition.fallbackLadder).toEqual(["FULL_CINEMATIC", "REDUCED_CINEMATIC", "STATIC_CHARACTER", "TEXT_SAFE_PRESENCE"]);
  });

  it("maps world, audio, and performance policy without activation or provider calls", () => {
    expect(createWorldProjection({ world: "OPERATIONS_CENTER", reducedMotion: true }).fallbackWorld).toBe("STATIC_SAFE_WORLD");
    expect(AUDIO_CLASSES).toContain("RECOVERY_ALERT");
    expect(createAudioClassProjection({ audioClass: "STATE_SPEAKING", muted: true }).output).toBe("SILENT_FALLBACK");
    expect(governCinematicPerformance({ requestedTier: "PREMIUM", reducedMotion: true, tv: true, rendererFailed: true })).toMatchObject({ tier: "SAFE", heroVisible: true, semanticStateChanged: false });
  });

  it("demonstrates complete acceptance traceability in the deterministic harness", () => {
    const harness = buildCinematicHarness();
    expect(harness.characters).toEqual(["ONYX", "NOVA"]);
    expect(harness.states).toEqual(SEMANTIC_STATES);
    expect(harness.syntheticDataDisclosed).toBe(true);
    expect(harness.noProductionActivation).toBe(true);
    expect(PROMPT3_ACCEPTANCE_RECORDS.map((record) => record.family)).toEqual(["P3-HERO-RIVE", "P3-HERO-STATES", "P3-DRONE-DOTLOTTIE", "P3-DRONE-ROLE", "P3-OPERATIONS-CENTER", "P3-HUD", "P3-WORLD", "P3-AUDIO", "P3-PERFORMANCE", "P3-TV", "P3-ACCESSIBILITY", "P3-REDUCED-MOTION", "P3-OFFLINE-FALLBACK", "P3-ASSET-GOVERNANCE", "P3-PRIVACY", "P3-INTEGRATION", "P3-CINEMATIC-SLICE"]);
    expect(PROMPT3_ACCEPTANCE_RECORDS.every((record) => record.coverage === "COVERED" || record.coverage === "DEFERRED_BY_ACCEPTED_BOUNDARY")).toBe(true);
  });

  it("projects all Prompt 4 device profiles without changing canonical identity or authority", () => {
    const profiles = ["DESKTOP_BROWSER", "PHONE_PORTRAIT", "PHONE_LANDSCAPE", "TABLET_PORTRAIT", "TABLET_LANDSCAPE", "TV_1080P", "TV_4K_SAFE_ZONE_PROFILE"] as const;
    for (const profileId of profiles) {
      const profile = createUniversalDeviceProfile(profileId);
      expect(profile.evidenceClass).toBe("SYNTHETIC_PROFILE_EVIDENCE");
      expect(profile.genuinePhysicalDeviceEvidence).toBe(false);
      expect(profile.fallbackRequirement).toBe("TEXT_SAFE");
      expect(profile.remoteAvailable).toBe(profile.deviceClass === "TV");
    }

    const composition = buildUniversalDeviceComposition({
      profileId: "TV_4K_SAFE_ZONE_PROFILE",
      characterStates: { ONYX: "APPROVAL_REQUIRED", NOVA: "PRIVACY_RESTRICTED" },
      avatarVersions: { ONYX: "1.0.0", NOVA: "1.0.0" },
      activeDroneCount: 99,
      sharedRoom: true,
      reducedMotion: true,
      rendererFailed: true,
      offline: true,
    });
    expect(composition.qualityTier).toBe("SAFE");
    expect(composition.heroes).toEqual([
      expect.objectContaining({ character: "ONYX", canonicalAvatarId: "onyx-prompt3-canonical", canonicalAvatarVersion: "1.0.0" }),
      expect.objectContaining({ character: "NOVA", canonicalAvatarId: "nova-prompt3-canonical", canonicalAvatarVersion: "1.0.0" }),
    ]);
    expect(composition.inputPolicy).toMatchObject({ remoteRequired: true, hoverRequired: false, focusVisible: true });
    expect(composition.privacy).toMatchObject({ sharedRoom: true, detail: "COARSE_ONLY", cachedPresentationCleared: true });
    expect(composition.cinematic).toMatchObject({ particles: "DISABLED", reflections: "DISABLED", energyTransfer: "STATIC_INDICATOR" });
    expect(composition.audio).toMatchObject({ output: "SILENT_FALLBACK", captions: true, alertStormPrevented: true });
    expect(composition.recovery).toMatchObject({ offline: true, renderer: "TEXT_SAFE_FALLBACK", revokedAssetReactivated: false });
    expect(composition.droneActivity).toMatchObject({ displayedCount: 2, aggregated: true, rawTaskContentExposed: false });
    expect(composition.grantsAuthority).toBe(false);
  });

  it("fails closed for a malformed device profile without claiming device evidence", () => {
    const fallback = createUniversalDeviceProfile("HOSTILE_PROFILE" as never);
    expect(fallback).toMatchObject({
      profileId: "UNSUPPORTED",
      fallbackRequirement: "TEXT_SAFE",
      evidenceClass: "NOT_YET_AVAILABLE",
      genuinePhysicalDeviceEvidence: false,
      remoteAvailable: false,
      hoverAvailable: false,
    });
  });
});