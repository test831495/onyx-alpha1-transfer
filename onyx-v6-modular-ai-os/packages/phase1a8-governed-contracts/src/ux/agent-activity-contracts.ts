import { AUTOMATION_CENTER_V2_CONTRACT_VERSION } from "../shared/versions";

export interface AgentActivityContract {
  agentId: string;
  role: string;
  characterAttribution: string;
  permissions: string[];
  capabilities: string[];
  tools: string[];
  paths: string[];
  networkScope: string;
  connectorScopes: string[];
  memoryScopes: string[];
  budgets: { tokenBudget: string; costBudget: string };
  attemptCount: number;
  taskOutputs: string[];
  handoffs: string[];
  leaseState: string;
  heartbeatState: string;
  checkpointState: string;
  evidenceReferences: string[];
  riskClassLimit: string;
  promotionEligibility: string;
  contractVersion: string;
  chainOfThought?: never;
}

export function createAgentActivityContract(input: Partial<AgentActivityContract> & { agentId?: string; role?: string; characterAttribution?: string; permissions?: string[]; capabilities?: string[]; tools?: string[]; paths?: string[]; networkScope?: string; connectorScopes?: string[]; memoryScopes?: string[]; budgets?: { tokenBudget: string; costBudget: string }; attemptCount?: number; taskOutputs?: string[]; handoffs?: string[]; leaseState?: string; heartbeatState?: string; checkpointState?: string; evidenceReferences?: string[]; riskClassLimit?: string; promotionEligibility?: string; contractVersion?: string }): AgentActivityContract {
  const tokenBudget = input.budgets?.tokenBudget ?? "1000";
  const costBudget = input.budgets?.costBudget ?? "25.00";
  if (input.chainOfThought !== undefined) {
    throw new Error("Agent activity must not expose chain-of-thought.");
  }
  return {
    agentId: input.agentId ?? "agent-1",
    role: input.role ?? "WORKER",
    characterAttribution: input.characterAttribution ?? "ONYX",
    permissions: input.permissions ?? ["read:workflow"],
    capabilities: input.capabilities ?? ["planning"],
    tools: input.tools ?? ["git"],
    paths: input.paths ?? ["workspace"],
    networkScope: input.networkScope ?? "internal",
    connectorScopes: input.connectorScopes ?? ["github"],
    memoryScopes: input.memoryScopes ?? ["workspace"],
    budgets: { tokenBudget, costBudget },
    attemptCount: input.attemptCount ?? 1,
    taskOutputs: input.taskOutputs ?? ["output"],
    handoffs: input.handoffs ?? [],
    leaseState: input.leaseState ?? "ACTIVE",
    heartbeatState: input.heartbeatState ?? "HEALTHY",
    checkpointState: input.checkpointState ?? "SYNCED",
    evidenceReferences: input.evidenceReferences ?? ["ev-1"],
    riskClassLimit: input.riskClassLimit ?? "R2",
    promotionEligibility: input.promotionEligibility ?? "ELIGIBLE",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}
