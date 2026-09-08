import { SearchOutcomeState, type SearchPlan, type SearchPlanSource, type SearchSourceCandidate } from "./search-model";
import { evaluateSearchSourceEligibility } from "./search-eligibility";
import { createUniversalSearchRequest } from "./search-request";

export function buildSearchPlan(
  requestInput: Parameters<typeof createUniversalSearchRequest>[0],
  sources: readonly SearchSourceCandidate[],
): SearchPlan {
  const request = createUniversalSearchRequest(requestInput);
  const planned: SearchPlanSource[] = [...sources]
    .map((candidate) => {
      const eligibility = evaluateSearchSourceEligibility(candidate, request);
      return {
        ...candidate,
        sourceState: eligibility.sourceState as SearchPlanSource["sourceState"],
        reasonCode: eligibility.reasonCode,
      };
    })
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || (a.connectorId || "").localeCompare(b.connectorId || ""));
  const eligible = planned.filter((s) => s.sourceState === "ELIGIBLE");
  const outcome = eligible.length > 0 ? SearchOutcomeState.COMPLETE_RESULTS : SearchOutcomeState.NO_ELIGIBLE_SOURCE;
  return Object.freeze({
    requestId: request.requestId,
    disposition: outcome,
    sources: Object.freeze(planned),
    isImmutable: true,
  });
}
