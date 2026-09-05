import { describe, expect, it } from "vitest";
import { AUDIO_CLASSES, DRONE_ROLES, DRONE_STATES, PROMPT3_ACCEPTANCE_RECORDS, SEMANTIC_STATES, buildCinematicHarness, buildOperationsCenterComposition, createAudioClassProjection, createDroneProjection, createHeroPresentation, createRiveHeroAdapter, createWorldProjection, governCinematicPerformance, mapHeroStateTokens, validatePrompt3AssetCandidate } from "../src/index";

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
  });

  it("keeps registry candidates truthful and rejects over-promotion or missing provenance", () => {
    const valid = validatePrompt3AssetCandidate({ stableId: "p3-hero-onyx-placeholder", version: "1.0.0", classification: "NON_FINAL_REFERENCE_PLACEHOLDER", provenanceStatus: "REFERENCE_METADATA_INCOMPLETE", licenseStatus: "NOT_PROMOTED", integrityHashOrPlaceholderHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", promotionStatus: "PLACEHOLDER_READY", revocationStatus: "NOT_REVOKED" });
    expect(valid.accepted).toBe(true);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, promotionStatus: "ACTIVE" }).accepted).toBe(false);
    expect(validatePrompt3AssetCandidate({ ...valid.candidate, provenanceStatus: "UNKNOWN" }).accepted).toBe(false);
  });

  it("provides governed Rive and dotLottie placeholder adapters without executable asset fabrication", () => {
    const rive = createRiveHeroAdapter({ character: "ONYX", assetAvailable: false, integrityOk: false, revoked: false });
    expect(rive.rendererState).toBe("PLACEHOLDER_READY");
    expect(rive.transition("LISTENING")).toMatchObject({ accepted: true, rendererState: "PLACEHOLDER_READY", grantsAuthority: false });
    expect(rive.transition("DANCING")).toMatchObject({ accepted: false, rendererState: "FAILED" });
    expect(DRONE_ROLES).toHaveLength(12);
    expect(DRONE_STATES).toHaveLength(10);
    expect(createDroneProjection({ role: "SECURITY", state: "BLOCKED", freshnessMs: 1, extra: "raw prompt" })).toMatchObject({ role: "SECURITY", state: "BLOCKED", privateFieldsAccepted: false, grantsAuthority: false });
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
});