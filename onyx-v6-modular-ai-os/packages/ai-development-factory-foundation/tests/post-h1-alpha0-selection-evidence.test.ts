import { describe, expect, it } from "vitest";
import {
  projectAlpha0EvidenceManifest,
  projectAlpha0ReadinessFoundation,
} from "../src/post-h1/alpha0-evidence-and-readiness-foundation";
import {
  ALPHA0_TEST_REGISTRY,
  type Alpha0TestRecord,
} from "../src/post-h1/alpha0-test-registry";
import {
  buildAlpha0DependencyPlan,
  selectAlpha0Tests,
} from "../src/post-h1/alpha0-selection-and-dependency-planner";

describe("Post-H1 Alpha 0 selection, planning, evidence, and readiness foundation", () => {
  const candidate = Object.freeze({
    repository: "test831495/onyx-alpha1-transfer",
    branch: "feature/post-h1-alpha0-validation-foundation",
    baseSha: "0240af1ac52dedb0871831932167c6e61d05e0d4",
    headSha: "0240af1ac52dedb0871831932167c6e61d05e0d4",
    changedPaths: [
      "packages/ai-development-factory-foundation/src/post-h1/alpha0-validation-contracts.ts",
      "packages/ai-development-factory-foundation/src/post-h1/alpha0-test-registry.ts",
    ],
    profiles: ["ALPHA_0_FULL_READINESS"],
  });

  it("selects mandatory R3 and R4 tests for the full readiness profile", () => {
    const selection = selectAlpha0Tests({
      candidate,
      registry: ALPHA0_TEST_REGISTRY,
      profiles: ["ALPHA_0_FULL_READINESS"],
      blockers: [],
      evidence: [],
    });

    expect(selection.authority).toBe("NON_AUTHORIZING");
    expect(selection.selectedIds.length).toBeGreaterThan(0);
    expect(selection.selectedIds).toContain("ALPHA0-REGISTRY-001");
    expect(selection.selectedIds).toContain("ALPHA0-SELECT-001");
    expect(selection.requiredPhysicalDeviceIds).toContain("ALPHA0-REGISTRY-017");
    expect(selection.requiredRestoreIds).toContain("ALPHA0-REGISTRY-018");
  });

  it("builds a deterministic dependency plan with serial and parallel stages", () => {
    const selected = selectAlpha0Tests({
      candidate,
      registry: ALPHA0_TEST_REGISTRY,
      profiles: ["ALPHA_0_HIGH_RISK"],
      blockers: [],
      evidence: [],
    });

    const plan = buildAlpha0DependencyPlan({
      selectedIds: selected.selectedIds,
      registry: ALPHA0_TEST_REGISTRY,
    });

    expect(plan.authority).toBe("NON_AUTHORIZING");
    expect(plan.stages.length).toBeGreaterThan(0);
    expect(plan.planFingerprint).toContain("alpha0");
    expect(plan.parallelGroups.length).toBeGreaterThanOrEqual(1);
  });

  it("projects evidence manifest and blocks stale or contradictory evidence", () => {
    const manifest = projectAlpha0EvidenceManifest({
      candidate,
      selectedIds: ["ALPHA0-REGISTRY-001", "ALPHA0-SELECT-001"],
      registryFingerprint: "alpha0-registry-fingerprint-test",
      profileFingerprint: "alpha0-profile-fingerprint-test",
      evaluationEpochMilliseconds: 1756512000000,
      evidence: [
        {
          id: "evidence-1",
          evidenceClass: "TARGET_LOCK",
          hash: "hash-1",
          fresh: true,
          valid: true,
        },
        {
          id: "evidence-2",
          evidenceClass: "TARGET_LOCK",
          hash: "hash-2",
          fresh: false,
          valid: true,
        },
      ],
    });

    expect(manifest.authority).toBe("NON_AUTHORIZING");
    expect(manifest.manifestHash.length).toBeGreaterThan(20);
    expect(manifest.invalidated).toBe(true);
  });

  it("returns a non-authorizing readiness foundation result and preserves the blocker override boundary", () => {
    const readiness = projectAlpha0ReadinessFoundation({
      candidate,
      profiles: ["ALPHA_0_FULL_READINESS"],
      registry: ALPHA0_TEST_REGISTRY,
      blockers: ["CRITICAL_FINDING"],
      evidence: [],
      instanceEpochMilliseconds: 1756512000000,
      selectedIds: ["ALPHA0-REGISTRY-001"],
    });

    expect(readiness.authority).toBe("NON_AUTHORIZING");
    expect(readiness.blockers).toContain("CRITICAL_FINDING");
    expect(readiness.readinessAssessmentEligible).toBe(false);
    expect(readiness.outputClaims).toEqual([]);
  });

  it("accepts deterministic equivalent input ordering and rejects cross-candidate evidence", () => {
    const first = selectAlpha0Tests({
      candidate,
      registry: ALPHA0_TEST_REGISTRY,
      profiles: ["ALPHA_0_STANDARD", "ALPHA_0_SMOKE"],
      blockers: [],
      evidence: [],
    });

    const second = selectAlpha0Tests({
      candidate: {
        ...candidate,
        changedPaths: [...candidate.changedPaths].sort(),
      },
      registry: ALPHA0_TEST_REGISTRY,
      profiles: ["ALPHA_0_SMOKE", "ALPHA_0_STANDARD"],
      blockers: [],
      evidence: [],
    });

    expect(first.selectedIds).toEqual(second.selectedIds);

    const evidence = projectAlpha0EvidenceManifest({
      candidate,
      selectedIds: ["ALPHA0-REGISTRY-001"],
      registryFingerprint: "reg-fp",
      profileFingerprint: "profile-fp",
      evaluationEpochMilliseconds: 1756512000000,
      evidence: [
        {
          id: "candidate-a-1",
          evidenceClass: "TARGET_LOCK",
          hash: "stable-hash",
          fresh: true,
          valid: true,
        },
      ],
      candidateBinding: {
        repository: "other-org/other-repo",
        branch: "main",
        baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    } as any);

    expect(evidence.invalidated).toBe(true);
  });
});
