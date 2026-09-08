import { SEARCH_MODES, type SearchRequestInput, type SearchSourceCandidate } from "./search-model";
import { isKnownApplication, isKnownCapability } from "./validators";

export function evaluateSearchSourceEligibility(
  candidate: SearchSourceCandidate,
  request: Pick<SearchRequestInput, "accountScopeReference" | "purposeReference" | "searchModes">,
): { eligible: boolean; reasonCode?: string; sourceState: string } {
  if (!candidate || typeof candidate !== "object") {
    return { eligible: false, reasonCode: "INVALID_CANDIDATE", sourceState: "INELIGIBLE" };
  }
  if (candidate.accountScopeReference !== request.accountScopeReference) {
    return { eligible: false, reasonCode: "ACCOUNT_MISMATCH", sourceState: "INELIGIBLE" };
  }
  if (!isKnownApplication(candidate.applicationId)) {
    return { eligible: false, reasonCode: "UNKNOWN_APPLICATION", sourceState: "INELIGIBLE" };
  }
  if (!isKnownCapability(candidate.capabilityId)) {
    return { eligible: false, reasonCode: "UNKNOWN_CAPABILITY", sourceState: "INELIGIBLE" };
  }
  if (candidate.sourceHealth === "UNHEALTHY" || candidate.sourceHealth === "UNKNOWN") {
    return { eligible: false, reasonCode: "SOURCE_UNAVAILABLE", sourceState: "UNAVAILABLE" };
  }
  if (candidate.availability !== "AVAILABLE") {
    return { eligible: false, reasonCode: "SOURCE_UNAVAILABLE", sourceState: "UNAVAILABLE" };
  }
  if (!candidate.regionCompatible) {
    return { eligible: false, reasonCode: "REGION_RESTRICTED", sourceState: "INELIGIBLE" };
  }
  if (!candidate.attributionAvailable) {
    return { eligible: false, reasonCode: "MISSING_ATTRIBUTION", sourceState: "INELIGIBLE" };
  }
  if (candidate.privacyDecision === "RESTRICTED") {
    return { eligible: false, reasonCode: "PERMISSION_RESTRICTED", sourceState: "PERMISSION_RESTRICTED" };
  }
  if (candidate.freshnessState === "STALE") {
    return { eligible: false, reasonCode: "SOURCE_STALE", sourceState: "STALE" };
  }
  if (candidate.supportedSearchModes?.length && !candidate.supportedSearchModes.includes(request.searchModes[0] ?? SEARCH_MODES.EXACT)) {
    return { eligible: false, reasonCode: "MODE_UNSUPPORTED", sourceState: "INELIGIBLE" };
  }
  return { eligible: true, reasonCode: undefined, sourceState: "ELIGIBLE" };
}
