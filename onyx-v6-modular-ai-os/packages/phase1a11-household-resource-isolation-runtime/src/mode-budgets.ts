import { BUDGET_POLICY_VERSION, MODE_BUDGETS } from "./mode-policy";

export const MODE_BUDGET_ENVELOPES = MODE_BUDGETS;

export function getBudgetEnvelope(): typeof MODE_BUDGETS {
  return MODE_BUDGETS;
}

export function validateBudgetPolicyVersion(version: string): boolean {
  return version === BUDGET_POLICY_VERSION;
}
