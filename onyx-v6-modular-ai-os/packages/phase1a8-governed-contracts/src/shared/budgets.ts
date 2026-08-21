import { BUDGET_CONTRACT_VERSION } from "./versions";

export const BUDGET_STATUSES = ["UNDER_BUDGET", "AT_BUDGET", "OVER_BUDGET", "NOT_APPLICABLE"] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export interface TokenBudget {
  budgetId: string;
  workflowId: string;
  runtimeId: string;
  agentAllocations: Record<string, number>;
  taskAllocations: Record<string, number>;
  consumedTokens: number;
  reservedTokens: number;
  remainingTokens: number;
  warningThreshold: number;
  hardLimit: number;
  modelRoutingFallback: string;
  cachePolicy: string;
  status: BudgetStatus;
  contractVersion: string;
}

export interface CostBudget {
  budgetId: string;
  workflowId: string;
  runtimeId: string;
  currency: string;
  agentAllocations: Record<string, number>;
  taskAllocations: Record<string, number>;
  estimatedCost: number;
  actualCost: number;
  reservedCost: number;
  remainingCost: number;
  warningThreshold: number;
  hardLimit: number;
  paidActionApprovalRequired: boolean;
  status: BudgetStatus;
  contractVersion: string;
}

export function classifyTokenBudgetStatus(
  budget: Pick<TokenBudget, "consumedTokens" | "reservedTokens" | "hardLimit" | "warningThreshold">,
): BudgetStatus {
  if (budget.hardLimit <= 0) return "NOT_APPLICABLE";
  const used = budget.consumedTokens + budget.reservedTokens;
  if (used >= budget.hardLimit) return "OVER_BUDGET";
  if (used >= budget.warningThreshold) return "AT_BUDGET";
  return "UNDER_BUDGET";
}

export function classifyCostBudgetStatus(
  budget: Pick<CostBudget, "actualCost" | "reservedCost" | "hardLimit" | "warningThreshold">,
): BudgetStatus {
  if (budget.hardLimit <= 0) return "NOT_APPLICABLE";
  const used = budget.actualCost + budget.reservedCost;
  if (used >= budget.hardLimit) return "OVER_BUDGET";
  if (used >= budget.warningThreshold) return "AT_BUDGET";
  return "UNDER_BUDGET";
}

/** Budget exhaustion fails safe: an over-budget status always rejects the action. */
export function assertBudgetNotExceeded(status: BudgetStatus): void {
  if (status === "OVER_BUDGET") {
    throw new Error("Budget hard limit exceeded; action rejected fail-safe.");
  }
}

export function defaultTokenBudget(budgetId: string, workflowId: string, runtimeId: string, hardLimit: number): TokenBudget {
  return {
    budgetId,
    workflowId,
    runtimeId,
    agentAllocations: {},
    taskAllocations: {},
    consumedTokens: 0,
    reservedTokens: 0,
    remainingTokens: hardLimit,
    warningThreshold: Math.floor(hardLimit * 0.8),
    hardLimit,
    modelRoutingFallback: "LOCAL_SMALL",
    cachePolicy: "PREFER_CACHE",
    status: "UNDER_BUDGET",
    contractVersion: BUDGET_CONTRACT_VERSION,
  };
}
