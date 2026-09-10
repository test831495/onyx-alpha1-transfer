import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector, selectMicrosoftAccount } from "./microsoft";
import { resolveRuntimeMicrosoftConfig } from "./microsoft-config";

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
});

describe("MicrosoftWorkspaceConnector calendar reads", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
      expect.stringContaining("https://graph.microsoft.com/v1.0/me/calendarView?"),
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