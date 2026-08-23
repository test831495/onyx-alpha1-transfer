import { describe, expect, it } from "vitest";
import { evaluateMemoryBinding, revalidateMemoryReferences } from "../src/bindings";

describe("Wave 4A memory binding", () => {
  it("accepts stable reference-only memory projections", () => {
    const result = evaluateMemoryBinding({
      memoryBindingDecisionId: "mem-binding-1",
      schedulerTaskReferenceId: "task-ref-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      agentIdentityId: "agent-onyx",
      personaContextId: "persona-onyx",
      memoryRecordIds: ["mem-1", "mem-2"],
      memoryTierIds: ["M2", "M4"],
      memoryAccessProfileId: "mem-access-1",
      contextPackageId: "ctx-1",
      contextProvenanceDecisionId: "ctx-prov-1",
      permissionDecisionId: "perm-1",
      retentionPolicyId: "ret-1",
      poisoningDecisionIds: [],
      quarantineDecisionIds: [],
      tombstoneDecisionIds: [],
      canonicalSourceReferenceIds: ["source-1"],
      operationalLedgerReferenceIds: ["ledger-1"],
      scopeHash: "scope-abc",
      requestedOperation: "READ_ONLY_MEMORY_ELIGIBLE_AS_PROJECTION",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-1"],
    });

    expect(result.decision).toBe("MEMORY_REFERENCE_ELIGIBLE_AS_PROJECTION");
    expect(result.accessProfileValid).toBe(true);
    expect(result.memoryAuthorityGranted).toBe(false);
    expect(result.P0WriterPathPresent).toBe(false);
  });

  it("rejects tombstoned or deleted memory and enforces non-resurrection", () => {
    const result = evaluateMemoryBinding({
      memoryBindingDecisionId: "mem-binding-2",
      schedulerTaskReferenceId: "task-ref-2",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      agentIdentityId: "agent-onyx",
      personaContextId: "persona-onyx",
      memoryRecordIds: ["mem-deleted"],
      memoryTierIds: ["M2"],
      memoryAccessProfileId: "mem-access-1",
      contextPackageId: "ctx-1",
      contextProvenanceDecisionId: "ctx-prov-1",
      permissionDecisionId: "perm-1",
      retentionPolicyId: "ret-1",
      poisoningDecisionIds: [],
      quarantineDecisionIds: [],
      tombstoneDecisionIds: ["tomb-1"],
      canonicalSourceReferenceIds: ["source-1"],
      operationalLedgerReferenceIds: ["ledger-1"],
      scopeHash: "scope-xyz",
      requestedOperation: "READ_ONLY_MEMORY_ELIGIBLE_AS_PROJECTION",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-2"],
    });

    expect(result.decision).toBe("DENIED_TOMBSTONED");
    expect(result.tombstoneClear).toBe(false);
    expect(result.denialReasons).toContain("tombstoned-memory");
  });

  it("revalidates stale memory on restart and prevents resurrection", () => {
    const decision = revalidateMemoryReferences({
      schedulerTaskReferenceId: "task-ref-3",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      memoryRecordIds: ["mem-deleted"],
      memoryTierIds: ["M2"],
      memoryAccessProfileId: "mem-access-1",
      contextPackageId: "ctx-1",
      contextProvenanceDecisionId: "ctx-prov-1",
      permissionDecisionId: "perm-1",
      retentionPolicyId: "ret-1",
      poisoningDecisionIds: [],
      quarantineDecisionIds: [],
      tombstoneDecisionIds: ["tomb-1"],
      canonicalSourceReferenceIds: ["source-1"],
      operationalLedgerReferenceIds: ["ledger-1"],
      scopeHash: "scope-xyz",
      reason: "scheduler-restart",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-3"],
    });

    expect(decision.revalidationRequired).toBe(true);
    expect(decision.memoryAuthorityGranted).toBe(false);
    expect(decision.denialReasons).toContain("deleted-memory-or-tombstone");
  });
});
