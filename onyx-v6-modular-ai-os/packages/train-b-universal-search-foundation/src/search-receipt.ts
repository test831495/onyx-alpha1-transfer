import { SearchOutcomeState, type SearchReceipt } from "./search-model";

export function createSearchReceipt(input: {
  requestId: string;
  planReference: string;
  requestedScopes: readonly string[];
  eligibleSourceCount: number;
  ineligibleSourceCount: number;
  completedSourceCount: number;
  emptySourceCount: number;
  failedSourceCount: number;
  staleSourceCount: number;
  permissionRestrictedSourceCount: number;
  cancelledSourceCount: number;
  unavailableSourceReferences: readonly string[];
  resultCount: number;
  duplicateGroupCount: number;
  conflictGroupCount: number;
  scopeExpansionStepsUsed: number;
  attributionCompleteness: string;
  freshnessSummary: Record<string, number>;
  evidenceReferences: readonly string[];
  completionDisposition: string;
  notes?: string;
  partialSourceCount?: number;
}): SearchReceipt {
  const disposition = Object.values(SearchOutcomeState).includes(input.completionDisposition as any)
    ? (input.completionDisposition as SearchReceipt["completionDisposition"])
    : SearchOutcomeState.INVALID_REQUEST;

  return Object.freeze({
    requestId: input.requestId,
    planReference: input.planReference,
    requestedScopes: Object.freeze([...input.requestedScopes]),
    eligibleSourceCount: input.eligibleSourceCount,
    ineligibleSourceCount: input.ineligibleSourceCount,
    completedSourceCount: input.completedSourceCount,
    emptySourceCount: input.emptySourceCount,
    partialSourceCount: input.partialSourceCount ?? 0,
    failedSourceCount: input.failedSourceCount,
    staleSourceCount: input.staleSourceCount,
    permissionRestrictedSourceCount: input.permissionRestrictedSourceCount,
    cancelledSourceCount: input.cancelledSourceCount,
    unavailableSourceReferences: Object.freeze([...input.unavailableSourceReferences]),
    resultCount: input.resultCount,
    duplicateGroupCount: input.duplicateGroupCount,
    conflictGroupCount: input.conflictGroupCount,
    scopeExpansionStepsUsed: input.scopeExpansionStepsUsed,
    attributionCompleteness: input.attributionCompleteness,
    freshnessSummary: Object.freeze({ ...(input.freshnessSummary ?? {}) }),
    evidenceReferences: Object.freeze([...input.evidenceReferences]),
    completionDisposition: disposition,
    notes: input.notes,
  });
}
