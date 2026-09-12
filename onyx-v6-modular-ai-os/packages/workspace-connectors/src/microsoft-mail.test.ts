import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftWorkspaceConnector, type MicrosoftMailRuntimeTrace } from "./microsoft";

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

function mailToken(account: unknown, scopes = ["User.Read", "Mail.ReadBasic"]) {
  return { accessToken: "mail-token", scopes, account };
}

function emptyMailboxResponse(body: unknown) {
  return { ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => body };
}

describe("MicrosoftWorkspaceConnector Mail.ReadBasic foundation", () => {
  it("MAIL-TRACE-001 records only bounded runtime stages and data", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyMailboxResponse({ value: [] })));
    const traces: MicrosoftMailRuntimeTrace[] = [];
    const connector = connectedConnector(acquireTokenSilent);

    await connector.loadMailMessagesWithDiagnostic({
      diagnosticsEnabled: true,
      buildIdentity: { sha: "e623e5e", context: "local", version: "6.0.0-alpha.3.1.1b" },
      onTrace: (trace) => traces.push(trace),
    });

    const finalTrace = traces.at(-1);
    expect(finalTrace).toMatchObject({
      schemaVersion: 1,
      buildIdentity: { sha: "e623e5e", context: "local", version: "6.0.0-alpha.3.1.1b" },
      stage: "COMPLETED",
      statusClass: "SUCCESS_2XX",
      tokenStage: "SILENT_SUCCEEDED",
      responseEnvelopeClass: "OBJECT_WITH_VALUE_ARRAY",
      normalizedItemCount: 0,
      rejectedItemCount: 0,
      requestCompleted: true,
    });
    expect(JSON.stringify(finalTrace)).not.toMatch(/mail-token|account-id|tenant-id|private-message|private@example|Planning update|Ada Lovelace|exception text/i);
    expect(traces.map((trace) => trace.stage)).toEqual(expect.arrayContaining([
      "REFRESH_REQUESTED",
      "TOKEN_REQUESTED",
      "TOKEN_ACQUIRED",
      "ACCOUNT_BINDING_EVALUATED",
      "GRAPH_REQUEST_STARTED",
      "GRAPH_RESPONSE_RECEIVED",
      "RESPONSE_PARSE_STARTED",
      "RESPONSE_PARSED",
      "ITEMS_NORMALIZED",
      "COMPLETED",
    ]));
  });

  it("MAIL-TRACE-002 keeps diagnostics absent when the trace sink is not enabled", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyMailboxResponse({ value: [] })));
    const connector = connectedConnector(acquireTokenSilent);
    const result = await connector.loadMailMessagesWithDiagnostic();
    expect(result.diagnostic.reasonCode).toBe("MAIL_EMPTY");
  });

  it.each([[403, "FORBIDDEN_403"], [429, "RATE_LIMITED_429"], [503, "PROVIDER_5XX"]] as const)("MAIL-TRACE-003 maps synthetic Graph status %s safely", async (status, statusClass) => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, headers: new Headers() }));
    const traces: MicrosoftMailRuntimeTrace[] = [];
    await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic({ diagnosticsEnabled: true, buildIdentity: { sha: "", context: "unknown", version: "" }, onTrace: (trace) => traces.push(trace) });
    expect(traces.at(-1)).toMatchObject({ stage: "FAILED", statusClass, retryAttempted: false, requestCompleted: false, buildIdentity: { sha: "UNKNOWN", version: "UNKNOWN" } });
  });

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

  it.each([
    ["both homeAccountIds absent", { tenantId: "tenant" }, { tenantId: "tenant" }],
    ["returned homeAccountId absent", { homeAccountId: "account", tenantId: "tenant" }, { tenantId: "tenant" }],
    ["different homeAccountIds", { homeAccountId: "account", tenantId: "tenant" }, { homeAccountId: "other", tenantId: "tenant" }],
    ["different tenantIds", { homeAccountId: "account", tenantId: "tenant" }, { homeAccountId: "account", tenantId: "other" }],
  ])("MAIL-AUTH-005 fails closed when %s", async (_label, expectedAccount, returnedAccount) => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken(returnedAccount));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { application: { acquireTokenSilent }, account: expectedAccount });

    const result = await connector.loadMailMessagesWithDiagnostic();

    expect(result.diagnostic).toMatchObject({ reasonCode: "MAIL_ACCOUNT_MISMATCH" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["both tenantIds absent", { homeAccountId: "account" }, { homeAccountId: "account" }],
    ["returned tenantId absent", { homeAccountId: "account", tenantId: "tenant" }, { homeAccountId: "account" }],
  ])("MAIL-AUTH-005 allows Graph eligibility when %s and homeAccountId matches", async (_label, expectedAccount, returnedAccount) => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken(returnedAccount));
    const fetch = vi.fn().mockResolvedValue(emptyMailboxResponse({ value: [] }));
    vi.stubGlobal("fetch", fetch);
    const connector = new MicrosoftWorkspaceConnector({ clientId: "client", tenantId: "tenant" });
    Object.assign(connector, { application: { acquireTokenSilent }, account: expectedAccount });

    const result = await connector.loadMailMessagesWithDiagnostic();

    expect(result.diagnostic).toMatchObject({ reasonCode: "MAIL_EMPTY", accountBinding: "MATCHED" });
    expect(fetch).toHaveBeenCalledTimes(1);
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

  it.each([null, undefined, "not an envelope", 7, false, []])("MAIL-READ-006 bounds non-object JSON body %# without throwing", async (body) => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyMailboxResponse(body)));

    await expect(connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic()).resolves.toMatchObject({
      messages: [],
      diagnostic: { reasonCode: "MAIL_MALFORMED_RESPONSE" },
    });
  });

  it("MAIL-READ-006 bounds missing/non-array values and thrown JSON parsing", async () => {
    const bodies = [{}, { value: "not an array" }];
    for (const body of bodies) {
      const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyMailboxResponse(body)));
      await expect(connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic()).resolves.toMatchObject({ diagnostic: { reasonCode: "MAIL_MALFORMED_RESPONSE" } });
    }
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ...emptyMailboxResponse({}), json: async () => { throw new Error("private parser failure"); } }));
    await expect(connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic()).resolves.toMatchObject({ diagnostic: { reasonCode: "MAIL_MALFORMED_RESPONSE" } });
  });

  it("MAIL-READ-006 rejects hostile items while retaining deterministic counts", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue(mailToken({ homeAccountId: "account", tenantId: "tenant" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyMailboxResponse({ value: [
      null, undefined, "message", 4, [], {}, { sender: null, receivedDateTime: "2026-09-12T10:00:00Z" }, { receivedDateTime: "invalid" },
      { subject: "valid", sender: { emailAddress: { name: "sender" } }, receivedDateTime: "2026-09-12T10:00:00Z", isRead: true, hasAttachments: false },
    ] })));

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result.messages).toHaveLength(1);
    expect(result.diagnostic).toMatchObject({ returnedMessageCount: 9, normalizedMessageCount: 1, rejectedMessageCount: 8 });
    expect(JSON.stringify(result.diagnostic)).not.toContain("valid");
  });

  it("MAIL-AUTH-006 rejects refreshed missing identity evidence without a retry", async () => {
    const acquireTokenSilent = vi.fn()
      .mockResolvedValueOnce(mailToken({ homeAccountId: "account", tenantId: "tenant" }))
      .mockResolvedValueOnce(mailToken({ tenantId: "tenant" }));
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);

    const result = await connectedConnector(acquireTokenSilent).loadMailMessagesWithDiagnostic();

    expect(result.diagnostic).toMatchObject({ reasonCode: "MAIL_ACCOUNT_MISMATCH", refreshAttempted: true, retryAttempted: false });
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