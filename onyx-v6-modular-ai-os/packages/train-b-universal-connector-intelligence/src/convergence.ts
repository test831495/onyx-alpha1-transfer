import type { ConnectorAdapter, AdapterOperationRequest } from "@onyx/train-b-connector-adapter-foundation";
import {
  buildSearchPlan,
  createSearchReceipt,
  normalizeSearchResult,
  rankSearchResults,
  type SearchRequestInput,
  type SearchResult,
  type SearchSourceCandidate,
} from "@onyx/train-b-universal-search-foundation";
import {
  admitEvidence,
  assessClaimSupport,
  createCitation,
  createSynthesisPlan,
  type ClaimSupportAssessment,
  type EvidenceInput,
} from "@onyx/train-b-cross-application-synthesis-foundation";
import { B1_BUDGETS } from "./operational-governance.js";

export type IntelligenceSource = Readonly<{ adapter: ConnectorAdapter; candidate: SearchSourceCandidate }>;
export type IntelligenceRun = Readonly<{
  plan: ReturnType<typeof buildSearchPlan>;
  results: readonly SearchResult[];
  receipt: ReturnType<typeof createSearchReceipt>;
  synthesis: ReturnType<typeof createSynthesisPlan>;
  unavailableSources: readonly string[];
  nonAuthorizing: true;
}>;

export async function runUniversalConnectorIntelligence(
  input: SearchRequestInput,
  sources: readonly IntelligenceSource[],
): Promise<IntelligenceRun> {
  const boundedSources = sources.slice(0, B1_BUDGETS.maximumProviders);
  const plan = buildSearchPlan(input, boundedSources.map((source) => source.candidate));
  const results: SearchResult[] = [];
  const unavailableSources: string[] = [];
  for (const source of boundedSources) {
    const planned = plan.sources.find((item) => item.connectorId === source.candidate.connectorId);
    if (planned?.sourceState !== "ELIGIBLE") continue;
    const request: AdapterOperationRequest = {
      operation: "SEARCH",
      context: {
        connectorId: source.candidate.connectorId,
        accountScopeReference: source.candidate.accountScopeReference,
        vaultReferenceId: `vault:${source.candidate.connectorId}`,
        purposeReference: input.purposeReference,
        trustedTimeReference: "trusted:synthetic",
        idempotencyKey: input.idempotencyKey,
      },
      capabilityId: source.candidate.capabilityId,
      queryReference: input.queryTextReference ?? input.requestId,
      pageSize: input.pageSize,
    };
    const response = await source.adapter.execute(request);
    if (response.error || !response.page) {
      unavailableSources.push(source.candidate.connectorId);
      continue;
    }
    for (const [rank, record] of response.page.items.entries()) {
      if (results.length >= B1_BUDGETS.maximumNormalizedResults) break;
      results.push(normalizeSearchResult({
        resultId: `${source.candidate.connectorId}:${record.recordReference}`,
        sourceResultReference: record.recordReference,
        applicationId: source.candidate.applicationId,
        capabilityId: source.candidate.capabilityId,
        connectorId: source.candidate.connectorId,
        accountScopeReference: source.candidate.accountScopeReference,
        sourceAttributionReference: response.attribution?.providerRecordReference,
        title: record.recordReference,
        snippet: record.fields.map((field) => `${field.key}:${String(field.value)}`).join(" "),
        dataClass: record.dataClass,
        matchClasses: ["METADATA"],
        matchedFields: record.fields.map((field) => field.key),
        sourceRelevanceScore: 1 - rank / Math.max(response.page?.items.length ?? 1, 1),
        normalizedScoreInputs: { synthetic: true },
        observedTimeReference: record.observedTimeReference,
        retrievedTimeReference: "trusted:synthetic",
        freshnessState: response.attribution?.freshnessState ?? "UNKNOWN",
        privacyProjection: "AUTHORIZED",
        sourceResultRank: rank + 1,
        evidenceReferences: response.attribution?.evidenceReferences ?? [],
        provisionalOrPartial: response.attribution?.partial ?? false,
      }));
    }
  }
  const ranked = rankSearchResults(results);
  const evidence = ranked.map((result): EvidenceInput => ({
    evidenceId: `evidence:${result.resultId}`,
    resultId: result.resultId,
    applicationId: result.applicationId,
    accountScopeReference: result.accountScopeReference,
    dataClass: result.dataClass,
    freshnessState: result.freshnessState as EvidenceInput["freshnessState"],
    privacyDecision: "AUTHORIZED",
    attributionComplete: result.evidenceReferences.length > 0,
    placeholder: false,
    evidenceReferences: result.evidenceReferences,
    duplicateGroupReference: result.duplicateGroupReference,
    conflictGroupReference: result.conflictGroupReference,
  }));
  const decisions = evidence.slice(0, B1_BUDGETS.maximumAdmittedEvidenceItems).map((item) => admitEvidence(item, { accountScopeReference: input.accountScopeReference, allowStale: false }));
  const admitted = decisions.filter((decision) => decision.disposition === "ADMITTED").map((decision) => decision.evidenceId);
  const claims: ClaimSupportAssessment[] = ranked.slice(0, B1_BUDGETS.maximumFactualClaims).map((result, index) => assessClaimSupport({
    claimId: `claim:${result.resultId}`,
    evidenceIds: [`evidence:${result.resultId}`],
    admittedEvidenceIds: admitted.includes(`evidence:${result.resultId}`) ? [`evidence:${result.resultId}`] : [],
    contradictionEvidenceIds: result.conflictGroupReference ? [`evidence:${result.resultId}`] : [],
    citationIds: [`citation:${index}`],
  }));
  const citations = ranked.slice(0, B1_BUDGETS.maximumCitations).map((result, index) => createCitation({
    citationId: `citation:${index}`,
    claimId: `claim:${result.resultId}`,
    evidenceId: `evidence:${result.resultId}`,
    resultId: result.resultId,
    applicationId: result.applicationId,
    sourceReference: result.sourceAttributionReference ?? result.connectorId,
    freshnessState: result.freshnessState,
  }).citationId);
  const receipt = createSearchReceipt({
    requestId: input.requestId,
    planReference: `plan:${input.requestId}`,
    requestedScopes: input.applicationScopes ?? [],
    eligibleSourceCount: plan.sources.filter((source) => source.sourceState === "ELIGIBLE").length,
    ineligibleSourceCount: plan.sources.filter((source) => source.sourceState !== "ELIGIBLE").length,
    completedSourceCount: plan.sources.filter((source) => source.sourceState === "ELIGIBLE").length - unavailableSources.length,
    emptySourceCount: ranked.length === 0 ? 1 : 0,
    partialSourceCount: unavailableSources.length,
    failedSourceCount: unavailableSources.length,
    staleSourceCount: ranked.filter((result) => result.freshnessState === "STALE").length,
    permissionRestrictedSourceCount: 0,
    cancelledSourceCount: 0,
    unavailableSourceReferences: unavailableSources,
    resultCount: ranked.length,
    duplicateGroupCount: new Set(ranked.map((result) => result.duplicateGroupReference).filter(Boolean)).size,
    conflictGroupCount: new Set(ranked.map((result) => result.conflictGroupReference).filter(Boolean)).size,
    scopeExpansionStepsUsed: 0,
    attributionCompleteness: ranked.every((result) => result.evidenceReferences.length > 0) ? "COMPLETE" : "PARTIAL",
    freshnessSummary: { CURRENT: ranked.filter((result) => result.freshnessState === "CURRENT").length },
    evidenceReferences: ranked.flatMap((result) => result.evidenceReferences),
    completionDisposition: unavailableSources.length ? "PARTIAL_RESULTS" : "COMPLETE_RESULTS",
  });
  const synthesis = createSynthesisPlan({ requestId: input.requestId, claims, conflicts: [], coverageGaps: unavailableSources, citations });
  return Object.freeze({ plan, results: Object.freeze(ranked), receipt, synthesis, unavailableSources: Object.freeze(unavailableSources), nonAuthorizing: true });
}
