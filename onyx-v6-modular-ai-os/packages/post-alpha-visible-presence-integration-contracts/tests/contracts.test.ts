import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  DEFAULT_FRESHNESS_LIMIT_MS,
  MAX_COLLECTION_SIZE,
  SEMANTIC_STATES,
  SHARED_CONTRACT_NAMES,
  deepFreeze,
  findAuthorityKeys,
  isSha256Hex,
  redactAccessibilityForSharedRoom,
  resolveConfidence,
  validateAccessibilityProjection,
  validateIntegrationEnvelope,
  validatePresenceStateProjection,
  validateSpeakingCaptionProjection,
  type AccessibilityProjection,
  type AccountCharacterAvatarSelection,
  type SpeakingCaptionProjection,
} from "../src/index";

const base = { schemaVersion: CONTRACT_SCHEMA_VERSION, accountId: "a", deviceId: "d", cursor: 1 };

const caption: SpeakingCaptionProjection = {
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  accountId: "a",
  characterId: "ONYX",
  state: "SPEAKING",
  utteranceId: "u1",
  captionText: "Hello",
  languageTag: "en-GB",
  startOffsetMs: 0,
  durationMs: 1000,
  segments: [{ startOffsetMs: 0, durationMs: 500, text: "Hel" }, { startOffsetMs: 500, durationMs: 500, text: "lo" }],
  sourceVersion: 1,
  freshnessMs: 10,
  privacyClassification: "PUBLIC_SAFE",
  evidenceRefs: ["ev-1"],
  reducedMotionCompatible: true,
};

const targets = ["root", "panel", "agent-1"] as const;

const access: AccessibilityProjection = {
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  reducedMotion: false,
  captionsEnabled: true,
  screenReaderLabel: "ONYX presence",
  screenReaderDescription: "ONYX is speaking",
  colorIndependentStateLabel: "SPEAKING",
  keyboardFocusTarget: "root",
  keyboardFocusOrder: ["root", "panel"],
  remoteFocusTarget: "panel",
  remoteFocusOrder: ["panel", "agent-1"],
  focusVisible: true,
  tvSafeZone: false,
  minimumScale: 1,
  readabilityClass: "DESKTOP",
  sharedRoomPrivacyMode: false,
  flashingPolicy: "NO_FLASHING",
  liveRegionPoliteness: "POLITE",
  languageTag: "en-GB",
  sourceVersion: 1,
  freshnessMs: 10,
};

describe("Train 2 contracts", () => {
  it("accepts bounded provider-neutral projections", () => {
    expect(validateIntegrationEnvelope({ schemaVersion: "t2.v1", accountId: "a", deviceId: "d", cursor: 1 })).toEqual({ valid: true, errors: [] });
  });
  it("fails closed for malformed and oversized input", () => {
    expect(validateIntegrationEnvelope({ schemaVersion: "", accountId: "a" })).toEqual({ valid: false, errors: expect.any(Array) });
    expect(validateIntegrationEnvelope({ schemaVersion: "t2.v1", accountId: "x".repeat(257), deviceId: "d", cursor: -1 })).toEqual({ valid: false, errors: expect.any(Array) });
  });
});

describe("PR38 Finding D closed integration envelope schema", () => {
  it("D_UNKNOWN_FIELD_REJECTED", () => {
    expect(validateIntegrationEnvelope({ ...base, smuggled: true }).errors).toContain("UNKNOWN_FIELD:smuggled");
  });

  it("D_MULTIPLE_UNKNOWN_FIELDS_SORTED_DETERMINISTICALLY", () => {
    expect(validateIntegrationEnvelope({ ...base, zebra: 1, alpha: 2 }).errors).toEqual(["UNKNOWN_FIELD:alpha", "UNKNOWN_FIELD:zebra"]);
  });

  it("D_AUTHORITY_FIELD_REJECTION_PRECEDENCE_PRESERVED", () => {
    const errors = validateIntegrationEnvelope({ ...base, approval: true }).errors;
    expect(errors).toContain("AUTHORITY_FIELD_FORBIDDEN:approval");
    expect(errors).not.toContain("UNKNOWN_FIELD:approval");
  });

  it("D_KNOWN_FIELDS_AND_EXISTING_VALID_ENVELOPE_PRESERVED", () => {
    expect(validateIntegrationEnvelope({ ...base, character: "ONYX", state: "SPEAKING", world: "FUTURE_CITY", deviceClass: "tv", tier: "BALANCED", integrityHash: "a".repeat(64), items: ["one"] })).toEqual({ valid: true, errors: [] });
  });
});

describe("T2-CONTRACT-001 envelope vocabulary and bounds", () => {
  it("T2-CONTRACT-001-POS: accepts every closed vocabulary value", () => {
    for (const state of SEMANTIC_STATES) {
      expect(validateIntegrationEnvelope({ ...base, state }).valid).toBe(true);
    }
    expect(validateIntegrationEnvelope({ ...base, character: "NOVA", world: "FUTURE_CITY", deviceClass: "tv", tier: "BALANCED" }).valid).toBe(true);
  });

  it("T2-CONTRACT-001-NEG: rejects unknown vocabulary, bad cursor, and non-objects", () => {
    expect(validateIntegrationEnvelope(null).errors).toContain("ENVELOPE_NOT_OBJECT");
    expect(validateIntegrationEnvelope("nope").valid).toBe(false);
    expect(validateIntegrationEnvelope({ ...base, state: "DANCING" }).errors).toContain("STATE_UNKNOWN");
    expect(validateIntegrationEnvelope({ ...base, character: "ZED" }).errors).toContain("CHARACTER_UNKNOWN");
    expect(validateIntegrationEnvelope({ ...base, world: "MARS" }).errors).toContain("WORLD_UNKNOWN");
    expect(validateIntegrationEnvelope({ ...base, tier: "ULTRA" }).errors).toContain("TIER_UNKNOWN");
    expect(validateIntegrationEnvelope({ ...base, cursor: 1.5 }).errors).toContain("CURSOR_INVALID");
    expect(validateIntegrationEnvelope({ ...base, deviceId: "" }).errors).toContain("DEVICE_ID_INVALID");
  });

  it("T2-CONTRACT-001-NEG: rejects over-bound collections and bad integrity hashes", () => {
    const items = Array.from({ length: MAX_COLLECTION_SIZE + 1 }, (_, index) => index);
    expect(validateIntegrationEnvelope({ ...base, items }).errors).toContain("ITEMS_OVER_BOUND");
    expect(validateIntegrationEnvelope({ ...base, items: "no" }).errors).toContain("ITEMS_NOT_ARRAY");
    expect(validateIntegrationEnvelope({ ...base, integrityHash: "short" }).errors).toContain("INTEGRITY_HASH_INVALID");
    expect(validateIntegrationEnvelope({ ...base, integrityHash: "a".repeat(64) }).valid).toBe(true);
  });
});

describe("T2-SECURITY-001 authority confusion", () => {
  it("T2-SECURITY-001-POS: identifies forbidden authority keys", () => {
    expect(findAuthorityKeys({ approval: true })).toEqual(["approval"]);
    expect(findAuthorityKeys({ safe: 1 })).toEqual([]);
    expect(findAuthorityKeys(null)).toEqual([]);
  });

  it("T2-SECURITY-001-NEG: an authority-bearing envelope can never validate", () => {
    for (const key of ["authority", "authorized", "approval", "token", "secret", "role", "credentials", "biometric"]) {
      const result = validateIntegrationEnvelope({ ...base, [key]: "x" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.startsWith("AUTHORITY_FIELD_FORBIDDEN"))).toBe(true);
    }
  });
});

describe("T2-CONTRACT-002 presentation vs operational truth", () => {
  it("T2-CONTRACT-002-POS: accepts a pure presentation projection", () => {
    expect(validatePresenceStateProjection({ state: "THINKING", character: "ONYX", confidence: "PROJECTED" }).valid).toBe(true);
  });

  it("T2-CONTRACT-002-NEG: rejects operational truth and authority leakage", () => {
    expect(validatePresenceStateProjection({ state: "THINKING", character: "ONYX", confidence: "PROJECTED", operationalTruth: {} }).errors).toContain("OPERATIONAL_TRUTH_FORBIDDEN");
    expect(validatePresenceStateProjection({ state: "THINKING", character: "ONYX", confidence: "PROJECTED", approval: true }).valid).toBe(false);
    expect(validatePresenceStateProjection(42).valid).toBe(false);
  });
});

describe("freshness is derived only from supplied facts", () => {
  it("maps supplied freshness to confidence without ambient time", () => {
    expect(resolveConfidence(0)).toBe("VERIFIED");
    expect(resolveConfidence(10)).toBe("PROJECTED");
    expect(resolveConfidence(DEFAULT_FRESHNESS_LIMIT_MS + 1)).toBe("UNKNOWN");
    expect(resolveConfidence(-1)).toBe("UNKNOWN");
    expect(resolveConfidence(Number.NaN)).toBe("UNKNOWN");
  });

  it("validates sha256 shape and freezes outputs", () => {
    expect(isSha256Hex("a".repeat(64))).toBe(true);
    expect(isSha256Hex("A".repeat(64))).toBe(false);
    const frozen = deepFreeze({ nested: { value: 1 } });
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(validateIntegrationEnvelope(base))).toBe(true);
  });
});

describe("T2-CONTRACT-003 complete shared contract surface owned by LANE_A", () => {
  it("T2-CONTRACT-003-POS: exports all 40 frozen shared contract names", () => {
    expect(SHARED_CONTRACT_NAMES).toHaveLength(40);
    expect(new Set(SHARED_CONTRACT_NAMES).size).toBe(40);
    for (const name of [
      "AccountCharacterAvatarSelection",
      "AvatarSelectionSyncEnvelope",
      "AvatarSelectionIntegrityReceipt",
      "SpeakingCaptionProjection",
      "AccessibilityProjection",
      "DevicePresenceProjection",
      "DeviceHandoffProjection",
      "WorldTransitionProjection",
      "ApprovalPrivacyProjection",
      "PerformanceTierDecision",
      "AssetProvenanceRecord",
    ]) {
      expect(SHARED_CONTRACT_NAMES).toContain(name);
    }
  });

  it("T2-CONTRACT-003-NEG: the shared selection contract is structurally usable from LANE_A", () => {
    const selection: AccountCharacterAvatarSelection = {
      accountId: "a",
      character: "ONYX",
      avatarId: "v1",
      version: 1,
      hash: "h1",
      revoked: false,
    };
    expect(selection.character).toBe("ONYX");
    expect(SHARED_CONTRACT_NAMES).toContain("AccountCharacterAvatarSelection");
  });
});

describe("T2-ACCESSIBILITY-002 speaking caption projection", () => {
  it("T2-ACCESSIBILITY-002-POS: accepts a bounded well-ordered caption", () => {
    const result = validateSpeakingCaptionProjection(caption, { accountId: "a", characterId: "ONYX", sourceVersion: 1, revoked: false });
    expect(result).toEqual({ valid: true, errors: [] });
    expect(validateSpeakingCaptionProjection({ ...caption, state: "CAPTION_INACTIVE", captionText: "", segments: [], durationMs: 0 }, { accountId: "a", characterId: "ONYX", sourceVersion: 1, revoked: false }).valid).toBe(true);
  });

  it("T2-ACCESSIBILITY-002-NEG: rejects bad state, bounds, timing, privacy, staleness, and authority", () => {
    const facts = { accountId: "a", characterId: "ONYX", sourceVersion: 1, revoked: false } as const;
    expect(validateSpeakingCaptionProjection({ ...caption, state: "THINKING" }, facts).errors).toContain("CAPTION_STATE_UNSUPPORTED");
    expect(validateSpeakingCaptionProjection({ ...caption, captionText: "" }, facts).errors).toContain("CAPTION_TEXT_INVALID");
    expect(validateSpeakingCaptionProjection({ ...caption, captionText: "x".repeat(1000) }, facts).errors).toContain("CAPTION_TEXT_INVALID");
    expect(validateSpeakingCaptionProjection({ ...caption, startOffsetMs: -1 }, facts).errors).toContain("CAPTION_OFFSET_INVALID");
    expect(validateSpeakingCaptionProjection({ ...caption, durationMs: -5 }, facts).errors).toContain("CAPTION_DURATION_INVALID");
    expect(validateSpeakingCaptionProjection({ ...caption, segments: [{ startOffsetMs: 900, durationMs: 500, text: "x" }] }, facts).errors).toContain("CAPTION_SEGMENT_OUT_OF_RANGE");
    expect(validateSpeakingCaptionProjection({ ...caption, segments: [{ startOffsetMs: 500, durationMs: 100, text: "b" }, { startOffsetMs: 0, durationMs: 100, text: "a" }] }, facts).errors).toContain("CAPTION_SEGMENTS_UNSORTED");
    expect(validateSpeakingCaptionProjection({ ...caption, privacyClassification: "MYSTERY" }, facts).errors).toContain("CAPTION_PRIVACY_UNSUPPORTED");
    expect(validateSpeakingCaptionProjection(caption, { ...facts, revoked: true }).errors).toContain("CAPTION_SOURCE_REVOKED");
    expect(validateSpeakingCaptionProjection(caption, { ...facts, sourceVersion: 2 }).errors).toContain("CAPTION_SOURCE_STALE");
    expect(validateSpeakingCaptionProjection(caption, { ...facts, accountId: "b" }).errors).toContain("CAPTION_ACCOUNT_MISMATCH");
    expect(validateSpeakingCaptionProjection(caption, { ...facts, characterId: "NOVA" }).errors).toContain("CAPTION_CHARACTER_MISMATCH");
    expect(validateSpeakingCaptionProjection({ ...caption, freshnessMs: 999_999 }, facts).errors).toContain("CAPTION_STALE");
    expect(validateSpeakingCaptionProjection({ ...caption, approval: true }, facts).valid).toBe(false);
    expect(validateSpeakingCaptionProjection(null, facts).valid).toBe(false);
  });

  it("carries no raw audio or voiceprint material", () => {
    expect(Object.keys(caption).some((k) => /audio|voiceprint|waveform|pcm/i.test(k))).toBe(false);
  });
});

describe("T2-ACCESSIBILITY-003 accessibility projection", () => {
  it("T2-ACCESSIBILITY-003-POS: accepts desktop keyboard and TV remote projections", () => {
    expect(validateAccessibilityProjection(access, targets)).toEqual({ valid: true, errors: [] });
    const tv: AccessibilityProjection = {
      ...access,
      reducedMotion: true,
      tvSafeZone: true,
      minimumScale: 1.5,
      readabilityClass: "TEN_FOOT",
      remoteFocusTarget: "agent-1",
      remoteFocusOrder: ["agent-1", "panel"],
    };
    expect(validateAccessibilityProjection(tv, targets)).toEqual({ valid: true, errors: [] });
  });

  it("T2-ACCESSIBILITY-003-NEG: rejects missing labels, duplicate order, and unknown focus targets", () => {
    expect(validateAccessibilityProjection({ ...access, screenReaderLabel: "" }, targets).errors).toContain("SCREEN_READER_LABEL_MISSING");
    expect(validateAccessibilityProjection({ ...access, keyboardFocusOrder: ["root", "root"] }, targets).errors).toContain("KEYBOARD_FOCUS_ORDER_DUPLICATE");
    expect(validateAccessibilityProjection({ ...access, remoteFocusOrder: ["panel", "panel"] }, targets).errors).toContain("REMOTE_FOCUS_ORDER_DUPLICATE");
    expect(validateAccessibilityProjection({ ...access, remoteFocusTarget: "ghost" }, targets).errors).toContain("REMOTE_FOCUS_TARGET_UNKNOWN");
    expect(validateAccessibilityProjection({ ...access, keyboardFocusTarget: "ghost" }, targets).errors).toContain("KEYBOARD_FOCUS_TARGET_UNKNOWN");
    expect(validateAccessibilityProjection({ ...access, colorIndependentStateLabel: "" }, targets).errors).toContain("COLOR_INDEPENDENT_LABEL_MISSING");
    expect(validateAccessibilityProjection({ ...access, flashingPolicy: "ALLOW_FLASHING" }, targets).errors).toContain("FLASHING_POLICY_UNSUPPORTED");
    expect(validateAccessibilityProjection({ ...access, focusVisible: false }, targets).errors).toContain("FOCUS_NOT_VISIBLE");
    expect(validateAccessibilityProjection({ ...access, authority: true }, targets).valid).toBe(false);
    expect(validateAccessibilityProjection(null, targets).valid).toBe(false);
  });

  it("treats reduced motion as a hard ceiling and keeps captions independent of motion", () => {
    expect(validateAccessibilityProjection({ ...access, reducedMotion: true, captionsEnabled: true }, targets).valid).toBe(true);
    expect(validateAccessibilityProjection({ ...access, reducedMotion: true, captionsEnabled: false }, targets).valid).toBe(true);
    expect(validateAccessibilityProjection({ ...access, reducedMotion: true, readabilityClass: "TEN_FOOT", tvSafeZone: true, minimumScale: 1.5 }, targets).valid).toBe(true);
  });

  it("requires TV safe zone and 10-foot metadata for TEN_FOOT readability", () => {
    expect(validateAccessibilityProjection({ ...access, readabilityClass: "TEN_FOOT", tvSafeZone: false, minimumScale: 1.5 }, targets).errors).toContain("TV_SAFE_ZONE_REQUIRED");
    expect(validateAccessibilityProjection({ ...access, readabilityClass: "TEN_FOOT", tvSafeZone: true, minimumScale: 1 }, targets).errors).toContain("TEN_FOOT_SCALE_INSUFFICIENT");
  });

  it("redacts private descriptions in shared-room mode without dropping semantic state", () => {
    const redacted = redactAccessibilityForSharedRoom(access);
    expect(redacted.sharedRoomPrivacyMode).toBe(true);
    expect(redacted.screenReaderDescription).toBe("");
    expect(redacted.colorIndependentStateLabel).toBe(access.colorIndependentStateLabel);
    expect(redacted.screenReaderLabel.length).toBeGreaterThan(0);
    expect(validateAccessibilityProjection(redacted, targets).valid).toBe(true);
  });
});