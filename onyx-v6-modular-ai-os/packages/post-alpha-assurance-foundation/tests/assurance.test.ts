import { describe, expect, it } from "vitest";
import {
  ASSURANCE_FLAGS,
  canonicalHash,
  createContractFingerprint,
  createEvidenceManifest,
  evaluateFreshness,
  OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY,
  projectIntegrationEligibility,
  projectOwnerBriefing,
  reconcileWorkstreams,
  validateAcceptanceRecord,
  validateFlagRegistry,
  validateWorkstream,
} from "../src/index";

const workstream = {
  id: "PA-ASSURE-01",
  lane: "ASSURANCE",
  lifecycle: "LOCALLY_VALIDATED",
  acceptanceFamilies: ["PA-ASSURE-EVIDENCE"],
  ownedFlags: ["operations_center_runtime"],
  allowedPaths: ["packages/post-alpha-assurance-foundation/**"],
  rollback: "Remove the additive package and candidate evidence.",
} as const;

describe("PA-ASSURE canonical contracts", () => {
  it("hashes equivalent inputs identically and protected changes differently", () => {
    expect(canonicalHash({ b: 2, a: 1 })).toBe(canonicalHash({ a: 1, b: 2 }));
    expect(createContractFingerprint({ policy: "v1", scope: ["a"] })).toBe(
      createContractFingerprint({ scope: ["a"], policy: "v1" }),
    );
    expect(createContractFingerprint({ policy: "v2", scope: ["a"] })).not.toBe(
      createContractFingerprint({ policy: "v1", scope: ["a"] }),
    );
  });

  it("fails closed for missing, mismatched, expired, and hash-invalid evidence", () => {
    expect(evaluateFreshness(undefined, { head: "h", tree: "t", now: "2026-09-01T00:00:00.000Z" })).toBe("NOT_ASSESSABLE");
    const evidence = { candidateHead: "h", candidateTree: "t", artifactHashValid: true, expiresAt: "2026-09-02T00:00:00.000Z" } as const;
    expect(evaluateFreshness(evidence, { head: "other", tree: "t", now: "2026-09-01T00:00:00.000Z" })).toBe("STALE");
    expect(evaluateFreshness({ ...evidence, artifactHashValid: false }, { head: "h", tree: "t", now: "2026-09-01T00:00:00.000Z" })).toBe("INVALIDATED");
    expect(evaluateFreshness(evidence, { head: "h", tree: "t", now: "2026-09-03T00:00:00.000Z" })).toBe("EXPIRED");
  });

  it("blocks integration for material, authority, security, experience, or unknown drift", () => {
    for (const drift of ["MATERIAL_DRIFT", "AUTHORITY_DRIFT", "SECURITY_DRIFT", "EXPERIENCE_DRIFT", "NOT_ASSESSABLE"] as const) {
      expect(projectIntegrationEligibility({ testsPass: true, typecheckPass: true, acceptanceComplete: true, freshness: "CURRENT", drift: [drift], flagsOff: true, rollbackDefined: true, authorityExpanded: false, contractConflicts: [] })).toBe("INTEGRATION_NOT_ELIGIBLE");
    }
  });

  it("keeps verification, blockers, disposition, and authorization separate", () => {
    const briefing = projectOwnerBriefing({
      verifiedFacts: ["tests pass"],
      blockers: ["review required"],
      ownerDisposition: "NOT_RECORDED",
      novaAnalysis: ["alternative"],
      onyxRecommendation: ["seek Rahul decision"],
      decisionsRequired: ["Rahul reviews integration"],
    });
    expect(briefing.authorization).toBe("NOT_AUTHORIZED");
    expect(briefing.ownerDisposition).toBe("NOT_RECORDED");
    expect(briefing.blockers).toEqual(["review required"]);
    expect(() => (briefing.verifiedFacts as string[]).push("authorized")).toThrow();
  });

  it("validates closed vocabularies and produces immutable manifests", () => {
    expect(() => validateWorkstream({ ...workstream, lifecycle: "DONE" as never })).toThrow();
    expect(() => validateAcceptanceRecord({ id: "AC-PA-ASSURE-UNKNOWN-001", family: "UNKNOWN" as never, requirement: "closed vocabulary", testIds: ["T-1"] })).toThrow();
    const manifest = createEvidenceManifest({ workstream, candidate: { branch: "feature", head: "h", tree: "t" }, changedPaths: [], commands: [], acceptanceCoverage: ["PA-ASSURE-EVIDENCE"], contractFingerprints: {}, featureFlags: { operations_center_runtime: "OFF" }, artifacts: [], limitations: [], freshnessDependencies: ["candidate"], invalidationTriggers: ["HEAD_CHANGE"], rollbackReady: true });
    expect(manifest.featureFlags.operations_center_runtime).toBe("OFF");
    expect(() => (manifest.changedPaths as string[]).push("other")).toThrow();
    expect(reconcileWorkstreams([workstream])).toEqual({ conflicts: [], eligibleForStage2: true });
  });

  it("owns a closed, immutable source-level flag registry for operations_center_runtime (CORR-ASSURE-001)", () => {
    expect(ASSURANCE_FLAGS).toEqual({ operations_center_runtime: "OFF" });
    expect(OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY).toEqual({ flag: "operations_center_runtime", owner: "PA-ASSURE-01", state: "OFF", presenceOwns: false });
    expect(() => (OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY as unknown as { state: string }).state = "OWNER_ACTIVE").toThrow();
    expect(() => validateFlagRegistry({ flag: "operations_center_runtime", owner: "PA-ASSURE-01", state: "OWNER_ACTIVE" as never, presenceOwns: false })).toThrow();
    expect(() => validateFlagRegistry({ flag: "operations_center_runtime", owner: "PA-PRESENCE-01" as never, state: "OFF", presenceOwns: false })).toThrow();
    expect(() => validateFlagRegistry({ flag: "operations_center_runtime", owner: "PA-ASSURE-01", state: "OFF", presenceOwns: true as never })).toThrow();
  });
});