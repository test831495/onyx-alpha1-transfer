import { describe, expect, it } from "vitest";
import {
  AVATAR_FLAGS,
  AVATAR_FRESHNESS_DEPENDENCIES,
  AVATAR_INVALIDATION_TRIGGERS,
  CANONICAL_CHARACTERS,
  negotiateCapabilities,
  projectAvatarRegistryTransition,
  projectCrossDeviceAvatarSync,
  projectPresentation,
  projectSharedRoom,
  transitionSemanticState,
  validateAvatarRegistryCandidate,
  validateAvatarSelection,
  validatePresentationEnvelope,
  validateVariantIntegrity,
} from "../src/index";

describe("PA-AVATAR presence and experience contracts", () => {
  it("preserves canonical ONYX and NOVA definitions", () => {
    expect(CANONICAL_CHARACTERS.ONYX).toMatchObject({ gender: "MALE", role: "STRATEGIC_COMPANION_AND_INTEGRATOR" });
    expect(CANONICAL_CHARACTERS.NOVA).toMatchObject({ gender: "FEMALE", role: "CREATIVE_ANALYST_AND_EXPLORER" });
  });

  it("binds selection to account, character, version, and integrity", () => {
    const selection = { accountId: "rahul", character: "ONYX", avatarId: "onyx-canonical", canonicalVersion: "1", integrityHash: "hash" } as const;
    expect(validateAvatarSelection(selection).avatarId).toBe("onyx-canonical");
    expect(() => validateAvatarSelection({ ...selection, character: "NOVA" })).toThrow();
    expect(validateVariantIntegrity({ canonicalVersion: "1", canonicalIntegrityHash: "hash", variantVersion: "1", variantIntegrityHash: "hash" })).toBe(true);
  });

  it("covers avatar registry admission and lifecycle projections", () => {
    const candidate = { stableId: "onyx-canonical", character: "ONYX", version: "1.0.0", integrityHash: "hash-a", classification: "CANONICAL", lifecycle: "DRAFT", accountBound: true } as const;
    expect(validateAvatarRegistryCandidate(candidate).classification).toBe("CANONICAL");
    expect(() => validateAvatarRegistryCandidate({ ...candidate, stableId: "nova-canonical" })).toThrow();
    expect(() => validateAvatarRegistryCandidate({ ...candidate, version: "" })).toThrow();
    expect(() => validateAvatarRegistryCandidate({ ...candidate, integrityHash: "" })).toThrow();
    expect(() => validateAvatarRegistryCandidate({ ...candidate, classification: "UNKNOWN" as never })).toThrow();
    expect(() => validateAvatarRegistryCandidate(candidate, [candidate])).toThrow();
    const registered = projectAvatarRegistryTransition(candidate, "REGISTERED");
    const accepted = projectAvatarRegistryTransition(registered, "ACCEPTED");
    const active = projectAvatarRegistryTransition(accepted, "ACTIVE");
    expect(projectAvatarRegistryTransition(active, "SUPERSEDED").lifecycle).toBe("SUPERSEDED");
    expect(projectAvatarRegistryTransition(active, "REVOKED").lifecycle).toBe("REVOKED");
    expect(projectAvatarRegistryTransition(candidate, "REJECTED").lifecycle).toBe("REJECTED");
    expect(projectAvatarRegistryTransition(projectAvatarRegistryTransition(active, "ROLLED_BACK"), "ACTIVE").lifecycle).toBe("ACTIVE");
    expect(() => projectAvatarRegistryTransition(candidate, "ACTIVE")).toThrow();
  });

  it("covers cross-device sync while preserving canonical identity and protected scopes", () => {
    const selections = ["DESKTOP", "MOBILE", "TABLET", "TV"].map((device) => ({ device: device as "DESKTOP" | "MOBILE" | "TABLET" | "TV", accountId: "rahul", character: "NOVA" as const, avatarId: "nova-canonical", canonicalVersion: "2.0.0", integrityHash: "hash-b", stale: false }));
    expect(projectCrossDeviceAvatarSync(selections)).toMatchObject({ status: "SYNC_ACCEPTED", canonicalAvatarId: "nova-canonical", canonicalVersion: "2.0.0", identityUnchanged: true, memoryScopeChanged: false, authorizationChanged: false, approvalChanged: false, sessionOwnershipChanged: false });
    expect(projectCrossDeviceAvatarSync(selections.map((selection) => selection.device === "TV" ? { ...selection, avatarId: "nova-substitute" } : selection)).status).toBe("SYNC_REJECTED");
    expect(projectCrossDeviceAvatarSync(selections.map((selection) => selection.device === "MOBILE" ? { ...selection, integrityHash: "changed" } : selection)).status).toBe("SYNC_REJECTED");
    expect(projectCrossDeviceAvatarSync(selections.map((selection) => selection.device === "TABLET" ? { ...selection, stale: true } : selection)).status).toBe("SYNC_REJECTED");
  });

  it("uses closed semantic states independent of renderers", () => {
    expect(transitionSemanticState("IDLE", "USER_STARTED_SPEAKING")).toBe("LISTENING");
    expect(transitionSemanticState("THINKING", "OWNER_APPROVAL_NEEDED")).toBe("APPROVAL_REQUIRED");
    expect(() => transitionSemanticState("IDLE", "UNKNOWN" as never)).toThrow();
  });

  it("treats TV as first-class and preserves accessibility semantics", () => {
    const capability = negotiateCapabilities({ device: "TV", renderers: ["AVATAR_2D"], audio: true, privateDisplay: false });
    expect(capability.interfaceClass).toBe("PRESENCE_INTERFACE");
    expect(capability.mirroring).toBe(false);
    expect(capability.fallbackHierarchy).toEqual(["AVATAR_2D", "TEXT", "AUDIO", "OFFLINE"]);
    const presentation = projectPresentation({ state: "SPEAKING", device: capability, accessibility: { reducedMotion: true, highContrast: true, captions: true, textOnly: false } });
    expect(presentation.semanticState).toBe("SPEAKING");
    expect(presentation.motion).toBe("REDUCED_SEMANTIC_CUES");
    expect(presentation.captions).toBe(true);
    expect(projectPresentation({ state: "PRESENTING", device: capability, accessibility: { reducedMotion: false, highContrast: false, captions: false, textOnly: true } }).renderer).toBe("TEXT");
  });

  it("prevents shared-room disclosure and keeps adapters optional and flags OFF", () => {
    expect(projectSharedRoom({ classification: "PRIVATE", text: "secret" })).toEqual({ classification: "RESTRICTED", text: "Private content available on an authorized personal device." });
    expect(Object.values(AVATAR_FLAGS).every((state) => state === "OFF")).toBe(true);
    expect(Object.keys(AVATAR_FLAGS)).toHaveLength(5);
  });

  it("binds full freshness dependencies and invalidation triggers (CORR-AVATAR-001)", () => {
    expect(AVATAR_FRESHNESS_DEPENDENCIES).toHaveLength(11);
    expect(AVATAR_INVALIDATION_TRIGGERS).toHaveLength(12);
    expect(AVATAR_INVALIDATION_TRIGGERS).toContain("CONFLICTING_CURRENT_EVIDENCE");
  });

  it("enforces the closed Presentation Envelope evidence-reference boundary (CORR-AVATAR-003)", () => {
    const envelope = {
      candidateHead: "d8c93d5a9cfccb2cb2fb9a0beef0961ed6ff2714",
      candidateTree: "35173f8f2b9ede4171c559900199e1f86f8dd46d",
      correlationId: "corr-1",
      characterId: "ONYX" as const,
      avatarVersion: "1",
      semanticState: "SPEAKING" as const,
      privacyProjection: "PUBLIC" as const,
      accessibilityProjection: { reducedMotion: false, highContrast: false, captions: true, textOnly: false },
      worldProjection: "NONE" as const,
      evidenceReferences: [{ id: "e1", hash: "abc123", classification: "CURRENT" as const }],
      freshness: "CURRENT" as const,
    };
    expect(validatePresentationEnvelope(envelope).evidenceReferences).toHaveLength(1);
    expect(() => validatePresentationEnvelope({ ...envelope, semanticState: "UNKNOWN" as never })).toThrow();
    expect(() => validatePresentationEnvelope({ ...envelope, evidenceReferences: [{ id: "e1", hash: "", classification: "CURRENT" }] })).toThrow();
    expect(() => validatePresentationEnvelope({ ...envelope, privacyProjection: "RESTRICTED", worldProjection: "AMBIENT_SYNTHETIC_ONLY" })).toThrow();
    expect(() => validatePresentationEnvelope({ ...envelope, credentials: "secret" } as never)).toThrow();
    expect(() => (validatePresentationEnvelope(envelope).evidenceReferences as unknown[]).push({})).toThrow();
  });
});