import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector, selectMicrosoftAccount } from "./microsoft";
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
});