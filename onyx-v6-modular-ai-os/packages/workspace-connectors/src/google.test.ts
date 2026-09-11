import { describe, expect, it } from "vitest";
import {
  GOOGLE_CAPABILITIES,
  GOOGLE_SCOPES,
  createGoogleConnectionSnapshot,
  normalizeGoogleCalendarEvent,
  normalizeGoogleDriveFile,
  normalizeGmailMessage,
  createGoogleReadAdapter,
} from "./google";

describe("Google Workspace connector contracts", () => {
  it("freezes the least-privilege V1 capabilities and scopes", () => {
    expect(GOOGLE_CAPABILITIES).toEqual([
      "calendar.events.read",
      "mail.messages.read",
      "files.metadata.read",
    ]);
    expect(GOOGLE_SCOPES).toEqual([
      "openid",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]);
  });

  it("reports partial consent from granted capabilities rather than button state", () => {
    expect(
      createGoogleConnectionSnapshot({
        accountReference: "account:synthetic",
        grantedCapabilities: ["calendar.events.read", "files.metadata.read"],
      }),
    ).toMatchObject({
      state: "connected-partial",
      capabilities: {
        "calendar.events.read": "connected",
        "mail.messages.read": "insufficient-scope",
        "files.metadata.read": "connected",
      },
    });
  });

  it("normalizes read-only Calendar, Gmail, and Drive metadata", () => {
    expect(
      normalizeGoogleCalendarEvent({
        id: "event-1",
        summary: "Planning",
        start: { dateTime: "2026-09-11T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2026-09-11T11:00:00Z", timeZone: "UTC" },
        status: "confirmed",
      }),
    ).toMatchObject({ id: "event-1", subject: "Planning", allDay: false });
    expect(
      normalizeGmailMessage({
        id: "message-1",
        threadId: "thread-1",
        internalDate: "1757584800000",
        payload: { headers: [{ name: "Subject", value: "Hello" }] },
        snippet: "A bounded preview",
        labelIds: ["INBOX", "UNREAD"],
      }),
    ).toMatchObject({ id: "message-1", threadId: "thread-1", subject: "Hello" });
    expect(
      normalizeGoogleDriveFile({
        id: "file-1",
        name: "notes.txt",
        mimeType: "text/plain",
        createdTime: "2026-09-10T10:00:00Z",
        modifiedTime: "2026-09-11T10:00:00Z",
        trashed: false,
      }),
    ).toMatchObject({ id: "file-1", name: "notes.txt", isFolder: false, trashed: false });
  });

  it("uses bounded GET-only provider requests and follows continuation safely", async () => {
    const requests: Request[] = [];
    const adapter = createGoogleReadAdapter({
      accessToken: async () => "server-only-token",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return new Response(
          JSON.stringify(
            requests.length === 1
              ? { items: [{ id: "message-1", threadId: "thread-1" }], nextPageToken: "next" }
              : { items: [{ id: "message-2", threadId: "thread-2" }] },
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    const result = await adapter.listMail({ maximumResults: 2 });
    expect(result.items).toHaveLength(2);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
    expect(requests[0]!.url).toContain("users/me/messages");
    expect(requests[1]!.url).toContain("pageToken=next");
    expect(requests[0]!.headers.get("authorization")).toBe("Bearer server-only-token");
  });

  it("enforces aggregate Calendar limits and applies participant/status filters", async () => {
    const requests: Request[] = [];
    const adapter = createGoogleReadAdapter({
      accessToken: async () => "token",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return new Response(JSON.stringify({ items: [
          { id: "confirmed", summary: "A", status: "confirmed", start: { dateTime: "2026-09-11T10:00:00Z" }, end: { dateTime: "2026-09-11T11:00:00Z" }, attendees: [{ email: "rahul@example.com" }] },
          { id: "tentative", summary: "B", status: "tentative", start: { dateTime: "2026-09-11T12:00:00Z" }, end: { dateTime: "2026-09-11T13:00:00Z" }, attendees: [{ email: "other@example.com" }] },
        ], nextPageToken: "unneeded" }), { status: 200 });
      },
    });
    const result = await adapter.listCalendar({ startInclusive: "2026-09-11T00:00:00Z", endExclusive: "2026-09-12T00:00:00Z", maximumResults: 1, participant: "rahul@example.com", status: "confirmed" });
    expect(result.items).toHaveLength(1);
    expect(requests).toHaveLength(1);
  });

  it("escapes Drive backslashes before apostrophes", async () => {
    let requestUrl = "";
    const adapter = createGoogleReadAdapter({ accessToken: async () => "token", fetch: async (input) => { requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url).searchParams.get("q") ?? ""; return new Response(JSON.stringify({ files: [] }), { status: 200 }); } });
    await adapter.listFiles({ text: "trailing\\" });
    expect(requestUrl).toContain("trailing\\\\");
    expect(requestUrl).toContain("trashed = false");
  });
});