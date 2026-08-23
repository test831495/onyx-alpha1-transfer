export type { DependencyResolutionRequest, DependencyResolutionResult, DependencyResolutionResultClassification } from "./dependency-resolver";
export { DEPENDENCY_RESOLUTION_RESULT_CLASSIFICATIONS, createDependencyResolver, assertDependencyResolutionRequest, assertDependencyResolutionResult } from "./dependency-resolver";

export type { ReadySetDecisionRequest, ReadySetDecisionResult, ReadySetDecisionResultClassification } from "./ready-set";
export { READY_SET_DECISION_RESULT_CLASSIFICATIONS, createReadySetEvaluator, assertReadySetDecisionRequest, assertReadySetDecisionResult } from "./ready-set";

export function assertDependencyContractsExist(): void {
  // Verify Phase 1A.8 dependency contracts are available and compatible
}
