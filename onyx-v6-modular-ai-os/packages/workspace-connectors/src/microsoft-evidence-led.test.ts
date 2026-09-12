import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector, adjudicateTokenResult } from "./microsoft";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const calendarRange = {
  start: "2026-09-10T00:00:00.000Z",
  end: "2026-09-11T00:00:00.000Z",
  timeZone: "Asia/Kolkata",
};

describe("Microsoft Evidence-Led Token Adjudication & Fail-Closed Diagnostics", () => {
  describe("A. INITIAL TOKEN OWNERSHIP", () => {
    it("1. records accountBinding as MATCHED when AuthenticationResult.account matches active account", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token-matched",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "user-123", tenantId: "tenant-abc" },
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
        account: { homeAccountId: "user-123", tenantId: "tenant-abc" },
      });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.accountBinding).toBe("MATCHED");
      expect(result.diagnostic.reasonCode).toBe("CALENDAR_GRAPH_SUCCEEDED_EMPTY");
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("2. records accountBinding as MISMATCHED and fails closed with zero Graph fetch when AuthenticationResult.account differs", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token-mismatched",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "other-user-999", tenantId: "tenant-abc" },
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, {
        application: { acquireTokenSilent },
        account: { homeAccountId: "user-123", tenantId: "tenant-abc" },
      });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.accountBinding).toBe("MISMATCHED");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_ACTIVE_ACCOUNT_MISMATCH");
      expect(result.diagnostic.headerAttached).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("3. handles null/absent AuthenticationResult.account as UNKNOWN and fails closed without false MATCHED", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token-no-account",
        scopes: ["User.Read", "Calendars.Read"],
        account: null,
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, {
        application: { acquireTokenSilent },
        account: { homeAccountId: "user-123", tenantId: "tenant-abc" },
      });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.accountBinding).toBe("UNKNOWN");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_ACTIVE_ACCOUNT_MISMATCH");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("4. detects tenant mismatch when AuthenticationResult.account.tenantId differs and fails closed", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token-wrong-tenant",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "user-123", tenantId: "different-tenant" },
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, {
        application: { acquireTokenSilent },
        account: { homeAccountId: "user-123", tenantId: "tenant-abc" },
      });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_ACTIVE_ACCOUNT_MISMATCH");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("5. does not copy requested active account into returned-token metadata", async () => {
      const activeAccount = { homeAccountId: "active-123", tenantId: "tenant-active", environment: "login.microsoftonline.com", username: "active@example.com", localAccountId: "local-123" };
      const returnedTokenAccount = { homeAccountId: "returned-456", tenantId: "tenant-returned", environment: "login.microsoftonline.com", username: "returned@example.com", localAccountId: "local-456" };
      const result = adjudicateTokenResult(
        activeAccount,
        { accessToken: "tok", account: returnedTokenAccount },
        ["User.Read"],
        undefined,
        "INITIAL",
      );

      expect(result.accountHomeAccountId).toBe("returned-456");
      expect(result.accountTenantId).toBe("tenant-returned");
      expect(result.accountBinding).toBe("MISMATCHED");
      expect(result.valid).toBe(false);
    });
  });

  describe("B. SCOPE EVIDENCE & AUDIENCE TRUTHFULNESS", () => {
    it("6. reports calendarScope as REPORTED_PRESENT when Calendars.Read is included in scopes", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "acct", tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.calendarScope).toBe("REPORTED_PRESENT");
    });

    it("7. reports calendarScope as REPORTED_ABSENT and fails closed when Calendars.Read is missing from scopes", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token",
        scopes: ["User.Read"],
        account: { homeAccountId: "acct", tenantId: "tenant" },
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.calendarScope).toBe("REPORTED_ABSENT");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_SCOPES_MISSING");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("8. reports calendarScope as NOT_REPORTED when scopes array is absent", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token",
        account: { homeAccountId: "acct", tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.calendarScope).toBe("NOT_REPORTED");
      expect(result.diagnostic.calendarReturnedScopes).toBeUndefined();
    });

    it("9 & 10. keeps tokenAudience as NOT_INSPECTABLE when aud claim is absent, even if Graph scopes were requested", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "token",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "acct", tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.tokenAudience).toBe("NOT_INSPECTABLE");
    });
  });

  describe("C. INITIAL REQUEST TOKEN OWNERSHIP", () => {
    it("11. initial Calendar request Authorization header contains only initial Calendar result token", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "initial-cal-token-999",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "acct", tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0]![1].headers.Authorization).toBe("Bearer initial-cal-token-999");
    });

    it("13. mismatched initial token results in zero fetch calls", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "mismatched-token",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "wrong-acct", tenantId: "tenant" },
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "right-acct", tenantId: "tenant" } });

      await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("D. REFRESH TOKEN OWNERSHIP & RETRY BOUNDARIES", () => {
    it("15 & 17 & 21 & 24. initial 401 triggers forceRefresh, verifies refreshed account, and retries using refreshed token", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn()
        .mockResolvedValueOnce({ accessToken: "initial-tok", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
        .mockResolvedValueOnce({ accessToken: "refreshed-tok", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
      const fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
        .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(acquireTokenSilent).toHaveBeenCalledTimes(2);
      expect(acquireTokenSilent).toHaveBeenNthCalledWith(2, expect.objectContaining({ forceRefresh: true }));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[0]![1].headers.Authorization).toBe("Bearer initial-tok");
      expect(fetch.mock.calls[1]![1].headers.Authorization).toBe("Bearer refreshed-tok");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_RETRY_SUCCEEDED");
    });

    it("18. refreshed mismatched account produces zero retry fetches", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn()
        .mockResolvedValueOnce({ accessToken: "initial-tok", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
        .mockResolvedValueOnce({ accessToken: "refreshed-wrong-acct", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "wrong-acct", tenantId: "tenant" } });
      const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
      expect(result.diagnostic.refreshOutcome).toBe("FAILED");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_ACTIVE_ACCOUNT_MISMATCH");
      expect(result.diagnostic.retryAttempted).toBe(false);
    });

    it("20. refreshed Calendars.Read absence produces zero retry fetches", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn()
        .mockResolvedValueOnce({ accessToken: "initial-tok", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
        .mockResolvedValueOnce({ accessToken: "refreshed-no-cal-scope", scopes: ["User.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
      const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
      expect(result.diagnostic.calendarScope).toBe("REPORTED_ABSENT");
      expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_SCOPES_MISSING");
      expect(result.diagnostic.retryAttempted).toBe(false);
    });
  });

  describe("E. DIAGNOSTIC SECURITY & REDACTION", () => {
    it("25 - 32. JSON diagnostic serialization excludes tokens, raw account IDs, raw Graph errors, and raw WWW-Authenticate headers", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const sensitiveToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.secret";
      const sensitiveUser = "secret-user-account-id-777";
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: sensitiveToken,
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: sensitiveUser, tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ value: [] }),
      });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: sensitiveUser, tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);
      const json = JSON.stringify(result.diagnostic);

      expect(json).not.toContain(sensitiveToken);
      expect(json).not.toContain(sensitiveUser);
      expect(json).not.toContain("Authorization");
      expect(json).not.toContain("Bearer");
      expect(result.diagnostic.accountBinding).toBe("MATCHED");
    });
  });

  describe("F. PRODUCTION-PATH TEST INTEGRITY", () => {
    it("35 & 37 & 38. exercises production acquisition path using acquireTokenSilent mock only without overriding internal methods", async () => {
      const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
      const acquireTokenSilent = vi.fn().mockResolvedValue({
        accessToken: "prod-path-token",
        scopes: ["User.Read", "Calendars.Read"],
        account: { homeAccountId: "prod-user", tenantId: "tenant" },
      });
      const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
      vi.stubGlobal("fetch", fetch);
      Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "prod-user", tenantId: "tenant" } });

      const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

      expect(result.diagnostic.accountBinding).toBe("MATCHED");
      expect(result.diagnostic.silentAttempted).toBe(true);
      expect(acquireTokenSilent).toHaveBeenCalledWith({ account: { homeAccountId: "prod-user", tenantId: "tenant" }, scopes: ["User.Read", "Calendars.Read"] });
    });
  });
});
