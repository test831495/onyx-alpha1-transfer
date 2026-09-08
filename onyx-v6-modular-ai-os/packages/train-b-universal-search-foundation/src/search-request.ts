import { BOUNDS, SEARCH_MODES, type SearchRequestInput, type UniversalSearchRequest } from "./search-model";
import { assertClosedInput, normalizedTokens, validString, validateSearchMode } from "./validators";

export function createUniversalSearchRequest(input: SearchRequestInput): UniversalSearchRequest {
  assertClosedInput(input);
  const queryText = input.queryTextReference ?? "";
  if (!input.queryTextReference && !(input.exactPhrases?.length || input.tags?.length || input.projectReferences?.length)) {
    throw new TypeError("query or metadata-only scope required");
  }
  if (typeof queryText === "string" && queryText.trim().length === 0 && !(input.exactPhrases?.length || input.tags?.length || input.projectReferences?.length)) {
    throw new TypeError("empty query rejected");
  }
  const modes = Array.isArray(input.searchModes) ? input.searchModes : [];
  if (modes.length === 0 || modes.some((mode) => !validateSearchMode(mode))) {
    throw new TypeError("invalid search mode");
  }
  if (modes.includes(SEARCH_MODES.SEMANTIC)) {
    throw new TypeError("semantic execution mode rejected");
  }
  if (typeof input.maximumResults === "number" && input.maximumResults > BOUNDS.resultMax) {
    throw new TypeError("maximumResults exceeds maximum");
  }
  if (typeof input.pageSize === "number" && input.pageSize > BOUNDS.pageSizeMax) {
    throw new TypeError("pageSize exceeds maximum");
  }
  if (queryText.trim().length > BOUNDS.queryTextMaxLength) {
    throw new TypeError("query length exceeds maximum");
  }
  const request: UniversalSearchRequest = Object.freeze({
    requestId: validString(input.requestId, 128) ?? (() => { throw new TypeError("requestId invalid"); })(),
    accountScopeReference: validString(input.accountScopeReference, 128) ?? (() => { throw new TypeError("accountScopeReference invalid"); })(),
    householdScopeReference: input.householdScopeReference ? validString(input.householdScopeReference, 128) ?? undefined : undefined,
    actorSessionReference: input.actorSessionReference ? validString(input.actorSessionReference, 128) ?? undefined : undefined,
    purposeReference: validString(input.purposeReference, 128) ?? (() => { throw new TypeError("purposeReference invalid"); })(),
    queryTextReference: queryText.trim() || undefined,
    searchModes: Object.freeze([...modes]),
    applicationScopes: Object.freeze(normalizedTokens(input.applicationScopes, BOUNDS.applicationScopeMax)),
    capabilityRequirements: Object.freeze(normalizedTokens(input.capabilityRequirements, BOUNDS.capabilityMax)),
    connectorAccountScopes: Object.freeze(normalizedTokens(input.connectorAccountScopes, BOUNDS.connectorScopeMax)),
    dataClasses: Object.freeze(normalizedTokens(input.dataClasses, BOUNDS.dataClassMax)),
    exactPhrases: Object.freeze(normalizedTokens(input.exactPhrases, BOUNDS.exactPhrasesMax)),
    tags: Object.freeze(normalizedTokens(input.tags, BOUNDS.tagMax)),
    projectReferences: Object.freeze(normalizedTokens(input.projectReferences, BOUNDS.projectReferenceMax)),
    dateTimeRangeReferences: Object.freeze(normalizedTokens(input.dateTimeRangeReferences, 8)),
    calendarYear: typeof input.calendarYear === "number" && Number.isFinite(input.calendarYear) ? input.calendarYear : undefined,
    calendarMonth: typeof input.calendarMonth === "number" && Number.isFinite(input.calendarMonth) ? input.calendarMonth : undefined,
    isoWeek: typeof input.isoWeek === "number" && Number.isFinite(input.isoWeek) ? input.isoWeek : undefined,
    contentTypes: Object.freeze(normalizedTokens(input.contentTypes, BOUNDS.contentTypeMax)),
    privacyRequirements: Object.freeze(normalizedTokens(input.privacyRequirements, 8)),
    freshnessRequirements: Object.freeze(normalizedTokens(input.freshnessRequirements, 8)),
    regionRequirements: Object.freeze(normalizedTokens(input.regionRequirements, 8)),
    maximumResults: typeof input.maximumResults === "number" ? Math.min(input.maximumResults, BOUNDS.resultMax) : BOUNDS.resultMax,
    pageSize: typeof input.pageSize === "number" ? Math.min(input.pageSize, BOUNDS.pageSizeMax) : 20,
    deadlineReference: input.deadlineReference ? validString(input.deadlineReference, 128) ?? undefined : undefined,
    costCeilingReference: input.costCeilingReference ? validString(input.costCeilingReference, 128) ?? undefined : undefined,
    detailLevel: validString(input.detailLevel, 32) ?? "standard",
    requestedSortPolicy: validString(input.requestedSortPolicy, 32) ?? "relevance",
    explicitFallbackPolicy: input.explicitFallbackPolicy ? validString(input.explicitFallbackPolicy, 64) ?? undefined : undefined,
    cancellationReference: input.cancellationReference ? validString(input.cancellationReference, 128) ?? undefined : undefined,
    idempotencyKey: input.idempotencyKey ? validString(input.idempotencyKey, 128) ?? undefined : undefined,
    scopeExpansionPolicy: input.scopeExpansionPolicy ? validString(input.scopeExpansionPolicy, 64) ?? undefined : undefined,
  });
  if (request.maximumResults <= 0 || request.pageSize <= 0) throw new TypeError("result bounds must be positive");
  return request;
}
