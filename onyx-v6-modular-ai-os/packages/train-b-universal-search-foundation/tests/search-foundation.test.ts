import { describe, expect, it } from "vitest";
import {
  SEARCH_MODES,
  SearchOutcomeState,
  SearchSourceState,
  buildSearchPlan,
  createSearchReceipt,
  createUniversalSearchRequest,
  evaluateSearchSourceEligibility,
  normalizeSearchResult,
  rankSearchResults,
} from "../src/index";

describe("universal search foundation", () => {
  it("accepts valid request data and preserves explicit scope", () => {
    const request = createUniversalSearchRequest({
      requestId: "req-1",
      accountScopeReference: "acct-1",
      purposeReference: "project-review",
      queryTextReference: "nora architecture",
      searchModes: [SEARCH_MODES.EXACT],
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      maxResults: 20,
      pageSize: 10,
      detailLevel: "standard",
      requestedSortPolicy: "relevance",
      cancellationReference: "cancel-1",
      idempotencyKey: "idem-1",
    });
    expect(request.accountScopeReference).toBe("acct-1");
    expect(request.searchModes).toEqual([SEARCH_MODES.EXACT]);
    expect(request.maximumResults).toBe(20);
  });

  it("rejects invalid result limits and non-string query input", () => {
    const request = {
      requestId: "req-limits",
      accountScopeReference: "acct-1",
      purposeReference: "project-review",
      queryTextReference: "nora architecture",
      searchModes: [SEARCH_MODES.EXACT],
    };
    expect(() => createUniversalSearchRequest({ ...request, maxResults: 1001 })).toThrow();
    expect(() => createUniversalSearchRequest({ ...request, maximumResults: 20, maxResults: 10 })).toThrow();
    expect(() => createUniversalSearchRequest({ ...request, queryTextReference: 1 } as any)).toThrow();
  });

  it("rejects empty query when unsupported", () => {
    expect(() => createUniversalSearchRequest({
      requestId: "req-2",
      accountScopeReference: "acct-1",
      purposeReference: "project-review",
      queryTextReference: "   ",
      searchModes: [SEARCH_MODES.EXACT],
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      maxResults: 20,
      pageSize: 10,
      detailLevel: "standard",
      requestedSortPolicy: "relevance",
    } as any)).toThrow();
  });

  it("rejects semantic execution mode", () => {
    expect(() => createUniversalSearchRequest({
      requestId: "req-3",
      accountScopeReference: "acct-1",
      purposeReference: "project-review",
      queryTextReference: "project plan",
      searchModes: [SEARCH_MODES.SEMANTIC],
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      maxResults: 20,
      pageSize: 10,
      detailLevel: "standard",
      requestedSortPolicy: "relevance",
    } as any)).toThrow();
  });

  it("supports metadata-only scoped requests", () => {
    const request = createUniversalSearchRequest({
      requestId: "req-4",
      accountScopeReference: "acct-1",
      purposeReference: "calendar",
      searchModes: [SEARCH_MODES.METADATA],
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      exactPhrases: ["Q3 review"],
      tags: ["planning"],
      projectReferences: ["project-1"],
      maxResults: 10,
      pageSize: 5,
      detailLevel: "compact",
      requestedSortPolicy: "date",
    });
    expect(request.searchModes).toContain(SEARCH_MODES.METADATA);
  });

  it("evaluates eligible sources and rejects unknown capabilities", () => {
    const result = evaluateSearchSourceEligibility({
      applicationId: "application.calendar",
      capabilityId: "unknown.capability",
      connectorId: "connector-1",
      accountScopeReference: "acct-1",
      dataClass: "CALENDAR_EVENT",
      supportedSearchModes: [SEARCH_MODES.EXACT],
      sourceHealth: "HEALTHY",
      freshnessState: "CURRENT",
      attributionAvailable: true,
      privacyDecision: "AUTHORIZED",
      regionCompatible: true,
      availability: "AVAILABLE",
      evidenceReferences: ["e-1"],
    }, { accountScopeReference: "acct-1", purposeReference: "calendar" } as any);
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("UNKNOWN_CAPABILITY");
  });

  it("accepts a source that supports any requested search mode", () => {
    const result = evaluateSearchSourceEligibility({
      applicationId: "application.calendar",
      capabilityId: "calendar.events.read",
      connectorId: "connector-1",
      accountScopeReference: "acct-1",
      dataClass: "CALENDAR_EVENT",
      supportedSearchModes: [SEARCH_MODES.METADATA],
      sourceHealth: "HEALTHY",
      freshnessState: "CURRENT",
      attributionAvailable: true,
      privacyDecision: "AUTHORIZED",
      regionCompatible: true,
      availability: "AVAILABLE",
      evidenceReferences: ["e-1"],
    }, { accountScopeReference: "acct-1", purposeReference: "calendar", searchModes: [SEARCH_MODES.EXACT, SEARCH_MODES.METADATA] });
    expect(result.eligible).toBe(true);
  });

  it("builds deterministic plan order", () => {
    const plan = buildSearchPlan({
      requestId: "req-5",
      accountScopeReference: "acct-1",
      purposeReference: "calendar",
      queryTextReference: "project review",
      searchModes: [SEARCH_MODES.EXACT],
      maxResults: 20,
      pageSize: 10,
      detailLevel: "standard",
      requestedSortPolicy: "relevance",
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      deadlineReference: "deadline-1",
      cancellationReference: "cancel-1",
      idempotencyKey: "idem-1",
    }, [
      { applicationId: "application.calendar", capabilityId: "calendar.events.read", connectorId: "conn-b", accountScopeReference: "acct-1", dataClass: "CALENDAR_EVENT", supportedSearchModes: [SEARCH_MODES.EXACT], sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["e-1"], priority: 2 },
      { applicationId: "application.calendar", capabilityId: "calendar.events.read", connectorId: "conn-a", accountScopeReference: "acct-1", dataClass: "CALENDAR_EVENT", supportedSearchModes: [SEARCH_MODES.EXACT], sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["e-2"], priority: 1 },
    ] as any);
    expect(plan.sources[0]?.connectorId).toBe("conn-a");
    expect(plan.sources[1]?.connectorId).toBe("conn-b");
  });

  it("normalizes and ranks results deterministically", () => {
    const normalized = normalizeSearchResult({
      resultId: "r-1",
      applicationId: "application.calendar",
      capabilityId: "calendar.events.read",
      connectorId: "conn-a",
      accountScopeReference: "acct-1",
      title: "Planning Session",
      snippet: "Project review",
      canonicalUriReference: "calendar://session/1",
      contentType: "CALENDAR_EVENT",
      dataClass: "CALENDAR_EVENT",
      matchClasses: ["EXACT_TITLE"],
      sourceRelevanceScore: 92,
      sourceAttributionReference: "a-1",
      freshnessState: "CURRENT",
      privacyProjection: "AUTHORIZED",
      normalizedScoreInputs: {
        exactMatchClass: true,
        titleMatch: true,
      },
      evidenceReferences: ["e-1"],
      sourceResultRank: 1,
    });
    const ranked = rankSearchResults([normalized, { ...normalized, resultId: "r-2", sourceRelevanceScore: 90, title: "Project Review", sourceResultRank: 2 }], { policy: { preferredMatchClass: "EXACT_TITLE" } } as any);
    expect(ranked[0]?.resultId).toBe("r-1");
    expect(ranked[1]?.resultId).toBe("r-2");
  });

  it("creates a receipt with coverage summary", () => {
    const receipt = createSearchReceipt({
      requestId: "req-5",
      planReference: "plan-1",
      requestedScopes: ["acct-1"],
      eligibleSourceCount: 1,
      ineligibleSourceCount: 0,
      completedSourceCount: 1,
      emptySourceCount: 0,
      failedSourceCount: 0,
      staleSourceCount: 0,
      permissionRestrictedSourceCount: 0,
      cancelledSourceCount: 0,
      unavailableSourceReferences: [],
      resultCount: 1,
      duplicateGroupCount: 0,
      conflictGroupCount: 0,
      scopeExpansionStepsUsed: 0,
      attributionCompleteness: "FULL",
      freshnessSummary: { current: 1 },
      evidenceReferences: ["e-1"],
      completionDisposition: SearchOutcomeState.COMPLETE_RESULTS,
      notes: "contract-only search result",
    });
    expect(receipt.completionDisposition).toBe(SearchOutcomeState.COMPLETE_RESULTS);
  });

  it("rejects hostile inputs fail closed", () => {
    expect(() => createUniversalSearchRequest({
      requestId: "req-6",
      accountScopeReference: "acct-1",
      purposeReference: "project-review",
      queryTextReference: "testing",
      searchModes: [SEARCH_MODES.EXACT],
      applicationScopes: ["app-1"],
      capabilityRequirements: ["calendar.events.read"],
      connectorAccountScopes: ["acct-1:connector-1"],
      dataClasses: ["CALENDAR_EVENT"],
      maxResults: 99999,
      pageSize: 99999,
      detailLevel: "standard",
      requestedSortPolicy: "relevance",
      hostile: "value",
    } as any)).toThrow();
  });
});
