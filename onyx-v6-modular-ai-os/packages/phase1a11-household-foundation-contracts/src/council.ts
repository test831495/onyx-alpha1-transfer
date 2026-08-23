export type CouncilPurpose =
  | "household_coordination"
  | "project_review"
  | "risk_review"
  | "owner_decision_support";

export type ParticipationMode = "live" | "delegated" | "historical";

export interface CouncilParticipant {
  participantId: string;
  role: "onyx" | "nova" | "observer" | "owner";
  mode: ParticipationMode;
  accountId: string;
  householdId: string;
  purpose: CouncilPurpose;
  allowedSourceClasses: string[];
  deniedSourceClasses: string[];
  isHistorical: boolean;
}

export interface CouncilRequest {
  requestId: string;
  householdId: string;
  accountId: string;
  purpose: CouncilPurpose;
  topic: string;
  sourceClasses: string[];
  deniedSourceClasses: string[];
  expiresAt: string;
  createdAt: string;
}

export interface CouncilTurn {
  turnId: string;
  councilRequestId: string;
  participantId: string;
  mode: ParticipationMode;
  contributionId: string;
  createdAt: string;
  expiresAt: string;
  isAdvisory: true;
}

export interface CouncilDisagreement {
  disagreementId: string;
  councilRequestId: string;
  participantId: string;
  reason: string;
  visible: true;
  resolvedBy: "rahul" | "not_resolved";
}

export interface CharacterAgentGatewayRequest {
  requestId: string;
  accountId: string;
  householdId: string;
  sourceCharacter: "ONYX" | "NOVA";
  purpose: CouncilPurpose;
  subject: string;
  scope: string[];
  expiresAt: string;
}

export interface CharacterAgentGatewayResponse {
  responseId: string;
  requestId: string;
  accepted: boolean;
  advisoryOnly: true;
  disallowedReasons: string[];
  producedAt: string;
}

export interface ContributionEnvelope {
  contributionId: string;
  councilRequestId: string;
  participantId: string;
  purpose: CouncilPurpose;
  sourceClasses: string[];
  summary: string;
  attributable: true;
  expiresAt: string;
  createdAt: string;
  accountId: string;
}

export interface ContributionAttribution {
  contributionId: string;
  participantId: string;
  role: string;
  accountId: string;
  isHistorical: boolean;
  provenance: string;
}

export interface ContributionDisclosureDecision {
  contributionId: string;
  allowDisclosure: boolean;
  reason: string;
  permittedAudience: string[];
  redactionRequired: boolean;
}

export interface ContributionExpiration {
  contributionId: string;
  expiresAt: string;
  expired: boolean;
}

export interface ActionAuthorityStatement {
  statementId: string;
  authority: "rahul_primary_owner";
  advisoryOnly: true;
  requiresOwnerApproval: true;
}

export const COUNCIL_BOUNDARY_RULES = {
  coordinationOnly: true,
  noAuthorizationExpansion: true,
  noCharacterIdentityMerge: true,
  noRawCrossProfileMemoryTransfer: true,
  noPrivateConversationTransfer: true,
  noCredentialTransfer: true,
  noUnrestrictedConnectorResults: true,
  noRahulJourneyTransfer: true,
} as const;

export function isCouncilContributionAllowed(envelope: ContributionEnvelope): boolean {
  return (
    envelope.purpose !== undefined &&
    envelope.attributable === true &&
    envelope.expiresAt.length > 0 &&
    envelope.sourceClasses.length > 0 &&
    envelope.accountId.length > 0
  );
}
