import { describe, expect, it } from "vitest";
import { evaluateCouncilBinding, evaluateCouncilEscalation } from "../src/bindings";

describe("Wave 4A council binding", () => {
  it("keeps ONYX and NOVA identities and persona contexts distinct", () => {
    const result = evaluateCouncilBinding({
      councilBindingDecisionId: "council-1",
      schedulerTaskReferenceId: "task-ref-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      presenceMode: "ONYX_AND_NOVA_COUNCIL",
      ONYXAgentIdentityId: "onyx-agent",
      NOVAAgentIdentityId: "nova-agent",
      ONYXPersonaContextId: "onyx-persona",
      NOVAPersonaContextId: "nova-persona",
      sharedTaskFactPackageId: "facts-1",
      ONYXContributionId: "onyx-contr-1",
      NOVAContributionId: "nova-contr-1",
      agreementRecordIds: ["agreement-1"],
      disagreementRecordIds: [],
      councilRecommendationId: "rec-1",
      approvalId: "approval-1",
      scopeHash: "scope-1",
      permissionDecisionIds: ["perm-1"],
      memoryDecisionIds: ["mem-1"],
      connectorDecisionIds: ["conn-1"],
      checkpointId: "chk-1",
      evidenceLineageId: "ev-1",
      promotionCandidateId: "promo-1",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-1"],
    });

    expect(result.decision).toBe("COUNCIL_BINDING_ELIGIBLE_AS_PROJECTION");
    expect(result.personaContextsSeparated).toBe(true);
    expect(result.authoritativeWorkflowId).toBe("wf-1");
  });

  it("requires Rahul escalation when disagreement changes authority", () => {
    const result = evaluateCouncilBinding({
      councilBindingDecisionId: "council-2",
      schedulerTaskReferenceId: "task-ref-2",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "sess-1",
      presenceMode: "ONYX_AND_NOVA_COUNCIL",
      ONYXAgentIdentityId: "onyx-agent",
      NOVAAgentIdentityId: "nova-agent",
      ONYXPersonaContextId: "onyx-persona",
      NOVAPersonaContextId: "nova-persona",
      sharedTaskFactPackageId: "facts-2",
      ONYXContributionId: "onyx-contr-2",
      NOVAContributionId: "nova-contr-2",
      agreementRecordIds: [],
      disagreementRecordIds: ["disagree-1"],
      councilRecommendationId: "rec-2",
      approvalId: "approval-2",
      scopeHash: "scope-2",
      permissionDecisionIds: ["perm-2"],
      memoryDecisionIds: ["mem-2"],
      connectorDecisionIds: ["conn-2"],
      checkpointId: "chk-2",
      evidenceLineageId: "ev-2",
      promotionCandidateId: "promo-2",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      evidenceArtifactIds: ["evidence-2"],
    });

    const escalated = evaluateCouncilEscalation(result);
    expect(escalated.RahulDecisionRequired).toBe(true);
    expect(escalated.decision).toBe("RAHUL_DECISION_REQUIRED");
  });
});
