export const SEARCH_MODES = {
  EXACT: "EXACT",
  METADATA: "METADATA",
  FULL_TEXT: "FULL_TEXT",
  SEMANTIC: "SEMANTIC",
} as const;

export type SearchMode = (typeof SEARCH_MODES)[keyof typeof SEARCH_MODES];

export const SEARCH_MATCH_CLASSES = [
  "EXACT_TITLE",
  "EXACT_IDENTIFIER",
  "EXACT_PHRASE",
  "METADATA_FIELD",
  "FULL_TEXT_FRAGMENT",
  "TAG_MATCH",
  "DATE_SCOPE_MATCH",
  "APPLICATION_MATCH",
  "ACCOUNT_MATCH",
  "PROJECT_REFERENCE_MATCH",
  "UNKNOWN_MATCH",
] as const;

export const SearchOutcomeState = {
  COMPLETE_RESULTS: "COMPLETE_RESULTS",
  PARTIAL_RESULTS: "PARTIAL_RESULTS",
  NOT_FOUND: "NOT_FOUND",
  NO_ELIGIBLE_SOURCE: "NO_ELIGIBLE_SOURCE",
  PERMISSION_RESTRICTED: "PERMISSION_RESTRICTED",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  SOURCE_STALE: "SOURCE_STALE",
  CONFLICTING_RESULTS: "CONFLICTING_RESULTS",
  CANCELLED: "CANCELLED",
  DEADLINE_EXCEEDED: "DEADLINE_EXCEEDED",
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_ASSESSABLE: "NOT_ASSESSABLE",
} as const;

export type SearchOutcome = (typeof SearchOutcomeState)[keyof typeof SearchOutcomeState];

export const SearchSourceState = {
  PLANNED: "PLANNED",
  ELIGIBLE: "ELIGIBLE",
  INELIGIBLE: "INELIGIBLE",
  COMPLETED: "COMPLETED",
  COMPLETED_EMPTY: "COMPLETED_EMPTY",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  UNAVAILABLE: "UNAVAILABLE",
  STALE: "STALE",
  PERMISSION_RESTRICTED: "PERMISSION_RESTRICTED",
  NOT_ASSESSABLE: "NOT_ASSESSABLE",
} as const;

export type SearchSourceDisposition = (typeof SearchSourceState)[keyof typeof SearchSourceState];

export const SOURCE_HEALTH = {
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  UNHEALTHY: "UNHEALTHY",
  UNKNOWN: "UNKNOWN",
} as const;

export const FRESHNESS_STATES = {
  CURRENT: "CURRENT",
  STALE: "STALE",
  UNKNOWN: "UNKNOWN",
  NOT_ASSESSABLE: "NOT_ASSESSABLE",
} as const;

export const PRIVACY_DECISIONS = {
  AUTHORIZED: "AUTHORIZED",
  LIMITED: "LIMITED",
  RESTRICTED: "RESTRICTED",
  UNKNOWN: "UNKNOWN",
} as const;

export const KNOWN_CAPABILITIES = new Set([
  "calendar.events.read",
  "mail.messages.read",
  "tasks.read",
  "files.search",
  "project.notes.read",
]);

export const KNOWN_APPLICATIONS = new Set([
  "application.calendar",
  "application.mail",
  "application.tasks",
  "application.files",
  "application.notes",
]);

export const BOUNDS = Object.freeze({
  queryTextMaxLength: 256,
  exactPhrasesMax: 8,
  tagMax: 16,
  projectReferenceMax: 16,
  applicationScopeMax: 12,
  connectorScopeMax: 24,
  capabilityMax: 12,
  dataClassMax: 16,
  contentTypeMax: 8,
  titleMax: 256,
  snippetMax: 512,
  uriMax: 512,
  resultMax: 1000,
  pageSizeMax: 200,
  evidenceRefsMax: 32,
  duplicateMembersMax: 32,
  conflictMembersMax: 32,
  reasonCodesMax: 32,
  cursorMaxLength: 256,
});

export type SearchRequestInput = {
  readonly requestId: string;
  readonly accountScopeReference: string;
  readonly householdScopeReference?: string;
  readonly actorSessionReference?: string;
  readonly purposeReference: string;
  readonly queryTextReference?: string;
  readonly searchModes: readonly SearchMode[];
  readonly applicationScopes?: readonly string[];
  readonly capabilityRequirements?: readonly string[];
  readonly connectorAccountScopes?: readonly string[];
  readonly dataClasses?: readonly string[];
  readonly exactPhrases?: readonly string[];
  readonly tags?: readonly string[];
  readonly projectReferences?: readonly string[];
  readonly dateTimeRangeReferences?: readonly string[];
  readonly calendarYear?: number | null;
  readonly calendarMonth?: number | null;
  readonly isoWeek?: number | null;
  readonly contentTypes?: readonly string[];
  readonly privacyRequirements?: readonly string[];
  readonly freshnessRequirements?: readonly string[];
  readonly regionRequirements?: readonly string[];
  readonly maximumResults?: number;
  readonly maxResults?: number;
  readonly pageSize?: number;
  readonly deadlineReference?: string;
  readonly costCeilingReference?: string;
  readonly detailLevel?: string;
  readonly requestedSortPolicy?: string;
  readonly explicitFallbackPolicy?: string;
  readonly cancellationReference?: string;
  readonly idempotencyKey?: string;
  readonly scopeExpansionPolicy?: string;
};

export type UniversalSearchRequest = {
  readonly requestId: string;
  readonly accountScopeReference: string;
  readonly householdScopeReference?: string;
  readonly actorSessionReference?: string;
  readonly purposeReference: string;
  readonly queryTextReference?: string;
  readonly searchModes: readonly SearchMode[];
  readonly applicationScopes: readonly string[];
  readonly capabilityRequirements: readonly string[];
  readonly connectorAccountScopes: readonly string[];
  readonly dataClasses: readonly string[];
  readonly exactPhrases: readonly string[];
  readonly tags: readonly string[];
  readonly projectReferences: readonly string[];
  readonly dateTimeRangeReferences: readonly string[];
  readonly calendarYear?: number | null;
  readonly calendarMonth?: number | null;
  readonly isoWeek?: number | null;
  readonly contentTypes: readonly string[];
  readonly privacyRequirements: readonly string[];
  readonly freshnessRequirements: readonly string[];
  readonly regionRequirements: readonly string[];
  readonly maximumResults: number;
  readonly pageSize: number;
  readonly deadlineReference?: string;
  readonly costCeilingReference?: string;
  readonly detailLevel: string;
  readonly requestedSortPolicy: string;
  readonly explicitFallbackPolicy?: string;
  readonly cancellationReference?: string;
  readonly idempotencyKey?: string;
  readonly scopeExpansionPolicy?: string;
};

export type SearchSourceCandidate = {
  readonly applicationId: string;
  readonly capabilityId: string;
  readonly connectorId: string;
  readonly accountScopeReference: string;
  readonly dataClass: string;
  readonly supportedSearchModes: readonly SearchMode[];
  readonly sourceHealth: string;
  readonly freshnessState: string;
  readonly attributionAvailable: boolean;
  readonly privacyDecision: string;
  readonly regionCompatible: boolean;
  readonly availability: string;
  readonly evidenceReferences: readonly string[];
  readonly priority?: number;
};

export type SearchPlanSource = SearchSourceCandidate & {
  readonly sourceState: SearchSourceDisposition;
  readonly reasonCode?: string;
};

export type SearchPlan = {
  readonly requestId: string;
  readonly disposition: SearchOutcome;
  readonly sources: readonly SearchPlanSource[];
  readonly isImmutable: true;
};

export type SearchResult = {
  readonly resultId: string;
  readonly canonicalResultReference?: string;
  readonly sourceResultReference?: string;
  readonly applicationId: string;
  readonly capabilityId: string;
  readonly connectorId: string;
  readonly accountScopeReference: string;
  readonly sourceAttributionReference?: string;
  readonly title?: string;
  readonly snippet?: string;
  readonly canonicalUriReference?: string;
  readonly contentType?: string;
  readonly dataClass: string;
  readonly matchClasses: readonly string[];
  readonly matchedFields: readonly string[];
  readonly sourceRelevanceScore?: number;
  readonly normalizedScoreInputs: Record<string, unknown>;
  readonly modifiedTimeReference?: string;
  readonly observedTimeReference?: string;
  readonly retrievedTimeReference?: string;
  readonly freshnessState: string;
  readonly privacyProjection: string;
  readonly sourceResultRank?: number;
  readonly duplicateGroupReference?: string;
  readonly conflictGroupReference?: string;
  readonly evidenceReferences: readonly string[];
  readonly provisionalOrPartial: boolean;
};

export type SearchReceipt = {
  readonly requestId: string;
  readonly planReference: string;
  readonly requestedScopes: readonly string[];
  readonly eligibleSourceCount: number;
  readonly ineligibleSourceCount: number;
  readonly completedSourceCount: number;
  readonly emptySourceCount: number;
  readonly partialSourceCount: number;
  readonly failedSourceCount: number;
  readonly staleSourceCount: number;
  readonly permissionRestrictedSourceCount: number;
  readonly cancelledSourceCount: number;
  readonly unavailableSourceReferences: readonly string[];
  readonly resultCount: number;
  readonly duplicateGroupCount: number;
  readonly conflictGroupCount: number;
  readonly scopeExpansionStepsUsed: number;
  readonly attributionCompleteness: string;
  readonly freshnessSummary: Record<string, number>;
  readonly evidenceReferences: readonly string[];
  readonly completionDisposition: SearchOutcome;
  readonly notes?: string;
};
