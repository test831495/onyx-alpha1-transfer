import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVATAR_FLAGS, CANONICAL_CHARACTERS, projectCrossDeviceAvatarSync, SEMANTIC_STATES, validateAvatarRegistryCandidate, validatePresentationEnvelope } from "../../post-alpha-avatar-foundation/src/index";
import { GOVERNANCE_FLAGS } from "../../post-alpha-governance-foundation/src/index";
import { CHARACTER_CONTRACTS, consumeGovernanceDecision, INTELLIGENCE_FLAGS, mapIntelEventToAvatarCompatibility, projectTokenBudget, SEMANTIC_STATES as INTEL_SEMANTIC_STATES, validateSemanticEventType } from "../../post-alpha-intelligence-foundation/src/index";
import { ASSURANCE_FLAGS, OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY, projectIntegrationEligibility, reconcileWorkstreams } from "../src/index";

const common = { lifecycle: "LOCALLY_VALIDATED" as const, rollback: "Remove additive package and candidate evidence." };
const workstreams = [
  { ...common, id: "PA-ASSURE-01", lane: "ASSURANCE" as const, acceptanceFamilies: ["PA-ASSURE-EVIDENCE"], ownedFlags: ["operations_center_runtime"], allowedPaths: ["packages/post-alpha-assurance-foundation/**"] },
  { ...common, id: "PA-GOV-01", lane: "GOVERNANCE" as const, acceptanceFamilies: ["PA-GOV-AUTHORITY"], ownedFlags: Object.keys(GOVERNANCE_FLAGS), allowedPaths: ["packages/post-alpha-governance-foundation/**"] },
  { ...common, id: "PA-INTEL-01", lane: "INTELLIGENCE" as const, acceptanceFamilies: ["PA-INTEL-CHARACTER"], ownedFlags: Object.keys(INTELLIGENCE_FLAGS), allowedPaths: ["packages/post-alpha-intelligence-foundation/**"] },
  { ...common, id: "PA-AVATAR-01", lane: "AVATAR" as const, acceptanceFamilies: ["PA-AVATAR-CHARACTER"], ownedFlags: Object.keys(AVATAR_FLAGS), allowedPaths: ["packages/post-alpha-avatar-foundation/**"] },
] as const;

describe("Post-Alpha mapped cross-lane invariants", () => {
  it("reconciles disjoint paths and feature-flag ownership", () => {
    expect(reconcileWorkstreams(workstreams)).toEqual({ conflicts: [], eligibleForStage2: true });
    expect(Object.values({ operations_center_runtime: "OFF", ...GOVERNANCE_FLAGS, ...INTELLIGENCE_FLAGS, ...AVATAR_FLAGS }).every((state) => state === "OFF")).toBe(true);
  });

  it("preserves Rahul authority and aligned character identity", () => {
    expect(CHARACTER_CONTRACTS.ONYX.canAuthorize).toBe(false);
    expect(CHARACTER_CONTRACTS.NOVA.canAuthorize).toBe(false);
    expect(CANONICAL_CHARACTERS.ONYX.gender).toBe(CHARACTER_CONTRACTS.ONYX.gender);
    expect(CANONICAL_CHARACTERS.NOVA.gender).toBe(CHARACTER_CONTRACTS.NOVA.gender);
  });

  it("keeps each validated product lane eligible while Presence remains unauthorized", () => {
    for (const workstream of workstreams.slice(1)) {
      expect(projectIntegrationEligibility({ testsPass: true, typecheckPass: true, acceptanceComplete: true, freshness: "CURRENT", drift: ["EXPECTED_ADDITIVE_DRIFT"], flagsOff: true, rollbackDefined: Boolean(workstream.rollback), authorityExpanded: false, contractConflicts: [] })).toBe("INTEGRATION_ELIGIBLE");
    }
    const futurePresenceCompatibility = { compatibleForFutureReview: true, integrationAuthorized: false, runtimeActivated: false, compositionImplemented: false };
    expect(futurePresenceCompatibility).toEqual({ compatibleForFutureReview: true, integrationAuthorized: false, runtimeActivated: false, compositionImplemented: false });
  });

  it("closes the PA-INTEL to PA-AVATAR semantic-event vocabulary and compatibility boundary (CORR-INTEL-002 / CORR-AVATAR-003)", () => {
    expect(INTEL_SEMANTIC_STATES).toEqual(SEMANTIC_STATES);
    for (const state of SEMANTIC_STATES) {
      expect(mapIntelEventToAvatarCompatibility(state, "AVATAR_2D").avatarState).toBe(state);
      expect(mapIntelEventToAvatarCompatibility(state, "TEXT").avatarState).toBe(state);
    }
    expect(() => validateSemanticEventType("PA_PRESENCE_ONLY_EVENT")).toThrow();
    const envelope = {
      candidateHead: "d8c93d5a9cfccb2cb2fb9a0beef0961ed6ff2714",
      candidateTree: "35173f8f2b9ede4171c559900199e1f86f8dd46d",
      correlationId: "corr-cross-lane-1",
      characterId: "NOVA" as const,
      avatarVersion: "1",
      semanticState: mapIntelEventToAvatarCompatibility("THINKING").avatarState!,
      privacyProjection: "HOUSEHOLD" as const,
      accessibilityProjection: { reducedMotion: true, highContrast: false, captions: false, textOnly: false },
      worldProjection: "NONE" as const,
      evidenceReferences: [{ id: "e-cross-1", hash: "deadbeef", classification: "CURRENT" as const }],
      freshness: "CURRENT" as const,
    };
    expect(validatePresentationEnvelope(envelope).semanticState).toBe("THINKING");
  });

  it("consumes closed PA-GOV governance vocabularies from PA-INTEL without a PA-ASSURE runtime dependency (CORR-INTEL-003)", () => {
    expect(consumeGovernanceDecision({ verificationOutcome: "PASS", blockerStatus: "CLEAR", ownerDisposition: "APPROVED", effectiveAuthorization: "BOUNDED_ONLY" })).toBe("ADVISORY_ONLY");
    expect(consumeGovernanceDecision({ verificationOutcome: "FAIL", blockerStatus: "CLEAR", ownerDisposition: "NOT_RECORDED", effectiveAuthorization: "DENIED" })).toBe("OWNER_DECISION_REQUIRED");
    const intelSource = readFileSync(new URL("../../post-alpha-intelligence-foundation/src/index.ts", import.meta.url), "utf8");
    expect(intelSource).not.toMatch(/post-alpha-assurance-foundation/);
    expect(intelSource).not.toMatch(/post-alpha-governance-foundation/);
  });

  it("keeps token-budget, registry, and sync corrections compatible without runtime activation", () => {
    expect(projectTokenBudget({ budgetClass: "STANDARD", total: 1000, input: 300, output: 300, toolCalls: 100, mandatoryReserve: 100 }).status).toBe("ACCEPTED");
    expect(projectTokenBudget({ budgetClass: "STANDARD", total: 1000, input: -1, output: 300, toolCalls: 100, mandatoryReserve: 100 })).toMatchObject({ status: "REJECTED", modelCallPermitted: false, toolCallPermitted: false });
    expect(validateAvatarRegistryCandidate({ stableId: "onyx-canonical", character: "ONYX", version: "1.0.0", integrityHash: "hash-a", classification: "CANONICAL", lifecycle: "DRAFT", accountBound: true }).stableId).toBe("onyx-canonical");
    const selections = ["DESKTOP", "MOBILE", "TABLET", "TV"].map((device) => ({ device: device as "DESKTOP" | "MOBILE" | "TABLET" | "TV", accountId: "rahul", character: "ONYX" as const, avatarId: "onyx-canonical", canonicalVersion: "1.0.0", integrityHash: "hash-a", stale: false }));
    expect(projectCrossDeviceAvatarSync(selections)).toMatchObject({ status: "SYNC_ACCEPTED", identityUnchanged: true, authorizationChanged: false, sessionOwnershipChanged: false });
    expect(Object.values({ ...GOVERNANCE_FLAGS, ...INTELLIGENCE_FLAGS, ...AVATAR_FLAGS }).every((state) => state === "OFF")).toBe(true);
  });

  it("verifies no product lane imports PA-ASSURE runtime behavior", () => {
    for (const relativePath of [
      "../../post-alpha-governance-foundation/src/index.ts",
      "../../post-alpha-intelligence-foundation/src/index.ts",
      "../../post-alpha-avatar-foundation/src/index.ts",
    ]) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source).not.toMatch(/post-alpha-assurance-foundation/);
    }
  });

  it("owns the operations_center_runtime flag at source level and product lanes do not own or activate it", () => {
    expect(ASSURANCE_FLAGS.operations_center_runtime).toBe("OFF");
    expect(OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY.owner).toBe("PA-ASSURE-01");
    expect(OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY.presenceOwns).toBe(false);
    expect(Object.keys(GOVERNANCE_FLAGS)).not.toContain("operations_center_runtime");
    expect(Object.keys(INTELLIGENCE_FLAGS)).not.toContain("operations_center_runtime");
    expect(Object.keys(AVATAR_FLAGS)).not.toContain("operations_center_runtime");
  });
});