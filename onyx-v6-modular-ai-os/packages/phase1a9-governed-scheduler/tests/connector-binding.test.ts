import { describe, expect, it } from "vitest";
import { evaluateConnectorBinding, evaluateConnectorIsolation } from "../src/bindings";

describe("Wave 4A connector binding", () => {
  it("accepts read-only compatible connector projections", () => {
    const result = evaluateConnectorBinding({
      connectorBindingDecisionId: "conn-binding-1",
      schedulerTaskReferenceId: "task-ref-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      providerId: "Outlook",
      accountId: "acct-prof-1",
      accountLabel: "team-mail",
      accountCategory: "PROFESSIONAL_OUTLOOK",
      connectorScopeId: "scope-outlook-prof",
      permissionMode: "READ_ONLY",
      readScopeIds: ["mail/read"],
      writeScopeIds: [],
      approvalId: "approval-1",
      sourceAttributionId: "source-1",
      parallelReadRequested: true,
      mutationRequested: false,
      mutationClassification: "SEQUENTIAL_CONNECTOR_MUTATION",
      professionalContext: true,
      personalContext: false,
      scopeHash: "scope-1",
      remoteSideEffectStatus: "NONE",
      providerOutcome: "SUCCESS",
      idempotencyKey: "idemp-1",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-1"],
    });

    expect(result.decision).toBe("CONNECTOR_READ_ELIGIBLE_AS_PROJECTION");
    expect(result.parallelReadEligible).toBe(true);
    expect(result.credentialMaterialDetected).toBe(false);
  });

  it("requires account exclusivity and serialization for connector mutations", () => {
    const result = evaluateConnectorBinding({
      connectorBindingDecisionId: "conn-binding-2",
      schedulerTaskReferenceId: "task-ref-2",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      providerId: "Outlook",
      accountId: "acct-prof-2",
      accountLabel: "team-mail-2",
      accountCategory: "PROFESSIONAL_OUTLOOK",
      connectorScopeId: "scope-outlook-prof",
      permissionMode: "ACTION_APPROVAL_REQUIRED",
      readScopeIds: ["mail/read"],
      writeScopeIds: ["mail/send"],
      approvalId: "approval-2",
      sourceAttributionId: "source-2",
      parallelReadRequested: false,
      mutationRequested: true,
      mutationClassification: "SEQUENTIAL_CONNECTOR_MUTATION",
      professionalContext: true,
      personalContext: false,
      scopeHash: "scope-2",
      remoteSideEffectStatus: "UNKNOWN",
      providerOutcome: "UNCERTAIN",
      idempotencyKey: "idemp-2",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-2"],
    });

    const isolated = evaluateConnectorIsolation(result);
    expect(isolated.mutationSerializationRequired).toBe(true);
    expect(isolated.accountExclusiveMutationRequired).toBe(true);
    expect(isolated.remoteUncertaintyDetected).toBe(true);
    expect(isolated.decision).toBe("SERIALIZATION_REQUIRED");
  });
});
