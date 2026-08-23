import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";

/** Matches the presence-mode tuple already frozen in apps/command-center/src/automationRuntimeContracts.ts. */
export const CHARACTER_ATTRIBUTIONS = ["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"] as const;
export type CharacterAttribution = (typeof CHARACTER_ATTRIBUTIONS)[number];

export const AGENT_TYPES = ["EXECUTOR", "REVIEWER", "SECURITY_REVIEWER", "DOCUMENTATION", "VALIDATION", "PROMOTION_LANE"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_STATUSES = ["DRAFT", "PENDING_VALIDATION", "REGISTERED", "ACTIVE", "SUSPENDED", "REJECTED", "REVOKED", "DEREGISTERED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface AgentIdentity {
  agentId: string;
  agentType: AgentType;
  displayName: string;
  engineeringIdentity: string;
  runtimeIdentity: string;
  characterAttribution: CharacterAttribution;
  presenceMode: CharacterAttribution;
  supervisingUserId: string;
  runtimeId: string;
  runtimeSessionId: string;
  workflowId: string;
  capabilityDeclarationIds: string[];
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: string[];
  modelRoutingProfileId: string;
  voiceMetadataProfileId?: string;
  tokenBudgetId: string;
  costBudgetId: string;
  registeredAt: string;
  updatedAt: string;
  contractVersion: string;
  status: AgentStatus;
  evidenceReferences: string[];
}

export function assertCharacterAttribution(value: string): asserts value is CharacterAttribution {
  if (!(CHARACTER_ATTRIBUTIONS as readonly string[]).includes(value)) {
    throw new Error(`Unknown character attribution: ${value}`);
  }
}

const AGENT_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  DRAFT: ["PENDING_VALIDATION"],
  PENDING_VALIDATION: ["REGISTERED", "REJECTED"],
  REGISTERED: ["ACTIVE"],
  ACTIVE: ["SUSPENDED", "DEREGISTERED", "REVOKED"],
  SUSPENDED: ["ACTIVE", "REVOKED"],
  REJECTED: [],
  REVOKED: [],
  DEREGISTERED: [],
};

export function canTransitionAgentStatus(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_TRANSITIONS[from].includes(to);
}

export function assertLegalAgentTransition(from: AgentStatus, to: AgentStatus): void {
  if (!canTransitionAgentStatus(from, to)) {
    throw new Error(`Illegal agent identity transition: ${from} -> ${to}`);
  }
}

/** Fields an agent must never modify on its own identity record; only a distinct governance actor may. */
export const SELF_MODIFICATION_PROTECTED_FIELDS = [
  "permissionProfileId",
  "capabilityDeclarationIds",
  "memoryAccessProfileId",
  "connectorScopeIds",
  "tokenBudgetId",
  "costBudgetId",
  "status",
  "contractVersion",
] as const;
export type SelfModificationProtectedField = (typeof SELF_MODIFICATION_PROTECTED_FIELDS)[number];

/** Agent identity, character attribution, and presence mode grant no authority; self-modification of governed fields is always rejected. */
export function assertNoSelfModification(actingAgentId: string, subjectAgentId: string, fields: readonly SelfModificationProtectedField[]): void {
  if (actingAgentId === subjectAgentId && fields.length > 0) {
    throw new Error(`Agent ${subjectAgentId} must not modify its own governed fields: ${fields.join(", ")}.`);
  }
}

export function transitionAgentStatus(agent: AgentIdentity, nextStatus: AgentStatus, actingAgentId: string, now: Date): AgentIdentity {
  assertLegalAgentTransition(agent.status, nextStatus);
  assertNoSelfModification(actingAgentId, agent.agentId, ["status"]);
  return { ...agent, status: nextStatus, updatedAt: now.toISOString() };
}

/** Re-registration after a terminal state must mint a new agentId; the old identity is never reactivated. */
export function assertNewAgentIdAfterTerminal(priorStatus: AgentStatus, priorAgentId: string, nextAgentId: string): void {
  const terminal: readonly AgentStatus[] = ["REVOKED", "DEREGISTERED"];
  if (terminal.includes(priorStatus) && priorAgentId === nextAgentId) {
    throw new Error("Re-registration after REVOKED or DEREGISTERED requires a new agentId.");
  }
}

export interface CreateDraftAgentIdentityInput {
  agentId: string;
  agentType: AgentType;
  displayName: string;
  engineeringIdentity: string;
  runtimeIdentity: string;
  characterAttribution: CharacterAttribution;
  presenceMode: CharacterAttribution;
  supervisingUserId: string;
  runtimeId: string;
  runtimeSessionId: string;
  workflowId: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  modelRoutingProfileId: string;
  tokenBudgetId: string;
  costBudgetId: string;
  now: Date;
}

export function createDraftAgentIdentity(input: CreateDraftAgentIdentityInput): AgentIdentity {
  assertCharacterAttribution(input.characterAttribution);
  assertCharacterAttribution(input.presenceMode);
  const timestamp = input.now.toISOString();
  return {
    agentId: input.agentId,
    agentType: input.agentType,
    displayName: input.displayName,
    engineeringIdentity: input.engineeringIdentity,
    runtimeIdentity: input.runtimeIdentity,
    characterAttribution: input.characterAttribution,
    presenceMode: input.presenceMode,
    supervisingUserId: input.supervisingUserId,
    runtimeId: input.runtimeId,
    runtimeSessionId: input.runtimeSessionId,
    workflowId: input.workflowId,
    capabilityDeclarationIds: [],
    permissionProfileId: input.permissionProfileId,
    memoryAccessProfileId: input.memoryAccessProfileId,
    connectorScopeIds: [],
    modelRoutingProfileId: input.modelRoutingProfileId,
    tokenBudgetId: input.tokenBudgetId,
    costBudgetId: input.costBudgetId,
    registeredAt: timestamp,
    updatedAt: timestamp,
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
    status: "DRAFT",
    evidenceReferences: [],
  };
}
