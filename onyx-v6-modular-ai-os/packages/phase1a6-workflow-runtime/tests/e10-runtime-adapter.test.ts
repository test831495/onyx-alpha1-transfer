import { describe, expect, it } from "vitest";
import { GOVERNED_REPOSITORY } from "@onyx/phase1a5-workflow-engine";
import { convertE10DryRunToRuntimeIntake, previewRuntimeSnapshotFromE10Intake, type E10DryRunReadyInput } from "../src/e10-runtime-adapter";

function dryRunReadyInput(overrides: Partial<E10DryRunReadyInput> = {}): E10DryRunReadyInput {
  return {
    runId: "run-e10-example",
    state: "DRY_RUN_READY",
    repository: GOVERNED_REPOSITORY,
    scopeHash: "scope-hash-e10",
    baseBranch: "main",
    proposedBranch: "automation/intake-example",
    plan: {
      objective: "Update the Automation Center documentation safely",
      allowedPaths: ["docs/"],
      acceptanceCriteria: ["Docs updated"],
      validationPlan: ["lint"],
      rollbackPlan: ["revert commit"],
    },
    remoteWritesPerformed: false,
    branchCreated: false,
    issueCreated: false,
    draftPrCreated: false,
    mergeAllowed: false,
    productionDeployAllowed: false,
    ...overrides,
  };
}

describe("Phase 1A.6 E.10 runtime adapter", () => {
  it("accepts a DRY_RUN_READY input and preserves repository and scope hash", () => {
    const input = dryRunReadyInput();
    const intake = convertE10DryRunToRuntimeIntake(input, input.scopeHash);
    expect(intake.repository).toBe(GOVERNED_REPOSITORY);
    expect(intake.scopeHash).toBe(input.scopeHash);
    expect(intake.remoteWritesPerformed).toBe(false);
    expect(intake.branchCreated).toBe(false);
    expect(intake.issueCreated).toBe(false);
    expect(intake.draftPrCreated).toBe(false);
    expect(intake.mergeAllowed).toBe(false);
    expect(intake.productionDeployAllowed).toBe(false);
    expect(intake.forcePushAllowed).toBe(false);
    expect(intake.branchDeletionAllowed).toBe(false);
  });

  it("rejects an input that is not in DRY_RUN_READY state", () => {
    const input = dryRunReadyInput({ state: "AWAITING_EXECUTION_APPROVAL" });
    expect(() => convertE10DryRunToRuntimeIntake(input, input.scopeHash)).toThrow();
  });

  it("rejects a repository mismatch", () => {
    const input = dryRunReadyInput({ repository: "other/repo" });
    expect(() => convertE10DryRunToRuntimeIntake(input, input.scopeHash)).toThrow();
  });

  it("rejects a scope-hash mismatch", () => {
    const input = dryRunReadyInput();
    expect(() => convertE10DryRunToRuntimeIntake(input, "unexpected-scope-hash")).toThrow();
  });

  it("exposes a pre-approval runtime snapshot preview suitable for Automation Center use", () => {
    const input = dryRunReadyInput();
    const intake = convertE10DryRunToRuntimeIntake(input, input.scopeHash);
    const snapshot = previewRuntimeSnapshotFromE10Intake(intake, new Date("2026-01-01T00:00:00.000Z"));
    expect(snapshot.repository).toBe(GOVERNED_REPOSITORY);
    expect(snapshot.scopeHash).toBe(input.scopeHash);
    expect(snapshot.mergeAllowed).toBe(false);
    expect(snapshot.productionDeployAllowed).toBe(false);
    expect(snapshot.forcePushAllowed).toBe(false);
    expect(snapshot.branchDeletionAllowed).toBe(false);
    expect(snapshot.pendingCapabilities.length).toBeGreaterThan(0);
  });
});
