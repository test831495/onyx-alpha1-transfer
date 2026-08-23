import type { CouncilBindingResult } from "./council-binding";

export function evaluateCouncilEscalation(result: CouncilBindingResult): CouncilBindingResult {
  if (result.disagreementVisible) {
    return {
      ...result,
      RahulDecisionRequired: true,
      decision: "RAHUL_DECISION_REQUIRED",
      reconciliationRequired: true,
    };
  }
  return result;
}
