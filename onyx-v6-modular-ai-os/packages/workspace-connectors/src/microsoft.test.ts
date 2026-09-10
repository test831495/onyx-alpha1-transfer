import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector } from "./microsoft";

const calendarRange = {
  start: "2026-09-10T00:00:00.000Z",
  end: "2026-09-11T00:00:00.000Z",
  timeZone: "Asia/Kolkata",
};

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
        organizer: "organizer@example.com",
        isOnlineMeeting: true,
        joinUrl: "https://meet.example.com/event-1",
        sensitivity: "normal",
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
});