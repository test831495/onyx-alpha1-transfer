import { describe, expect, it } from "vitest";
import {
  assertCouncilConvergence,
  assertCouncilParticipant,
  assertCouncilRecommendationPackage,
  assertSharedGovernedTaskFacts,
  assertValidCharacterContribution,
  COUNCIL_CHARACTER_ATTRIBUTIONS,
  COUNCIL_STATES,
  createCouncilRecommendationPackage,
  createCouncilSession,
  createSharedGovernedTaskFacts,
  createValidContribution,
  materialDisagreement,
  resolveCouncilSession,
  validateCouncilParticipants,
} from "../src/track-b/council-mode";

describe("Wave 3D Council Mode contracts", () => {
  it("keeps ONYX and NOVA distinct and rejects merged council personas", () => {
    expect(COUNCIL_CHARACTER_ATTRIBUTIONS).toContain("ONYX");
    expect(COUNCIL_CHARACTER_ATTRIBUTIONS).toContain("NOVA");
    expect(COUNCIL_CHARACTER_ATTRIBUTIONS).not.toContain("ONYX_NOVA_COUNCIL");

    const session = createCouncilSession({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "rs-1",
      sharedTaskContextId: "shared-task-1",
      supervisingUserId: "user-7",
      participantIds: ["onyx-p", "nova-p"],
      participantCharacterAttributions: ["ONYX", "NOVA"],
      ONYXContributionId: "contrib-onyx",
      NOVAContributionId: "contrib-nova",
      agreementRecordId: "agree-1",
      disagreementRecordId: "disagree-1",
      recommendationPackageId: "recommend-1",
      authoritativeWorkflowId: "wf-1",
      approvalId: "approval-1",
      checkpointDigest: "checkpoint-digest",
      evidenceReferences: ["ev-1"],
    });

    expect(() => validateCouncilParticipants(session.participantIds, session.participantCharacterAttributions)).not.toThrow();
    expect(() => validateCouncilParticipants(["onyx-p", "onyx-p"], ["ONYX", "ONYX"])).toThrow();
    expect(() => validateCouncilParticipants(["onyx-p"], ["ONYX"])).toThrow();

    const participant = {
      participantId: "onyx-p",
      councilSessionId: session.councilSessionId,
      agentId: "onyx-agent",
      characterAttribution: "ONYX" as const,
      personaMetadataReference: "persona-onyx",
      permissionProfileId: "perm-1",
      memoryAccessProfileId: "mem-1",
      connectorScopeIds: [],
      capabilityDeclarationIds: ["cap-1"],
      taskIds: ["task-1"],
      role: "CONTRIBUTOR" as const,
      joinedAt: "2026-01-01T00:00:00.000Z",
      status: "JOINED",
      contractVersion: "1.0.0",
    };
    expect(() => assertCouncilParticipant(participant, session)).not.toThrow();
    expect(() => assertCouncilParticipant({ ...participant, role: "P0_WRITER" }, session)).toThrow();
  });

  it("treats shared task facts as governed context, not P0 or approval", () => {
    const sharedFacts = createSharedGovernedTaskFacts({
      councilSessionId: "council-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      factReferences: ["fact-1", "fact-2"],
      canonicalSourceReferences: ["source-1", "source-2"],
      contextPackageIds: ["ctx-1"],
      permissionDecisionIds: ["perm-1"],
      memoryTierReferences: ["M2"],
      connectorScopeReferences: ["connector-1"],
      redactionDecisionIds: ["redact-1"],
      provenanceAuditIds: ["audit-1"],
    });
    expect(() => assertSharedGovernedTaskFacts(sharedFacts)).not.toThrow();
    expect(() => assertSharedGovernedTaskFacts({
      ...sharedFacts,
      factReferences: ["P0:onyx-baseline"],
    })).toThrow();
    expect(() => assertSharedGovernedTaskFacts({
      ...sharedFacts,
      factReferences: ["quarantined-ref"],
    })).toThrow();
    expect(() => assertSharedGovernedTaskFacts({
      ...sharedFacts,
      factReferences: ["tombstoned-ref"],
    })).toThrow();
  });

  it("preserves character attribution and keeps contributions advisory only", () => {
    const contribution = createValidContribution({
      councilSessionId: "council-1",
      participantId: "onyx-p",
      characterAttribution: "ONYX",
      taskIds: ["task-1"],
      contextPackageIds: ["ctx-1"],
      factReferenceIds: ["fact-1"],
      recommendationSummary: "Need a policy check before approval.",
      assumptions: ["Assumption: branch remains stable."],
      evidenceReferences: ["ev-1"],
      agreementCandidateIds: ["agree-1"],
      disagreementCandidateIds: ["disagree-1"],
      openQuestions: ["Does Rahul approve?"],
      confidenceClassification: "MEDIUM",
    });

    expect(() => assertValidCharacterContribution(contribution)).not.toThrow();
    expect(contribution.characterAttribution).toBe("ONYX");
    expect(() => assertValidCharacterContribution({ ...contribution, recommendationSummary: "P0: secret content" })).toThrow();
    expect(() => assertValidCharacterContribution({ ...contribution, recommendationSummary: "chain-of-thought hidden" })).toThrow();
  });

  it("keeps agreement and disagreement visible and escalates Rahul decisions", () => {
    const agreement = {
      agreementRecordId: "agree-1",
      councilSessionId: "council-1",
      contributionIds: ["contrib-onyx", "contrib-nova"],
      agreementPoints: ["Shared scope remains stable."],
      supportingEvidenceReferences: ["ev-1", "ev-2"],
      scopeHash: "scope-hash",
      createdAt: "2026-01-01T00:00:00.000Z",
      contractVersion: "1.0.0",
    };
    const disagreement = materialDisagreement({
      disagreementRecordId: "disagree-1",
      councilSessionId: "council-1",
      contributionIds: ["contrib-onyx", "contrib-nova"],
      disagreementPoints: ["Risk class should be downgraded."],
      conflictingEvidenceReferences: ["ev-3"],
      unresolvedQuestions: ["Who signs off?"],
      materiality: "MATERIAL",
      requiresRahulDecision: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const recommendation = createCouncilRecommendationPackage({
      councilSessionId: "council-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      orderedContributionIds: ["contrib-onyx", "contrib-nova"],
      agreementRecordId: "agree-1",
      disagreementRecordId: "disagree-1",
      agreementPoints: agreement.agreementPoints,
      disagreementPoints: disagreement.disagreementPoints,
      openQuestions: disagreement.unresolvedQuestions,
      supportingEvidenceReferences: agreement.supportingEvidenceReferences,
      conflictingEvidenceReferences: disagreement.conflictingEvidenceReferences,
      recommendationSummary: "Recommendation requires Rahul decision.",
      recommendationConfidence: "MEDIUM",
      riskClass: "R2",
      scopeHash: "scope-hash",
      approvalRequired: true,
      RahulApprovalRequired: true,
      escalationRequired: true,
    });

    expect(() => assertCouncilRecommendationPackage(recommendation)).not.toThrow();
    expect(recommendation.RahulApprovalRequired).toBe(true);
    expect(recommendation.escalationRequired).toBe(true);
    expect(recommendation.aggregateDigest).toBeDefined();
    expect(recommendation.orderedContributionIds).toEqual(["contrib-onyx", "contrib-nova"]);
  });

  it("rejects illegal council transitions and requires convergence safeguards", () => {
    const council = createCouncilSession({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "rs-1",
      sharedTaskContextId: "shared-task-1",
      supervisingUserId: "user-7",
      participantIds: ["onyx-p", "nova-p"],
      participantCharacterAttributions: ["ONYX", "NOVA"],
      ONYXContributionId: "contrib-onyx",
      NOVAContributionId: "contrib-nova",
      agreementRecordId: "agree-1",
      disagreementRecordId: "disagree-1",
      recommendationPackageId: "recommend-1",
      authoritativeWorkflowId: "wf-1",
      approvalId: "approval-1",
      checkpointDigest: "checkpoint-digest",
      evidenceReferences: ["ev-1"],
      status: "RECOMMENDATION_READY",
    });

    expect(() => resolveCouncilSession(council, "APPROVED" as any)).toThrow();
    expect(() => resolveCouncilSession(council, "REQUIRES_RAHUL_DECISION" as any)).toThrow();
    expect(() => resolveCouncilSession(council, "AWAITING_RAHUL_APPROVAL")).not.toThrow();

    const valid = {
      ...council,
      status: "AWAITING_RAHUL_APPROVAL",
      approvalId: "approval-1",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      authoritativeWorkflowId: "wf-1",
      evidenceReferences: ["ev-1"],
    } as const;
    expect(() => assertCouncilConvergence(valid as any, { hasRahulApproval: true, scopeHashMatches: true, permitted: true })).not.toThrow();
    expect(() => assertCouncilConvergence({ ...valid, status: "CREATED" } as any, { hasRahulApproval: false, scopeHashMatches: true, permitted: true })).toThrow();
  });

  it("keeps Council from mutating P0 or granting permissions", () => {
    const session = createCouncilSession({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "rs-1",
      sharedTaskContextId: "shared-task-1",
      supervisingUserId: "user-7",
      participantIds: ["onyx-p", "nova-p"],
      participantCharacterAttributions: ["ONYX", "NOVA"],
      ONYXContributionId: "contrib-onyx",
      NOVAContributionId: "contrib-nova",
      agreementRecordId: "agree-1",
      disagreementRecordId: "disagree-1",
      recommendationPackageId: "recommend-1",
      authoritativeWorkflowId: "wf-1",
      approvalId: "approval-1",
      checkpointDigest: "checkpoint-digest",
      evidenceReferences: ["ev-1"],
    });

    const invalid = { ...session, workflowId: "wf-2" };
    expect(() => assertCouncilConvergence(invalid, { hasRahulApproval: true, scopeHashMatches: true, permitted: true })).toThrow();
    expect(() => assertCouncilConvergence(session, { hasRahulApproval: true, scopeHashMatches: true, permitted: false })).toThrow();
  });

  it("exposes the supported Council states", () => {
    expect(COUNCIL_STATES).toContain("CREATED");
    expect(COUNCIL_STATES).toContain("AWAITING_RAHUL_APPROVAL");
    expect(COUNCIL_STATES).toContain("APPROVED");
    expect(COUNCIL_STATES).toContain("FAILED_SAFE");
  });
});
