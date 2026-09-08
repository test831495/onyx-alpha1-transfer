import { BOUNDS, type SearchResult } from "./search-model";

export function normalizeSearchResult(input: Partial<SearchResult> & { resultId: string; applicationId: string; capabilityId: string; connectorId: string; accountScopeReference: string; dataClass: string; evidenceReferences?: readonly string[]; }): SearchResult {
  return {
    resultId: input.resultId,
    canonicalResultReference: input.canonicalResultReference ?? `result:${input.resultId}`,
    sourceResultReference: input.sourceResultReference ?? `source:${input.resultId}`,
    applicationId: input.applicationId,
    capabilityId: input.capabilityId,
    connectorId: input.connectorId,
    accountScopeReference: input.accountScopeReference,
    sourceAttributionReference: input.sourceAttributionReference,
    title: typeof input.title === "string" ? input.title.slice(0, BOUNDS.titleMax) : undefined,
    snippet: typeof input.snippet === "string" ? input.snippet.slice(0, BOUNDS.snippetMax) : undefined,
    canonicalUriReference: typeof input.canonicalUriReference === "string" ? input.canonicalUriReference.slice(0, BOUNDS.uriMax) : undefined,
    contentType: input.contentType ?? input.dataClass,
    dataClass: input.dataClass,
    matchClasses: Object.freeze((Array.isArray(input.matchClasses) ? input.matchClasses : []).slice(0, 8)),
    matchedFields: Object.freeze((Array.isArray(input.matchedFields) ? input.matchedFields : []).slice(0, 8)),
    sourceRelevanceScore: typeof input.sourceRelevanceScore === "number" ? input.sourceRelevanceScore : 0,
    normalizedScoreInputs: Object.freeze({ ...(input.normalizedScoreInputs ?? {}) }),
    modifiedTimeReference: input.modifiedTimeReference,
    observedTimeReference: input.observedTimeReference,
    retrievedTimeReference: input.retrievedTimeReference,
    freshnessState: input.freshnessState ?? "CURRENT",
    privacyProjection: input.privacyProjection ?? "AUTHORIZED",
    sourceResultRank: typeof input.sourceResultRank === "number" ? input.sourceResultRank : 0,
    duplicateGroupReference: input.duplicateGroupReference,
    conflictGroupReference: input.conflictGroupReference,
    evidenceReferences: Object.freeze((Array.isArray(input.evidenceReferences) ? input.evidenceReferences : []).slice(0, BOUNDS.evidenceRefsMax)),
    provisionalOrPartial: !!input.provisionalOrPartial,
  };
}
