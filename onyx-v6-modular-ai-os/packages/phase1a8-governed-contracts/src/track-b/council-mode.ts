import { createHash } from "node:crypto";
import { COUNCIL_MODE_CONTRACT_VERSION } from "../shared/versions";
import { digest, makeId } from "../shared/identifiers";
import { assertCouncilKeepsPersonasDistinct } from "./persona-protection";

export const COUNCIL_STATES = [
  "CREATED",
  "CONTEXT_VALIDATED",
  "CONTRIBUTIONS_PENDING",
  "CONTRIBUTIONS_COMPLETE",
  "DELIBERATION_IN_PROGRESS",
  "RECOMMENDATION_READY",
  "AWAITING_RAHUL_APPROVAL",
  "APPROVED",
  "REJECTED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "CANCELLED",
] as const;
export type CouncilState = (typeof COUNCIL_STATES)[number];

export const COUNCIL_CHARACTER_ATTRIBUTIONS = ["ONYX", "NOVA", "SYSTEM", "UNASSIGNED"] as const;
export type CouncilCharacterAttribution = (typeof COUNCIL_CHARACTER_ATTRIBUTIONS)[number];

export interface GoverningCouncilSession {
  councilSessionId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  sharedTaskContextId: string;
  supervisingUserId: string;
  participantIds: string[];
  participantCharacterAttributions: CouncilCharacterAttribution[];
  ONYXContributionId: string;
  NOVAContributionId: string;
  agreementRecordId: string;
  disagreementRecordId: string;
  recommendationPackageId: string;
  authoritativeWorkflowId: string;
  approvalId: string;
  checkpointDigest: string;
  evidenceReferences: string[];
  status: CouncilState;
  createdAt: string;
  updatedAt: string;
  contractVersion: string;
}

const LEGAL_COUNCIL_TRANSITIONS: Record<CouncilState, readonly CouncilState[]> = {
  CREATED: ["CONTEXT_VALIDATED", "FAILED_SAFE", "CANCELLED"],
  CONTEXT_VALIDATED: ["CONTRIBUTIONS_PENDING", "FAILED_SAFE", "CANCELLED"],
  CONTRIBUTIONS_PENDING: ["CONTRIBUTIONS_COMPLETE", "FAILED_SAFE", "CANCELLED"],
  CONTRIBUTIONS_COMPLETE: ["DELIBERATION_IN_PROGRESS", "FAILED_SAFE", "CANCELLED"],
  DELIBERATION_IN_PROGRESS: ["RECOMMENDATION_READY", "RECONCILIATION_REQUIRED", "FAILED_SAFE", "CANCELLED"],
  RECOMMENDATION_READY: ["AWAITING_RAHUL_APPROVAL", "RECONCILIATION_REQUIRED", "FAILED_SAFE", "CANCELLED"],
  AWAITING_RAHUL_APPROVAL: ["APPROVED", "REJECTED", "RECONCILIATION_REQUIRED", "FAILED_SAFE", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  FAILED_SAFE: [],
  RECONCILIATION_REQUIRED: ["CONTRIBUTIONS_PENDING", "DELIBERATION_IN_PROGRESS", "FAILED_SAFE", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionCouncilState(from: CouncilState, to: CouncilState): boolean {
  return LEGAL_COUNCIL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertLegalCouncilTransition(from: CouncilState, to: CouncilState): void {
  if (!canTransitionCouncilState(from, to)) {
    throw new Error(`Illegal Council transition: ${from} -> ${to}`);
  }
}

export function resolveCouncilSession(
  session: GoverningCouncilSession,
  nextStatus: CouncilState,
  options?: { hasRahulApproval?: boolean; scopeHashMatches?: boolean; exactScope?: string },
): GoverningCouncilSession {
  assertLegalCouncilTransition(session.status, nextStatus);
  if (nextStatus === "APPROVED") {
    if (session.status !== "AWAITING_RAHUL_APPROVAL") {
      throw new Error("Council agreement must not transition directly to APPROVED.");
    }
    const hasApproval = options?.hasRahulApproval ?? Boolean(session.approvalId && session.approvalId.length > 0);
    const exactScope = options?.exactScope ?? session.approvalId;
    const scopeMatches = options?.scopeHashMatches ?? Boolean(exactScope && exactScope.length > 0);
    if (!hasApproval || !scopeMatches) {
      throw new Error("APPROVED requires valid Rahul approval for the exact scope.");
    }
  }
  if (session.status === "RECOMMENDATION_READY" && nextStatus === "APPROVED") {
    throw new Error("RECOMMENDATION_READY must transition to AWAITING_RAHUL_APPROVAL before APPROVED.");
  }
  return { ...session, status: nextStatus, updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString() };
}

export function createCouncilSession(input: Partial<GoverningCouncilSession>): GoverningCouncilSession {
  const now = "2026-01-01T00:00:00.000Z";
  const councilSessionId = input.councilSessionId ?? makeId("council-session", { workflowId: input.workflowId ?? "wf", runtimeId: input.runtimeId ?? "rt" });
  const workflowId = input.workflowId ?? "wf-1";
  const runtimeId = input.runtimeId ?? "rt-1";
  const runtimeSessionId = input.runtimeSessionId ?? "session-1";
  const sharedTaskContextId = input.sharedTaskContextId ?? "shared-task-context";
  const supervisingUserId = input.supervisingUserId ?? "user-7";
  const participantIds = input.participantIds ?? ["onyx-p", "nova-p"];
  const participantCharacterAttributions = input.participantCharacterAttributions ?? ["ONYX", "NOVA"];
  const ONYXContributionId = input.ONYXContributionId ?? makeId("contribution", { character: "ONYX", session: councilSessionId });
  const NOVAContributionId = input.NOVAContributionId ?? makeId("contribution", { character: "NOVA", session: councilSessionId });
  const agreementRecordId = input.agreementRecordId ?? makeId("agreement", { session: councilSessionId });
  const disagreementRecordId = input.disagreementRecordId ?? makeId("disagreement", { session: councilSessionId });
  const recommendationPackageId = input.recommendationPackageId ?? makeId("recommendation", { session: councilSessionId });
  const authoritativeWorkflowId = input.authoritativeWorkflowId ?? workflowId;
  const approvalId = input.approvalId ?? makeId("approval", { session: councilSessionId });
  const checkpointDigest = input.checkpointDigest ?? digest({ session: councilSessionId, workflowId, runtimeId });
  const evidenceReferences = input.evidenceReferences ?? [makeId("evidence", { session: councilSessionId })];
  const status = input.status ?? "CREATED";
  return {
    councilSessionId,
    workflowId,
    runtimeId,
    runtimeSessionId,
    sharedTaskContextId,
    supervisingUserId,
    participantIds,
    participantCharacterAttributions,
    ONYXContributionId,
    NOVAContributionId,
    agreementRecordId,
    disagreementRecordId,
    recommendationPackageId,
    authoritativeWorkflowId,
    approvalId,
    checkpointDigest,
    evidenceReferences,
    status,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    contractVersion: input.contractVersion ?? COUNCIL_MODE_CONTRACT_VERSION,
  };
}

export interface CouncilParticipant {
  participantId: string;
  councilSessionId: string;
  agentId: string;
  characterAttribution: CouncilCharacterAttribution;
  personaMetadataReference: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: string[];
  capabilityDeclarationIds: string[];
  taskIds: string[];
  role: string;
  joinedAt: string;
  status: string;
  contractVersion: string;
}

const VALID_PARTICIPANT_ROLES = ["CONTRIBUTOR", "SUPERVISOR", "OBSERVOR"] as const;

export function validateCouncilParticipants(participantIds: readonly string[], attributions: readonly string[]): void {
  if (participantIds.length !== 2 || attributions.length !== 2) {
    throw new Error("Council Mode requires distinct ONYX and NOVA participants.");
  }
  if (new Set(participantIds).size !== participantIds.length) {
    throw new Error("Duplicate participant identities are not allowed.");
  }
  const sortedAttributions = [...attributions].sort();
  if (sortedAttributions[0] !== "NOVA" || sortedAttributions[1] !== "ONYX") {
    throw new Error("Distinct ONYX and NOVA character attribution is required.");
  }
  assertCouncilKeepsPersonasDistinct([...(attributions as readonly string[])]);
}

export function assertCouncilParticipant(participant: CouncilParticipant, session: GoverningCouncilSession): void {
  if (!participant.councilSessionId || !session.councilSessionId || participant.councilSessionId !== session.councilSessionId) {
    throw new Error("Participant must belong to the active Council session.");
  }
  if (participant.characterAttribution === "ONYX" && !session.participantCharacterAttributions.includes("ONYX")) {
    throw new Error("ONYX participant must be present.");
  }
  if (participant.characterAttribution === "NOVA" && !session.participantCharacterAttributions.includes("NOVA")) {
    throw new Error("NOVA participant must be present.");
  }
  if (!VALID_PARTICIPANT_ROLES.includes(participant.role as (typeof VALID_PARTICIPANT_ROLES)[number])) {
    throw new Error("Participant role does not grant valid council permissions.");
  }
  if (participant.role === "SUPERVISOR" && (!participant.permissionProfileId || !participant.memoryAccessProfileId)) {
    throw new Error("Participant role must not grant missing permissions.");
  }
  if (participant.role === "CONTRIBUTOR" && participant.capabilityDeclarationIds.length === 0) {
    throw new Error("Participant role must not grant missing permissions.");
  }
  if (participant.role === "P0_WRITER") {
    throw new Error("Participant cannot modify persona baselines.");
  }
}

export interface SharedGovernedTaskFacts {
  sharedTaskContextId: string;
  councilSessionId: string;
  workflowId: string;
  runtimeId: string;
  factReferences: string[];
  canonicalSourceReferences: string[];
  contextPackageIds: string[];
  permissionDecisionIds: string[];
  memoryTierReferences: string[];
  connectorScopeReferences: string[];
  redactionDecisionIds: string[];
  provenanceAuditIds: string[];
  createdAt: string;
  expiresAt: string;
  contractVersion: string;
}

export function createSharedGovernedTaskFacts(input: Partial<SharedGovernedTaskFacts>): SharedGovernedTaskFacts {
  const createdAt = input.createdAt ?? "2026-01-01T00:00:00.000Z";
  return {
    sharedTaskContextId: input.sharedTaskContextId ?? makeId("shared-context", { session: input.councilSessionId ?? "council-session" }),
    councilSessionId: input.councilSessionId ?? "council-session",
    workflowId: input.workflowId ?? "wf-1",
    runtimeId: input.runtimeId ?? "rt-1",
    factReferences: input.factReferences ?? ["fact-1"],
    canonicalSourceReferences: input.canonicalSourceReferences ?? ["source-1"],
    contextPackageIds: input.contextPackageIds ?? ["ctx-1"],
    permissionDecisionIds: input.permissionDecisionIds ?? ["perm-1"],
    memoryTierReferences: input.memoryTierReferences ?? ["M2"],
    connectorScopeReferences: input.connectorScopeReferences ?? ["connector-scope-1"],
    redactionDecisionIds: input.redactionDecisionIds ?? ["redaction-1"],
    provenanceAuditIds: input.provenanceAuditIds ?? ["audit-1"],
    createdAt,
    expiresAt: input.expiresAt ?? "2027-01-01T00:00:00.000Z",
    contractVersion: input.contractVersion ?? COUNCIL_MODE_CONTRACT_VERSION,
  };
}

export function assertSharedGovernedTaskFacts(facts: SharedGovernedTaskFacts): void {
  if (!facts.sharedTaskContextId || !facts.councilSessionId || !facts.workflowId || !facts.runtimeId) {
    throw new Error("Shared task facts must include the governing session metadata.");
  }
  for (const fact of facts.factReferences) {
    if (fact.startsWith("P0:")) throw new Error("Shared task facts must not become P0.");
    if (fact.includes("quarantined")) throw new Error("Quarantined references are not valid shared task facts.");
    if (fact.includes("tombstoned")) throw new Error("Tombstoned references are not valid shared task facts.");
  }
  if (facts.permissionDecisionIds.length === 0 || facts.provenanceAuditIds.length === 0) {
    throw new Error("Shared task facts require permission and provenance validation.");
  }
  if (facts.redactionDecisionIds.length === 0) {
    throw new Error("Shared task facts require redaction decisions.");
  }
}

export interface CharacterContribution {
  contributionId: string;
  councilSessionId: string;
  participantId: string;
  characterAttribution: CouncilCharacterAttribution;
  taskIds: string[];
  contextPackageIds: string[];
  factReferenceIds: string[];
  recommendationSummary: string;
  assumptions: string[];
  evidenceReferences: string[];
  agreementCandidateIds: string[];
  disagreementCandidateIds: string[];
  openQuestions: string[];
  confidenceClassification: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  contractVersion: string;
}

export function createValidContribution(input: Partial<CharacterContribution>): CharacterContribution {
  const createdAt = input.createdAt ?? "2026-01-01T00:00:00.000Z";
  return {
    contributionId: input.contributionId ?? makeId("contribution", { session: input.councilSessionId ?? "council-1", participant: input.participantId ?? "onyx-p" }),
    councilSessionId: input.councilSessionId ?? "council-1",
    participantId: input.participantId ?? "onyx-p",
    characterAttribution: input.characterAttribution ?? "ONYX",
    taskIds: input.taskIds ?? ["task-1"],
    contextPackageIds: input.contextPackageIds ?? ["ctx-1"],
    factReferenceIds: input.factReferenceIds ?? ["fact-1"],
    recommendationSummary: input.recommendationSummary ?? "Proceed with caution.",
    assumptions: input.assumptions ?? ["Assumption: branch remains stable."],
    evidenceReferences: input.evidenceReferences ?? ["ev-1"],
    agreementCandidateIds: input.agreementCandidateIds ?? [],
    disagreementCandidateIds: input.disagreementCandidateIds ?? [],
    openQuestions: input.openQuestions ?? [],
    confidenceClassification: input.confidenceClassification ?? "MEDIUM",
    createdAt,
    contractVersion: input.contractVersion ?? COUNCIL_MODE_CONTRACT_VERSION,
  };
}

export function assertValidCharacterContribution(contribution: CharacterContribution): void {
  if (contribution.characterAttribution === "SYSTEM" || contribution.characterAttribution === "UNASSIGNED") {
    throw new Error("Contribution must preserve character attribution to ONYX or NOVA.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("chain-of-thought")) {
    throw new Error("Contribution must not expose chain-of-thought.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("p0:")) {
    throw new Error("Contribution must not contain private P0 content.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("secret") || contribution.recommendationSummary.toLowerCase().includes("password")) {
    throw new Error("Contribution must not contain secrets.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("connector credential")) {
    throw new Error("Contribution must not include connector credentials.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("unsupported authority")) {
    throw new Error("Contribution must not contain unsupported authority claims.");
  }
  if (contribution.recommendationSummary.toLowerCase().includes("private user content")) {
    throw new Error("Contribution must not include unredacted private user content.");
  }
}

export interface CouncilAgreement {
  agreementRecordId: string;
  councilSessionId: string;
  contributionIds: string[];
  agreementPoints: string[];
  supportingEvidenceReferences: string[];
  scopeHash: string;
  createdAt: string;
  contractVersion: string;
}

export interface CouncilDisagreement {
  disagreementRecordId: string;
  councilSessionId: string;
  contributionIds: string[];
  disagreementPoints: string[];
  conflictingEvidenceReferences: string[];
  unresolvedQuestions: string[];
  materiality: "MATERIAL" | "NON_MATERIAL";
  requiresRahulDecision: boolean;
  createdAt: string;
  contractVersion: string;
}

export function materialDisagreement(input: Partial<CouncilDisagreement>): CouncilDisagreement {
  return {
    disagreementRecordId: input.disagreementRecordId ?? "disagree-1",
    councilSessionId: input.councilSessionId ?? "council-1",
    contributionIds: input.contributionIds ?? ["contrib-onyx", "contrib-nova"],
    disagreementPoints: input.disagreementPoints ?? ["Material concern remains unresolved."],
    conflictingEvidenceReferences: input.conflictingEvidenceReferences ?? ["ev-3"],
    unresolvedQuestions: input.unresolvedQuestions ?? ["Need Rahul decision."],
    materiality: input.materiality ?? "MATERIAL",
    requiresRahulDecision: input.requiresRahulDecision ?? true,
    createdAt: input.createdAt ?? "2026-01-01T00:00:00.000Z",
    contractVersion: input.contractVersion ?? COUNCIL_MODE_CONTRACT_VERSION,
  };
}

export interface CouncilRecommendationPackage {
  recommendationPackageId: string;
  councilSessionId: string;
  workflowId: string;
  runtimeId: string;
  orderedContributionIds: string[];
  agreementRecordId: string;
  disagreementRecordId: string;
  agreementPoints: string[];
  disagreementPoints: string[];
  openQuestions: string[];
  supportingEvidenceReferences: string[];
  conflictingEvidenceReferences: string[];
  recommendationSummary: string;
  recommendationConfidence: "LOW" | "MEDIUM" | "HIGH";
  riskClass: string;
  scopeHash: string;
  approvalRequired: boolean;
  RahulApprovalRequired: boolean;
  escalationRequired: boolean;
  aggregateDigest: string;
  createdAt: string;
  contractVersion: string;
}

export function createCouncilRecommendationPackage(input: Partial<CouncilRecommendationPackage>): CouncilRecommendationPackage {
  const orderedContributionIds = input.orderedContributionIds ?? ["contrib-onyx", "contrib-nova"];
  const supportingEvidenceReferences = input.supportingEvidenceReferences ?? [];
  const conflictingEvidenceReferences = input.conflictingEvidenceReferences ?? [];
  const recommendationSummary = input.recommendationSummary ?? "Proceed with Rahul review.";
  const aggregateDigest = createHash("sha256")
    .update(JSON.stringify({
      orderedContributionIds,
      agreementPoints: input.agreementPoints ?? [],
      disagreementPoints: input.disagreementPoints ?? [],
      openQuestions: input.openQuestions ?? [],
      supportingEvidenceReferences,
      conflictingEvidenceReferences,
      recommendationSummary,
      riskClass: input.riskClass ?? "R2",
      scopeHash: input.scopeHash ?? "scope-hash",
    }))
    .digest("hex");

  return {
    recommendationPackageId: input.recommendationPackageId ?? makeId("recommendation", { session: input.councilSessionId ?? "council-1" }),
    councilSessionId: input.councilSessionId ?? "council-1",
    workflowId: input.workflowId ?? "wf-1",
    runtimeId: input.runtimeId ?? "rt-1",
    orderedContributionIds,
    agreementRecordId: input.agreementRecordId ?? "agree-1",
    disagreementRecordId: input.disagreementRecordId ?? "disagree-1",
    agreementPoints: input.agreementPoints ?? [],
    disagreementPoints: input.disagreementPoints ?? [],
    openQuestions: input.openQuestions ?? [],
    supportingEvidenceReferences,
    conflictingEvidenceReferences,
    recommendationSummary,
    recommendationConfidence: input.recommendationConfidence ?? "MEDIUM",
    riskClass: input.riskClass ?? "R2",
    scopeHash: input.scopeHash ?? "scope-hash",
    approvalRequired: input.approvalRequired ?? true,
    RahulApprovalRequired: input.RahulApprovalRequired ?? true,
    escalationRequired: input.escalationRequired ?? false,
    aggregateDigest,
    createdAt: input.createdAt ?? "2026-01-01T00:00:00.000Z",
    contractVersion: input.contractVersion ?? COUNCIL_MODE_CONTRACT_VERSION,
  };
}

export function assertCouncilRecommendationPackage(packageContract: CouncilRecommendationPackage): void {
  if (packageContract.orderedContributionIds.length === 0) {
    throw new Error("Recommendation package must include ordered contributions.");
  }
  if (!packageContract.RahulApprovalRequired) {
    throw new Error("Council Mode cannot set RahulApprovalRequired to false.");
  }
  if (packageContract.approvalRequired !== true) {
    throw new Error("Recommendation package must require approval.");
  }
  if (packageContract.aggregateDigest.length === 0) {
    throw new Error("Aggregate digest must be deterministic.");
  }
  if (packageContract.disagreementRecordId && packageContract.disagreementPoints.length > 0 && !packageContract.escalationRequired) {
    throw new Error("Material disagreement must remain visible and may require Rahul decision.");
  }
}

export function assertCouncilConvergence(
  session: Partial<GoverningCouncilSession>,
  context: { hasRahulApproval: boolean; scopeHashMatches: boolean; permitted: boolean },
): void {
  if (!session.workflowId || !session.runtimeId || !session.authoritativeWorkflowId) {
    throw new Error("Council convergence requires one workflow ID and one runtime ID.");
  }
  if (session.workflowId !== session.authoritativeWorkflowId) {
    throw new Error("Council convergence requires a single authoritative workflow state.");
  }
  if (!session.approvalId) {
    throw new Error("Council convergence requires one approval lineage.");
  }
  if (!session.checkpointDigest) {
    throw new Error("Council convergence requires one checkpoint lineage.");
  }
  if (!session.evidenceReferences || session.evidenceReferences.length === 0) {
    throw new Error("Council convergence requires one evidence lineage.");
  }
  if (!context.hasRahulApproval) {
    throw new Error("Rahul approval still required.");
  }
  if (!context.scopeHashMatches) {
    throw new Error("Council convergence requires matching scope hash.");
  }
  if (!context.permitted) {
    throw new Error("Council convergence does not expand permission or connector scope.");
  }
  const participants = session.participantCharacterAttributions ?? [];
  if (participants.length !== 2 || !participants.includes("ONYX") || !participants.includes("NOVA")) {
    throw new Error("Distinct ONYX and NOVA participant identities are required.");
  }
  if (session.status === "CREATED" || session.status === "CONTRIBUTIONS_PENDING") {
    throw new Error("Council convergence requires contributions to be complete.");
  }
}

export const COUNCIL_PARTICIPANT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  CONTRIBUTOR: ["READ", "CONTRIBUTION"],
  SUPERVISOR: ["READ", "CONTRIBUTION", "APPROVAL"],
};

export function assertCouncilParticipantPermissions(role: string, permissionProfileId: string, memoryAccessProfileId: string, capabilityDeclarationIds: string[]): void {
  const requiredPermissions = COUNCIL_PARTICIPANT_ROLE_PERMISSIONS[role];
  if (!requiredPermissions) {
    throw new Error("Unsupported council role.");
  }
  if (!permissionProfileId || !memoryAccessProfileId || capabilityDeclarationIds.length === 0) {
    throw new Error("Participant role must not grant missing permissions.");
  }
  for (const permission of requiredPermissions) {
    if (!permission || permission === "APPROVAL" && !permissionProfileId) {
      throw new Error("Participant role must not grant missing permissions.");
    }
  }
}

export function assertCouncilPolicyBoundaries(session: GoverningCouncilSession): void {
  if (session.participantCharacterAttributions.includes("ONYX") && session.participantCharacterAttributions.includes("NOVA")) {
    assertCouncilKeepsPersonasDistinct(session.participantCharacterAttributions);
  }
  if (session.approvalId.length === 0) {
    throw new Error("Council Mode requires an approval lineage.");
  }
}
