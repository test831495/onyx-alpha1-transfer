import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector } from "./microsoft";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const calendarRange = {
  start: "2026-09-10T00:00:00.000Z",
  end: "2026-09-11T00:00:00.000Z",
  timeZone: "Asia/Kolkata",
};

describe("PHASE 2: Safe Authentication-Result Diagnostics", () => {
  it("captures calendarScope as REPORTED_PRESENT when MSAL returns Calendars.Read in scopes", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-with-calendar-scope",
      scopes: ["User.Read", "Calendars.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: "acct", tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.calendarScope).toBe("REPORTED_PRESENT");
    expect(result.diagnostic.calendarRequestedScopes).toContain("Calendars.Read");
    expect(result.diagnostic.calendarRequestedScopes).toContain("User.Read");
    expect(result.diagnostic.calendarReturnedScopes).toContain("Calendars.Read");
    expect(result.diagnostic.tokenAudience).toBe("MICROSOFT_GRAPH_EXPECTED");
    expect(JSON.stringify(result.diagnostic)).not.toContain("token-with-calendar-scope");
  });

  it("captures calendarScope as REPORTED_ABSENT when MSAL returns scopes excluding Calendars.Read", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-without-calendar-scope",
      scopes: ["User.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: "acct", tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.calendarScope).toBe("REPORTED_ABSENT");
    expect(result.diagnostic.calendarRequestedScopes).toContain("Calendars.Read");
    expect(result.diagnostic.calendarRequestedScopes).toContain("User.Read");
    expect(result.diagnostic.calendarReturnedScopes).toContain("User.Read");
    expect(result.diagnostic.calendarReturnedScopes).not.toContain("Calendars.Read");
    expect(JSON.stringify(result.diagnostic)).not.toContain("token-without-calendar-scope");
  });

  it("captures calendarScope as NOT_REPORTED when MSAL result lacks scopes array", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-without-scopes-metadata",
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: "acct", tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.calendarScope).toBe("NOT_REPORTED");
    expect(result.diagnostic.calendarReturnedScopes).toBeUndefined();
    expect(JSON.stringify(result.diagnostic)).not.toContain("token-without-scopes-metadata");
  });

  it("records accountBinding as MATCHED when active account matches token result account", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const accountId = "user-acct-id-123";
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-with-matching-account",
      scopes: ["User.Read", "Calendars.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: accountId, tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.accountBinding).toBe("MATCHED");
    expect(result.diagnostic.tokenAudience).toBe("MICROSOFT_GRAPH_EXPECTED");
    expect(JSON.stringify(result.diagnostic)).not.toContain(accountId);
  });

  it("records accountBinding as MISMATCHED when token result account differs from active account", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const activeAccountId = "active-user-123";
    const tokenAccountId = "different-user-456";
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-from-wrong-account",
      scopes: ["User.Read", "Calendars.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    // Create connector with mocked metadata but different account in result
    Object.assign(connector, {
      application: { acquireTokenSilent },
      account: { homeAccountId: activeAccountId, tenantId: "tenant" },
    });
    // Override acquireCalendarAccessTokenWithMetadata to return mismatched account
    const originalMethod = (connector as any).acquireCalendarAccessTokenWithMetadata.bind(connector);
    (connector as any).acquireCalendarAccessTokenWithMetadata = vi.fn().mockImplementation(async () => {
      const result = await originalMethod();
      return { ...result, accountHomeAccountId: tokenAccountId };
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.accountBinding).toBe("MISMATCHED");
    expect(JSON.stringify(result.diagnostic)).not.toContain(activeAccountId);
    expect(JSON.stringify(result.diagnostic)).not.toContain(tokenAccountId);
  });

  it("uses MICROSOFT_GRAPH_EXPECTED for tokenAudience when requesting Graph scopes", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "graph-scoped-token",
      scopes: ["User.Read", "Calendars.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.tokenAudience).toBe("MICROSOFT_GRAPH_EXPECTED");
    expect(JSON.stringify(result.diagnostic)).not.toContain("graph-scoped-token");
  });

  it("tracks forceRefreshAttempted when force-refresh recovery is triggered", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"] })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"] });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.forceRefreshAttempted).toBe(true);
    expect(result.diagnostic.refreshAttempted).toBe(true);
    expect(result.diagnostic.retryAttempted).toBe(true);
    expect(JSON.stringify(result.diagnostic)).not.toContain("initial-token");
    expect(JSON.stringify(result.diagnostic)).not.toContain("refreshed-token");
  });

  it("verifies refreshed token scopes and updates diagnostic after force-refresh success", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"] })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"] });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    // After refresh, diagnostic should reflect refreshed token scopes
    expect(result.diagnostic.calendarReturnedScopes).toBeDefined();
    expect(Array.from(result.diagnostic.calendarReturnedScopes ?? [])).toContain("Calendars.Read");
    expect(Array.from(result.diagnostic.calendarReturnedScopes ?? [])).toContain("User.Read");
    expect(result.diagnostic.calendarScope).toBe("REPORTED_PRESENT");
    expect(result.diagnostic.refreshOutcome).toBe("SUCCEEDED");
    expect(JSON.stringify(result.diagnostic)).not.toContain("initial-token");
    expect(JSON.stringify(result.diagnostic)).not.toContain("refreshed-token");
  });

  it("does not expose tokens, secrets, or raw account identifiers in JSON diagnostic serialization", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const accountId = "user|realm@tenant.onmicrosoft.com|user@example.com";
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      scopes: ["User.Read", "Calendars.Read"],
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: accountId, tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);
    const diagnosticJson = JSON.stringify(result.diagnostic);

    expect(diagnosticJson).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(diagnosticJson).not.toContain("user@example.com");
    expect(diagnosticJson).not.toContain("tenant.onmicrosoft.com");
    expect(diagnosticJson).not.toContain("Bearer");
    expect(diagnosticJson).not.toContain("Authorization");
    // Check that accountBinding is properly populated and serialized
    expect(result.diagnostic.accountBinding).toBe("MATCHED");
  });

  it("populates calendarRequestedScopes from MSAL request parameters", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    let capturedScopes: string[] | undefined;
    const acquireTokenSilent = vi.fn().mockImplementation((params) => {
      capturedScopes = params.scopes;
      return Promise.resolve({
        accessToken: "token",
        scopes: params.scopes,
      });
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: "acct", tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.calendarRequestedScopes).toBeDefined();
    expect(Array.from(result.diagnostic.calendarRequestedScopes ?? [])).toContain("User.Read");
    expect(Array.from(result.diagnostic.calendarRequestedScopes ?? [])).toContain("Calendars.Read");
    expect(capturedScopes).toContain("User.Read");
    expect(capturedScopes).toContain("Calendars.Read");
  });

  it("distinguishes between NOT_INSPECTABLE and NOT_REPORTED for missing scopes metadata", async () => {
    const connector1 = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "token-without-scopes",
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector1, { 
      application: { acquireTokenSilent }, 
      account: { homeAccountId: "acct", tenantId: "tenant" },
      authority: "https://login.microsoftonline.com/common",
    });

    const result = await connector1.loadCalendarEventsWithDiagnostic(calendarRange);

    // When scopes array is missing, calendarScope should be NOT_REPORTED
    expect(result.diagnostic.calendarScope).toBe("NOT_REPORTED");
    expect(result.diagnostic.calendarReturnedScopes).toBeUndefined();
    expect(result.diagnostic.tokenAudience).toBe("MICROSOFT_GRAPH_EXPECTED");
  });
});
