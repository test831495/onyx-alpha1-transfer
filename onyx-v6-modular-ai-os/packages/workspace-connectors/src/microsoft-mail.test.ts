import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector } from "./microsoft";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function connectedConnector(acquireTokenSilent: ReturnType<typeof vi.fn>) {
  const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
  Object.assign(connector, {
    application: { acquireTokenSilent },
    account: { homeAccountId: "account", tenantId: "tenant" },
  });
  return connector;
}

describe("MicrosoftWorkspaceConnector Mail.ReadBasic foundation", () => {
  it("MAIL-SCOPE-001 through 005 keeps profile, calendar, and mail scopes capability-specific", async () => {
    const loginRedirect = vi.fn().mockResolvedValue(undefined);
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { application: { loginRedirect }, account: { homeAccountId: "account", tenantId: "tenant" } });

    await connector.connectMail();

    expect(loginRedirect).toHaveBeenCalledWith({ scopes: ["User.Read", "Mail.ReadBasic"], prompt: "select_account" });
  });

  it("MAIL-READ-001 through 005 reads bounded metadata from /me/messages without Calendar permission", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "mail-token",
      scopes: ["User.Read", "Mail.ReadBasic"],
      account: { homeAccountId: "account", tenantId: "tenant" },
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [{
        id: "private-message-id",
        subject: "  Planning update  ",
        sender: { emailAddress: { name: "  Ada Lovelace  ", address: "private@example.invalid" } },
        receivedDateTime: "2026-09-12T10:00:00Z",
        isRead: false,
        hasAttachments: true,
      }] }),
    });
    vi.stubGlobal("fetch", fetch);
    const connector = connectedConnector(acquireTokenSilent);

    const result = await connector.loadMailMessagesWithDiagnostic();

    expect(acquireTokenSilent).toHaveBeenCalledWith({ account: { homeAccountId: "account", tenantId: "tenant" }, scopes: ["User.Read", "Mail.ReadBasic"] });
    const url = new URL(fetch.mock.calls[0]![0]);
    expect(url.pathname).toBe("/v1.0/me/messages");
    expect(url.searchParams.get("$top")).toBe("10");
    expect(url.searchParams.get("$select")?.split(",")).toEqual(["subject", "sender", "receivedDateTime", "isRead", "hasAttachments"]);
    expect(url.search).not.toMatch(/body|extended|internetMessageId/i);
    expect(result.messages).toEqual([{ provider: "microsoft", subject: "Planning update", senderDisplayName: "Ada Lovelace", receivedAt: "2026-09-12T10:00:00.000Z", isRead: false, hasAttachments: true }]);
    expect(Object.isFrozen(result.messages[0])).toBe(true);
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/mail-token|private-message-id|private@example|Planning update|Ada Lovelace/i);
  });

  it("MAIL-SCOPE-006 and 007 fails closed only for absent Mail.ReadBasic scope evidence", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "mail-token",
      scopes: ["User.Read", "Calendars.Read"],
      account: { homeAccountId: "account", tenantId: "tenant" },
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result.messages).toEqual([]);
    expect(result.diagnostic.reasonCode).toBe("MAIL_SCOPE_MISSING");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("MAIL-AUTH-005 blocks Graph on an account mismatch", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({
      accessToken: "mail-token",
      scopes: ["User.Read", "Mail.ReadBasic"],
      account: { homeAccountId: "other-account", tenantId: "tenant" },
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result.diagnostic.reasonCode).toBe("MAIL_ACCOUNT_MISMATCH");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("MAIL-READ-005 treats an empty mailbox as success", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) }));

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result).toMatchObject({ messages: [], diagnostic: { outcome: "EMPTY", reasonCode: "MAIL_EMPTY" } });
  });

  it("MAIL-READ-008 retries exactly once with independently adjudicated Mail scope", async () => {
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) });
    vi.stubGlobal("fetch", fetch);

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(acquireTokenSilent).toHaveBeenNthCalledWith(2, { account: { homeAccountId: "account", tenantId: "tenant" }, scopes: ["User.Read", "Mail.ReadBasic"], forceRefresh: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]![1].headers.Authorization).toBe("Bearer refreshed-mail-token");
    expect(result.diagnostic.reasonCode).toBe("MAIL_RETRY_SUCCEEDED");
  });

  it("MAIL-SCOPE-007 fails closed when the refreshed result lacks Mail.ReadBasic", async () => {
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce({ accessToken: "initial-mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } })
      .mockResolvedValueOnce({ accessToken: "refreshed-calendar-token", scopes: ["User.Read", "Calendars.Read"], account: { homeAccountId: "account", tenantId: "tenant" } });
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result.diagnostic).toMatchObject({ reasonCode: "MAIL_SCOPE_MISSING", refreshAttempted: true, retryAttempted: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("MAIL-READ-006 rejects malformed envelopes without retaining response data", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: { bodyPreview: "private content" }, "@odata.nextLink": "https://private.invalid/next" }) }));

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result).toMatchObject({ messages: [], diagnostic: { reasonCode: "MAIL_MALFORMED_RESPONSE" } });
    expect(JSON.stringify(result.diagnostic)).not.toMatch(/private content|private\.invalid|nextLink/i);
  });

  it("MAIL-READ-006 and 009 classify malformed, permission, rate-limit, and provider failures without retries", async () => {
    const statuses = [[403, "MAIL_HTTP_403"], [429, "MAIL_HTTP_429"], [503, "MAIL_PROVIDER_5XX"]] as const;
    for (const [status, reasonCode] of statuses) {
      const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } });
      const fetch = vi.fn().mockResolvedValue({ ok: false, status, headers: new Headers() });
      vi.stubGlobal("fetch", fetch);
      const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();
      expect(result.diagnostic.reasonCode).toBe(reasonCode);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("MAIL-ISO-001 keeps Mail success independent when Calendar would be unavailable", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "mail-token", scopes: ["User.Read", "Mail.ReadBasic"], account: { homeAccountId: "account", tenantId: "tenant" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ value: [] }) }));
    const connector = connectedConnector(acquireTokenSilent);

    const result = await connector.loadMailMessagesWithDiagnostic();

    expect(result.diagnostic.outcome).toBe("EMPTY");
    expect(acquireTokenSilent).not.toHaveBeenCalledWith(expect.objectContaining({ scopes: expect.arrayContaining(["Calendars.Read"]) }));
  });
});