import { afterEach, describe, expect, it, vi } from "vitest";
import { isFailedMicrosoftCalendarDiagnostic, isSuccessfulMicrosoftCalendarDiagnostic, MicrosoftWorkspaceConnector, selectMicrosoftAccount } from "./microsoft";
import { resolveRuntimeMicrosoftConfig } from "./microsoft-config";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const calendarRange = {
  start: "2026-09-10T00:00:00.000Z",
  end: "2026-09-11T00:00:00.000Z",
  timeZone: "Asia/Kolkata",
};

describe("Microsoft runtime config reachability", () => {
  it("selects the redirect account or one cached account and fails closed for ambiguity", () => {
    const redirectAccount = { homeAccountId: "redirect" } as any;
    const cachedAccount = { homeAccountId: "cached" } as any;

    expect(selectMicrosoftAccount(redirectAccount, [cachedAccount])).toBe(redirectAccount);
    expect(selectMicrosoftAccount(undefined, [cachedAccount])).toBe(cachedAccount);
    expect(() => selectMicrosoftAccount(undefined, [cachedAccount, redirectAccount])).toThrow(/multiple/i);
  });

  it("resolves approved Microsoft public runtime configuration", () => {
    const runtimeConfig = resolveRuntimeMicrosoftConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });

    expect(runtimeConfig.VITE_MS_CLIENT_ID).toBe("client");
    expect(runtimeConfig.VITE_MS_TENANT_ID).toBe("tenant");
    expect(runtimeConfig.VITE_MS_REDIRECT_URI).toBe("https://example.com/callback");
  });

  it("becomes configured once Microsoft client ID and tenant ID are available", () => {
    const runtimeConfig = resolveRuntimeMicrosoftConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });
    const connector = new MicrosoftWorkspaceConnector({
      clientId: runtimeConfig.VITE_MS_CLIENT_ID,
      tenantId: runtimeConfig.VITE_MS_TENANT_ID,
      authority: runtimeConfig.VITE_MS_AUTHORITY,
      redirectUri: runtimeConfig.VITE_MS_REDIRECT_URI,
    });

    expect(connector.configured).toBe(true);
  });

  it("remains unconfigured when the required public values are absent", () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "", tenantId: "" });

    expect(connector.configured).toBe(false);
  });

  it("reconnects by validating the calendar capability scope", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const getAccessToken = vi.fn().mockResolvedValue("access-token");
    Object.assign(connector, { getAccessToken });

    Object.assign(connector, { application: {}, account: {} });
    await connector.reconnect();

    expect(getAccessToken).toHaveBeenCalledWith(["Calendars.Read"]);
  });

  it("invokes the existing interactive sign-in flow when explicit reconnect requires interaction", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const loginRedirect = vi.fn().mockResolvedValue(undefined);
    const interactionError = Object.assign(new Error("interaction required"), { errorCode: "interaction_required" });
    const getAccessToken = vi.fn().mockRejectedValue(new Error("Microsoft Calendar sign-in is required. Use Reconnect to continue.", { cause: interactionError }));
    Object.assign(connector, { getAccessToken, application: { loginRedirect }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    await connector.reconnect();

    expect(loginRedirect).toHaveBeenCalledWith({ scopes: ["User.Read", "Calendars.Read"], prompt: "select_account" });
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-interaction reconnect failures without invoking interactive sign-in", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const loginRedirect = vi.fn().mockResolvedValue(undefined);
    const getAccessToken = vi.fn().mockRejectedValue(new Error("Microsoft authorization failed. Reconnect Microsoft and try again.", { cause: new Error("network down") }));
    Object.assign(connector, { getAccessToken, application: { loginRedirect }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    await expect(connector.reconnect()).rejects.toThrow("Microsoft authorization failed. Reconnect Microsoft and try again.");
    expect(loginRedirect).not.toHaveBeenCalled();
  });

  it("uses the documented default-calendar endpoint for calendarView", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const getAccessToken = vi.fn().mockResolvedValue("access-token");
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { getAccessToken });

    Object.assign(connector, { application: {}, account: { tenantId: "tenant-id", homeAccountId: "account" } });
    await connector.loadCalendarEvents({ start: "2026-09-10T00:00:00.000Z", end: "2026-09-11T00:00:00.000Z", timeZone: "Asia/Kolkata" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://graph.microsoft.com/v1.0/me/calendar/calendarView"),
      expect.any(Object),
    );

    const callArgs = (fetch as any).mock.calls[0];
    const url = new URL(callArgs[0]);
    expect(url.pathname).toBe("/v1.0/me/calendar/calendarView");
  });

  it("forwards the selected half-open range using the next range start as endDateTime", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const start = "2026-09-10T00:00:00.000Z";
    const end = "2026-09-11T00:00:00.000Z";

    const getAccessToken = vi.fn().mockResolvedValue("access-token");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { getAccessToken, application: {}, account: { tenantId: "t", homeAccountId: "a" } });

    await connector.loadCalendarEvents({ start, end, timeZone: "Asia/Kolkata" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const callUrl = (fetch as any).mock.calls[0][0];
    const url = new URL(callUrl);
    const params = url.searchParams;
    expect(url.pathname).toBe("/v1.0/me/calendar/calendarView");
    expect(params.getAll("startDateTime")).toEqual([start]);
    expect(params.getAll("endDateTime")).toEqual([end]);
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(new Date(start).toISOString()).toBe(start);
    expect(new Date(end).toISOString()).toBe(end);
    expect(params.get("endDateTime")).not.toBe("2026-09-10T23:59:59.999Z");
  });

  it("includes only privacy-safe fields in $select", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const getAccessToken = vi.fn().mockResolvedValue("access-token");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { getAccessToken, application: {}, account: { tenantId: "t", homeAccountId: "a" } });

    await connector.loadCalendarEvents({ start: "2026-09-10T00:00:00.000Z", end: "2026-09-11T00:00:00.000Z", timeZone: "Asia/Kolkata" });

    const callUrl = (fetch as any).mock.calls[0][0];
    const params = new URL(callUrl).searchParams;
    const selectFields = params.get("$select")?.split(",") ?? [];
    expect(selectFields).toContain("id");
    expect(selectFields).toContain("subject");
    expect(selectFields).toContain("start");
    expect(selectFields).toContain("end");
    expect(selectFields).not.toContain("body");
    expect(selectFields).not.toContain("bodyPreview");
  });

  it("releases a failed initialization attempt so a later call can retry", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const initializeOnce = vi.fn()
      .mockResolvedValueOnce({ provider: "microsoft", state: "error", diagnostic: "temporary failure" })
      .mockResolvedValueOnce({ provider: "microsoft", state: "connected", diagnostic: "connected" });
    Object.assign(connector, { initializeOnce });

    await expect(connector.initialize()).resolves.toMatchObject({ state: "error" });
    await expect(connector.initialize()).resolves.toMatchObject({ state: "connected" });
    expect(initializeOnce).toHaveBeenCalledTimes(2);
  });

  it("releases a rejected initialization attempt and shares concurrent attempts", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    let rejectAttempt: ((error: Error) => void) | undefined;
    const initializeOnce = vi.fn()
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectAttempt = reject; }))
      .mockResolvedValueOnce({ provider: "microsoft", state: "connected", diagnostic: "connected" });
    Object.assign(connector, { initializeOnce });

    const first = connector.initialize();
    const concurrent = connector.initialize();
    await Promise.resolve();
    expect(initializeOnce).toHaveBeenCalledTimes(1);
    rejectAttempt?.(new Error("temporary failure"));
    await expect(first).rejects.toThrow("temporary failure");
    await expect(concurrent).rejects.toThrow("temporary failure");

    await expect(connector.initialize()).resolves.toMatchObject({ state: "connected" });
    expect(initializeOnce).toHaveBeenCalledTimes(2);
  });
});

describe("MicrosoftWorkspaceConnector calendar reads", () => {
  it("reads calendarView with Calendars.Read and normalizes public event fields", async () => {
    const connector = new MicrosoftWorkspaceConnector({
      clientId: "client",
      tenantId: "tenant",
    });
    const getAccessToken = vi.fn().mockResolvedValue("access-token");
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [{
          id: "event-1",
          subject: "Planning",
          isAllDay: false,
          isCancelled: false,
          showAs: "busy",
          location: { displayName: "Studio" },
          organizer: { emailAddress: { address: "organizer@example.com" } },
          isOnlineMeeting: true,
          onlineMeeting: { joinUrl: "https://meet.example.com/event-1" },
          sensitivity: "normal",
          start: { dateTime: "2026-09-10T09:00:00", timeZone: "UTC" },
          end: { dateTime: "2026-09-10T10:00:00", timeZone: "UTC" },
        }],
      }),
    });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { getAccessToken });

    await expect(connector.loadCalendarEvents(calendarRange)).resolves.toEqual([
      {
        id: "event-1",
        subject: "Planning",
        start: "2026-09-10T09:00:00.000Z",
        end: "2026-09-10T10:00:00.000Z",
        isAllDay: false,
        isCancelled: false,
        showAs: "busy",
        location: "Studio",
        isOnlineMeeting: true,
      },
    ]);
    expect(getAccessToken).toHaveBeenCalledWith(["Calendars.Read"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://graph.microsoft.com/v1.0/me/calendar/calendarView?"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          Prefer: 'outlook.timezone="UTC"',
        }),
      }),
    );
  });

  it("fails closed when Microsoft rejects a calendar read", async () => {
    const connector = new MicrosoftWorkspaceConnector({
      clientId: "client",
      tenantId: "tenant",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    Object.assign(connector, { getAccessToken: vi.fn().mockResolvedValue("access-token") });

    await expect(connector.loadCalendarEvents(calendarRange)).rejects.toThrow(
      "Microsoft Graph calendar request failed (403).",
    );
  });

  it.each([
    [400, "CALENDAR_GRAPH_HTTP_400"], [401, "CALENDAR_GRAPH_HTTP_401"], [403, "CALENDAR_GRAPH_HTTP_403"],
    [404, "CALENDAR_GRAPH_HTTP_404"], [429, "CALENDAR_GRAPH_HTTP_429"], [503, "CALENDAR_GRAPH_HTTP_5XX"],
  ])("classifies Graph status %s without exposing response details", async (status, reasonCode) => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, headers: new Headers() }));
    Object.assign(connector, { getAccessToken: vi.fn().mockResolvedValue("access-token") });
    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);
    expect(result.events).toEqual([]);
    expect(result.diagnostic).toMatchObject({ stage: "GRAPH_RESPONSE", reasonCode, httpStatus: status });
    expect(JSON.stringify(result.diagnostic)).not.toContain("access-token");
  });

  it("classifies network, non-JSON, invalid-envelope, empty, and normalization outcomes with counts", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { getAccessToken: vi.fn().mockResolvedValue("access-token") });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network detail")));
    await expect(connector.loadCalendarEventsWithDiagnostic(calendarRange)).resolves.toMatchObject({ diagnostic: { reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "text/html" }), json: async () => ({}) }));
    await expect(connector.loadCalendarEventsWithDiagnostic(calendarRange)).resolves.toMatchObject({ diagnostic: { reasonCode: "CALENDAR_GRAPH_NON_JSON_RESPONSE" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: {} }) }));
    await expect(connector.loadCalendarEventsWithDiagnostic(calendarRange)).resolves.toMatchObject({ diagnostic: { reasonCode: "CALENDAR_GRAPH_VALUE_NOT_ARRAY" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) }));
    await expect(connector.loadCalendarEventsWithDiagnostic(calendarRange)).resolves.toMatchObject({ events: [], diagnostic: { outcome: "SUCCEEDED_EMPTY", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY", returnedEventCount: 0, normalizedEventCount: 0 } });
  });

  it("classifies token and range failures without retaining exception details", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { getAccessToken: vi.fn().mockRejectedValue(new Error("secret token detail")) });
    const tokenResult = await connector.loadCalendarEventsWithDiagnostic(calendarRange);
    expect(tokenResult.diagnostic.reasonCode).toBe("CALENDAR_TOKEN_ACQUISITION_FAILED");
    expect(JSON.stringify(tokenResult.diagnostic)).not.toContain("secret token detail");

    const rangeResult = await connector.loadCalendarEventsWithDiagnostic({ ...calendarRange, end: calendarRange.start });
    expect(rangeResult.diagnostic).toMatchObject({ stage: "RANGE_CONSTRUCTION", reasonCode: "CALENDAR_RANGE_INVALID", requestRangeValid: false });
  });

  it("centralizes success and failure diagnostic vocabulary", () => {
    expect(isSuccessfulMicrosoftCalendarDiagnostic({ stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_WITH_EVENTS" })).toBe(true);
    expect(isSuccessfulMicrosoftCalendarDiagnostic({ stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_EMPTY", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY" })).toBe(true);
    expect(isFailedMicrosoftCalendarDiagnostic({ stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_HTTP_403" })).toBe(true);
    expect(isFailedMicrosoftCalendarDiagnostic({ stage: "NORMALIZATION", outcome: "REJECTED", reasonCode: "CALENDAR_NORMALIZATION_REJECTED_ALL" })).toBe(true);
  });

  it("rejects compatibility reads for rejected normalization and preserves successful empty", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { loadCalendarEventsWithDiagnostic: vi.fn()
      .mockResolvedValueOnce({ events: [], diagnostic: { stage: "NORMALIZATION", outcome: "REJECTED", reasonCode: "CALENDAR_NORMALIZATION_REJECTED_ALL" } })
      .mockResolvedValueOnce({ events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_EMPTY", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY", returnedEventCount: 0, normalizedEventCount: 0 } }) });
    await expect(connector.loadCalendarEvents(calendarRange)).rejects.toThrow("normalization failed");
    await expect(connector.loadCalendarEvents(calendarRange)).resolves.toEqual([]);
  });

  it("reports returned, normalized, and rejected event counts", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { getAccessToken: vi.fn().mockResolvedValue("access-token") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [
      { id: "valid", subject: "Visible", start: { dateTime: "2026-09-10T09:00:00", timeZone: "UTC" }, end: { dateTime: "2026-09-10T10:00:00", timeZone: "UTC" } },
      { subject: "Malformed" },
    ] }) }));
    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);
    expect(result.diagnostic).toMatchObject({ reasonCode: "CALENDAR_NORMALIZATION_PARTIAL", returnedEventCount: 2, normalizedEventCount: 1, rejectedEventCount: 1 });
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/Visible|Malformed|access-token/);
  });

  it("redacts private event subjects and excludes confidential fields from UI state", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: [{
        id: "private-event",
        subject: "Secret meeting",
        sensitivity: "private",
        organizer: { emailAddress: { address: "private@example.com" } },
        onlineMeeting: { joinUrl: "https://private.example.com" },
        start: { dateTime: "2026-09-10T09:00:00", timeZone: "UTC" },
        end: { dateTime: "2026-09-10T10:00:00", timeZone: "UTC" },
      }] }),
    }));
    Object.assign(connector, { getAccessToken: vi.fn().mockResolvedValue("access-token") });

    const [event] = await connector.loadCalendarEvents(calendarRange);
    expect(event?.subject).toBe("Private event");
    expect(event).not.toHaveProperty("organizer");
    expect(event).not.toHaveProperty("joinUrl");
    expect(event).not.toHaveProperty("sensitivity");
  });

  it("returns a bounded interaction-required diagnostic without triggering an automatic redirect", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockRejectedValue(Object.assign(new Error("interaction required"), { errorCode: "interaction_required" }));
    const acquireTokenRedirect = vi.fn();
    const application = { acquireTokenSilent, acquireTokenRedirect };
    Object.assign(connector, { application, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_INTERACTION_REQUIRED");
    expect(result.diagnostic.interactionRequired).toBe(true);
    expect(acquireTokenRedirect).not.toHaveBeenCalled();
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/access-token|Bearer\s|Authorization|eyJ[A-Za-z0-9-_.]+|tenantId|homeAccountId|graph\.microsoft\.com/gi);
  });

  it("uses a refreshed token once after an initial 401 and succeeds on retry", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(acquireTokenSilent).toHaveBeenCalledTimes(2);
    expect(acquireTokenSilent).toHaveBeenNthCalledWith(2, expect.objectContaining({ forceRefresh: true }));
    expect(fetch.mock.calls[1]![1].headers.Authorization).toBe("Bearer refreshed-token");
    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_RETRY_SUCCEEDED");
    expect(result.events).toEqual([]);
    expect(JSON.stringify(result.diagnostic)).not.toContain("initial-token");
  });

  it("stops after a single retry when the refreshed token still returns 401 without claiming interaction is required", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenRedirect = vi.fn();
    const acquireTokenPopup = vi.fn();
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "redacted" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "redacted" }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent, acquireTokenRedirect, acquireTokenPopup }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(acquireTokenSilent).toHaveBeenCalledTimes(2);
    expect(acquireTokenRedirect).not.toHaveBeenCalled();
    expect(acquireTokenPopup).not.toHaveBeenCalled();
    expect(result.diagnostic).toMatchObject({
      reasonCode: "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION",
      finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION",
      initialGraphStatus: 401,
      refreshAttempted: true,
      refreshOutcome: "SUCCEEDED",
      retryAttempted: true,
      retryGraphStatus: 401,
      interactionRequired: false,
    });
  });

  it("classifies actual MSAL interaction-required during forced refresh without retrying Graph", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenRedirect = vi.fn();
    const acquireTokenPopup = vi.fn();
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockRejectedValueOnce(Object.assign(new Error("interaction required"), { errorCode: "interaction_required" }));
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent, acquireTokenRedirect, acquireTokenPopup }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(acquireTokenRedirect).not.toHaveBeenCalled();
    expect(acquireTokenPopup).not.toHaveBeenCalled();
    expect(result.diagnostic).toMatchObject({ reasonCode: "MICROSOFT_INTERACTION_REQUIRED", finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED", interactionRequired: true, refreshAttempted: true });
  });

  it("classifies a non-interaction forced-refresh failure without retrying Graph or claiming interaction is required", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenRedirect = vi.fn();
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockRejectedValueOnce(new Error("temporary network failure"));
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent, acquireTokenRedirect }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(acquireTokenRedirect).not.toHaveBeenCalled();
    expect(result.diagnostic).toMatchObject({ reasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", finalReasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", interactionRequired: false });
  });

  it("preserves proven credential and header facts when the initial Graph request fails on the network", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn().mockRejectedValue(new Error("network unreachable"));
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic).toMatchObject({
      reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
      finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
      credentialPresent: true,
      headerAttached: true,
      silentAttempted: true,
      interactionRequired: false,
    });
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/initial-token|Bearer\s|Authorization/i);
  });

  it("preserves refresh and header facts when the retry Graph request fails on the network", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockRejectedValueOnce(new Error("network unreachable"));
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.diagnostic).toMatchObject({
      reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
      finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
      refreshAttempted: true,
      refreshOutcome: "SUCCEEDED",
      retryAttempted: true,
      interactionRequired: false,
    });
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/refreshed-token|initial-token|Bearer\s|Authorization/i);
  });

  it("preserves proven credential and header facts when the initial Graph response is a non-401 failure", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, headers: new Headers() }));
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic).toMatchObject({ reasonCode: "CALENDAR_GRAPH_HTTP_403", finalReasonCode: "CALENDAR_GRAPH_HTTP_403", credentialPresent: true, headerAttached: true });
  });

  it("fails closed when the refresh token request is missing or empty", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent: vi.fn().mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } }).mockResolvedValueOnce({ accessToken: "", account: { homeAccountId: "acct", tenantId: "tenant" } }) }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_ACCESS_TOKEN_ABSENT");
    expect(result.diagnostic.interactionRequired).toBe(false);
  });

  it("classifies all Calendar endpoints as an external Microsoft Graph resource 401 when /me succeeds but Calendar is rejected", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "redacted" }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_CALENDAR_RESOURCE_EXTERNAL_401");
    expect(result.diagnostic.graphMeStatus).toBe(200);
    expect(result.diagnostic.defaultCalendarStatus).toBe(401);
    expect(result.diagnostic.calendarsCollectionStatus).toBe(401);
    expect(result.diagnostic.defaultCalendarViewStatus).toBe(401);
  });

  it("classifies a claims challenge as external calendar authorization intervention required", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "me" }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ "www-authenticate": 'Bearer realm="", authorization_uri="https://login.microsoftonline.com/common/oauth2/authorize", claims="{\"access_token\":{\"acrs\":\"c1\"}}"' }), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_CALENDAR_CLAIMS_CHALLENGE");
    expect(result.diagnostic.claimsChallengePresent).toBe(true);
  });

  it("classifies NoPermissionsInAccessToken distinctly from external 401 handling", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "me" }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "NoPermissionsInAccessToken" } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_GRAPH_CALENDAR_PERMISSION_NOT_ACCEPTED");
    expect(result.diagnostic.graphErrorClass).toBe("NO_PERMISSIONS_IN_ACCESS_TOKEN");
  });

  it.each([
    ["global token rejection", 401, undefined, "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY"],
    ["calendar root rejection", 200, 401, "MICROSOFT_GRAPH_CALENDAR_ROOT_REJECTED"],
    ["calendar permission rejection", 200, 403, "MICROSOFT_GRAPH_CALENDAR_PERMISSION_FORBIDDEN"],
    ["calendar view-specific rejection", 200, 200, "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION"],
  ])("isolates persistent 401 at the %s boundary", async (_label, meStatus, calendarStatus, reasonCode) => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() });
    if (meStatus === 401) {
      fetch.mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) });
    } else {
      fetch.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "redacted" }) });
      fetch.mockResolvedValueOnce({ ok: calendarStatus === 200, status: calendarStatus, headers: new Headers(), json: async () => calendarStatus === 200 ? ({ id: "redacted" }) : ({ error: { code: calendarStatus === 403 ? "ErrorAccessDenied" : "InvalidAuthenticationToken" } }) });
    }
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.reasonCode).toBe(reasonCode);
    expect(fetch).toHaveBeenCalledTimes(meStatus === 401 ? 3 : calendarStatus === 401 ? 9 : 4);
    if (meStatus === 401) expect(result.diagnostic.graphErrorClass).toBe("INVALID_AUTHENTICATION_TOKEN");
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/redacted|initial-token|refreshed-token|acct|tenant|Authorization|Bearer|InvalidAuthenticationToken|ErrorAccessDenied/);
  });

  it("uses one canonical account and refreshed Graph token for /me and Calendar root probes", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const canonicalAccount = { homeAccountId: "synthetic-account", tenantId: "synthetic-tenant" };
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: canonicalAccount })
      .mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: canonicalAccount });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "discarded" }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "InvalidAuthenticationToken" } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: canonicalAccount });

    await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(acquireTokenSilent).toHaveBeenNthCalledWith(1, { account: canonicalAccount, scopes: ["User.Read", "Calendars.Read"] });
    expect(acquireTokenSilent).toHaveBeenNthCalledWith(2, { account: canonicalAccount, scopes: ["User.Read", "Calendars.Read"], forceRefresh: true });
    const calendarRetryRequest = fetch.mock.calls[1]!;
    const meProbeRequest = fetch.mock.calls[2]!;
    const calendarRootProbeRequest = fetch.mock.calls[3]!;
    expect(meProbeRequest[0]).toBe("https://graph.microsoft.com/v1.0/me?$select=id");
    expect(calendarRootProbeRequest[0]).toBe("https://graph.microsoft.com/v1.0/me/calendar?$select=id");
    expect(meProbeRequest[1]).toMatchObject({ method: "GET" });
    expect(calendarRootProbeRequest[1]).toMatchObject({ method: "GET" });
    expect(meProbeRequest[1].headers.Authorization).toBe(calendarRetryRequest[1].headers.Authorization);
    expect(calendarRootProbeRequest[1].headers.Authorization).toBe(calendarRetryRequest[1].headers.Authorization);
  });

  it.each([
    ["missing id", { value: {} }],
    ["empty id", { value: { id: "" } }],
    ["non-string id", { value: { id: 123 } }],
  ])("stops after an invalid /me envelope: %s", async (_label, meBody) => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } }).mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => meBody.value });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.diagnostic.graphMeEnvelopeValid).toBe(false);
    expect(result.diagnostic.graphCalendarRootStatus).toBeUndefined();
    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER");
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/acct|tenant|initial-token|refreshed-token/);
  });

  it("stops after an invalid Calendar root envelope", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } }).mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "redacted" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "" }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(result.diagnostic.graphMeEnvelopeValid).toBe(true);
    expect(result.diagnostic.graphCalendarRootEnvelopeValid).toBe(false);
    expect(result.diagnostic.reasonCode).toBe("MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER");
    expect(JSON.stringify(result.diagnostic)).not.toContain("redacted");
  });

  it.each([
    ["InvalidAuthenticationToken", "INVALID_AUTHENTICATION_TOKEN"],
    ["ERROR_ACCESS_DENIED", "ERROR_ACCESS_DENIED"],
    ["error-access-denied", "ERROR_ACCESS_DENIED"],
    ["invalid authentication token", "INVALID_AUTHENTICATION_TOKEN"],
    ["TokenExpired", "TOKEN_EXPIRED"],
    ["TokenNotYetValid", "TOKEN_NOT_YET_VALID"],
    ["InvalidAudience", "INVALID_AUDIENCE"],
    ["NoPermissionsInAccessToken", "NO_PERMISSIONS_IN_ACCESS_TOKEN"],
    ["AccessDenied", "ACCESS_DENIED"],
  ])("normalizes Graph error code %s to %s without retaining the raw code", async (rawCode, expectedClass) => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } }).mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: rawCode } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.graphErrorClass).toBe(expectedClass);
    if (rawCode !== expectedClass) expect(JSON.stringify(result.diagnostic)).not.toContain(rawCode);
  });

  it("fails closed for unknown Graph error codes", async () => {
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    const acquireTokenSilent = vi.fn().mockResolvedValueOnce({ accessToken: "initial-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } }).mockResolvedValueOnce({ accessToken: "refreshed-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "acct", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { code: "FuturePrivateErrorCode" } }) });
    vi.stubGlobal("fetch", fetch);
    Object.assign(connector, { application: { acquireTokenSilent }, account: { homeAccountId: "acct", tenantId: "tenant" } });

    const result = await connector.loadCalendarEventsWithDiagnostic(calendarRange);

    expect(result.diagnostic.graphErrorClass).toBe("UNKNOWN_BOUNDED_GRAPH_ERROR");
    expect(JSON.stringify(result.diagnostic)).not.toContain("FuturePrivateErrorCode");
  });
});