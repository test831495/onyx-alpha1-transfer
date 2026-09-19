import { describe, expect, it } from "vitest";
import { canonicalizeGoogleCapabilities, createGoogleCalendarHandler, createGoogleCallbackHandler, createGoogleDisconnectHandler, createGoogleDriveHandler, createGoogleGmailHandler, createGoogleInitiateHandler, createGoogleStatusHandler, fingerprintForCapabilities, resolveGoogleCredentialBinding } from "./handlers";
import { OAuthPendingBindingMismatch } from "@onyx/provider-neutral-credential-store-session-foundation";
import type { GoogleServerRuntime } from "./index";

const runtime = { policy: { credentialOperationsEnabled: false } } as GoogleServerRuntime;
const capabilities = ["calendar.events.read", "mail.messages.read", "files.metadata.read"] as const;
const scopes = {
  "calendar.events.read": "https://www.googleapis.com/auth/calendar.events.readonly",
  "mail.messages.read": "https://www.googleapis.com/auth/gmail.readonly",
  "files.metadata.read": "https://www.googleapis.com/auth/drive.metadata.readonly",
} as const;
const allGrantSets = Array.from({ length: 1 << capabilities.length }, (_, mask) => capabilities.filter((_, index) => (mask & (1 << index)) !== 0)).filter((grantSet) => grantSet.length > 0);
const mismatchError = () => new OAuthPendingBindingMismatch();

const activeRuntime = (records: Record<string, unknown>, capturedBindings: Array<Record<string, unknown>> = []) => ({
  policy: { credentialOperationsEnabled: true },
  config: { redirectUri: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback" },
  sessionGateway: { validate: async () => ({ context: { canonicalAccountRef: "account-one", sessionRef: "session-one" } }) },
  credentialStore: {
    findActive: async (binding: Record<string, unknown>) => {
      capturedBindings.push(binding);
      const record = records[String(binding.capabilityFingerprint)];
      return record ? { ...binding, ...(record as Record<string, unknown>) } : undefined;
    },
    create: async () => undefined,
    delete: async () => undefined,
  },
  createReadAdapter: async (binding: Record<string, unknown>) => {
    capturedBindings.push(binding);
    return {
      listCalendar: async () => ({ items: [] }),
      listMail: async () => ({ items: [] }),
      listFiles: async () => ({ items: [] }),
    };
  },
}) as unknown as GoogleServerRuntime;

const callbackRuntime = (grantedCapabilities: readonly (typeof capabilities[number])[], expectedFingerprint: string, persisted: Array<Record<string, unknown>>) => {
  const active = activeRuntime({}, []);
  const mutable = active as any;
  mutable.oauthPendingStore = {
    consume: async (_state: string, candidate: Record<string, unknown>) => {
      if (candidate.capabilityFingerprint !== expectedFingerprint) throw mismatchError();
      return "verifier";
    },
  };
  mutable.oauth = {
    exchangeCode: async () => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresInSeconds: 300,
      grantedScopes: grantedCapabilities.map((capability) => scopes[capability]),
    }),
  };
  mutable.credentialStore.create = async (candidate: Record<string, unknown>) => { persisted.push(candidate); return undefined; };
  return active;
};

describe("Google Function route boundaries", () => {
  it("canonicalizes capability sets deterministically and rejects unknown values", () => {
    expect(canonicalizeGoogleCapabilities(["mail.messages.read", "calendar.events.read", "mail.messages.read", "files.metadata.read"]))
      .toEqual(["calendar.events.read", "files.metadata.read", "mail.messages.read"]);
    expect(canonicalizeGoogleCapabilities(["files.metadata.read", "calendar.events.read"]))
      .toEqual(["calendar.events.read", "files.metadata.read"]);
    expect(() => canonicalizeGoogleCapabilities(["unknown.capability"])).toThrow();
  });

  it("resolves a full grant for each individually granted capability", async () => {
    const active = activeRuntime({ "calendar.events.read|files.metadata.read|mail.messages.read": { recordId: "full-record", state: "ACTIVE" } }, []);
    for (const capability of ["calendar.events.read", "mail.messages.read", "files.metadata.read"]) {
      const resolved = await resolveGoogleCredentialBinding(active, "account-one", capability);
      expect(resolved).toBeDefined();
    }
  });

  it("rejects mutation methods other than POST before runtime access", async () => {
    const response = await createGoogleInitiateHandler(runtime)({ httpMethod: "GET" });
    expect(response.statusCode).toBe(405);
    expect(response.headers?.allow).toBe("POST");
  });

  it("fails closed before provider access when activation is disabled", async () => {
    const response = await createGoogleCalendarHandler(runtime)({ httpMethod: "POST", body: "{}" });
    expect(response.statusCode).toBe(503);
    expect(response.body).toContain("UNAVAILABLE");
  });

  it("reports no grant and fails closed for all read routes", async () => {
    const bindings: Array<Record<string, unknown>> = [];
    const active = activeRuntime({}, bindings);
    const status = await createGoogleStatusHandler(active)({ httpMethod: "GET" });
    expect(JSON.parse(status.body)).toMatchObject({ status: "NOT_CONNECTED" });

    for (const handler of [createGoogleGmailHandler, createGoogleCalendarHandler, createGoogleDriveHandler]) {
      const response = await handler(active)({ httpMethod: "POST", body: "{}" });
      expect(response.statusCode).toBe(400);
    }
    expect(bindings.every((binding) => binding.canonicalAccountRef === "account-one")).toBe(true);
  });

  it("uses one partial canonical credential for status and the matching read route", async () => {
    const bindings: Array<Record<string, unknown>> = [];
    const active = activeRuntime({ "mail.messages.read": { recordId: "mail-record", state: "ACTIVE" } }, bindings);
    const status = await createGoogleStatusHandler(active)({ httpMethod: "GET" });
    expect(JSON.parse(status.body)).toMatchObject({
      status: "CONNECTED_PARTIAL",
      capabilities: { "mail.messages.read": "connected", "calendar.events.read": "insufficient-scope", "files.metadata.read": "insufficient-scope" },
    });
    const response = await createGoogleGmailHandler(active)({ httpMethod: "POST", body: "{}" });
    expect(response.statusCode).toBe(200);
    expect(bindings.filter((binding) => binding.capabilityFingerprint === "mail.messages.read").length).toBeGreaterThan(0);
  });

  it("uses the full canonical credential for all read routes", async () => {
    const bindings: Array<Record<string, unknown>> = [];
    const active = activeRuntime({ "calendar.events.read|files.metadata.read|mail.messages.read": { recordId: "full-record", state: "ACTIVE" } }, bindings);
    const status = await createGoogleStatusHandler(active)({ httpMethod: "GET" });
    expect(JSON.parse(status.body)).toMatchObject({ status: "CONNECTED" });
    for (const handler of [createGoogleGmailHandler, createGoogleCalendarHandler, createGoogleDriveHandler]) {
      expect((await handler(active)({ httpMethod: "POST", body: "{}" })).statusCode).toBe(200);
    }
    expect(bindings.filter((binding) => binding.capabilityFingerprint === "calendar.events.read|files.metadata.read|mail.messages.read").length).toBeGreaterThan(0);
  });

  it("does not expose expired or invalid grants and preserves account isolation", async () => {
    const active = activeRuntime({ "mail.messages.read": { recordId: "expired-record", state: "REAUTHENTICATION_REQUIRED" } }, []);
    const status = await createGoogleStatusHandler(active)({ httpMethod: "GET" });
    expect(JSON.parse(status.body).status).toBe("NOT_CONNECTED");
    expect((await createGoogleGmailHandler(active)({ httpMethod: "POST", body: "{}" })).statusCode).toBe(400);

    const mismatchedBindings: Array<Record<string, unknown>> = [];
    const mismatched = activeRuntime({ "mail.messages.read": { recordId: "invalid-record", state: "UNKNOWN" } }, mismatchedBindings);
    (mismatched.sessionGateway.validate as unknown as () => Promise<unknown>) = async () => ({ context: { canonicalAccountRef: "account-two", sessionRef: "session-two" } });
    const mismatchStatus = await createGoogleStatusHandler(mismatched)({ httpMethod: "GET" });
    expect(JSON.parse(mismatchStatus.body).status).toBe("NOT_CONNECTED");
    expect(mismatchedBindings.every((binding) => binding.canonicalAccountRef === "account-two")).toBe(true);
  });

  it("persists a partial OAuth grant under the same canonical capability fingerprint", async () => {
    let persistedBinding: Record<string, unknown> | undefined;
    const active = activeRuntime({}, []);
    const mutableActive = active as any;
    mutableActive.oauthPendingStore = { consume: async (_state: string, binding: Record<string, unknown>) => {
      if (binding.capabilityFingerprint !== "mail.messages.read") throw mismatchError();
      return "verifier";
    } } as never;
    mutableActive.oauth = { exchangeCode: async () => ({ accessToken: "access", refreshToken: "refresh", expiresInSeconds: 300, grantedScopes: ["https://www.googleapis.com/auth/gmail.readonly"] }) } as never;
    mutableActive.credentialStore.create = async (binding: Record<string, unknown>) => { persistedBinding = binding; return undefined; };
    const response = await createGoogleCallbackHandler(active)({ httpMethod: "GET", queryStringParameters: { state: "state", code: "code" } });
    expect(response.statusCode).toBe(302);
    expect(persistedBinding?.capabilityFingerprint).toBe("mail.messages.read");
    expect(persistedBinding?.canonicalAccountRef).toBe("account-one");
  });

  it("retries only an explicit pending-binding mismatch and keeps attempts bounded", async () => {
    const attempts: string[] = [];
    const active = activeRuntime({}, []);
    const mutable = active as any;
    mutable.oauthPendingStore = {
      consume: async (_state: string, candidate: Record<string, unknown>) => {
        attempts.push(String(candidate.capabilityFingerprint));
        if (attempts.length < 2) throw mismatchError();
        return "verifier";
      },
    };
    mutable.oauth = { exchangeCode: async () => ({ accessToken: "access", refreshToken: "refresh", expiresInSeconds: 300, grantedScopes: [scopes["mail.messages.read"]] }) };
    mutable.credentialStore.create = async () => undefined;
    const response = await createGoogleCallbackHandler(active)({ httpMethod: "GET", queryStringParameters: { state: "state", code: "code" } });
    expect(response.statusCode).toBe(302);
    expect(attempts).toHaveLength(2);
    expect(new Set(attempts).size).toBe(2);
  });

  it.each([
    ["OAuth transaction unavailable", new Error("OAuth transaction unavailable")],
    ["storage failure", new Error("database unavailable")],
    ["malformed transaction", new Error("malformed transaction")],
    ["account mismatch", new Error("account mismatch")],
    ["session mismatch", new Error("session mismatch")],
    ["unknown failure", new Error("unexpected failure")],
  ])("fails fast without alternate pending-binding attempts for %s", async (_label, error) => {
    const attempts: string[] = [];
    const active = activeRuntime({}, []);
    const mutable = active as any;
    mutable.oauthPendingStore = { consume: async (_state: string, candidate: Record<string, unknown>) => { attempts.push(String(candidate.capabilityFingerprint)); throw error; } };
    const response = await createGoogleCallbackHandler(active)({ httpMethod: "GET", queryStringParameters: { state: "state", code: "code" } });
    expect(response.statusCode).toBe(302);
    expect(attempts).toHaveLength(1);
    expect(response.headers?.location).not.toContain("database unavailable");
  });

  it("bounds explicit mismatch retries when no compatible pending binding exists", async () => {
    const attempts: string[] = [];
    const active = activeRuntime({}, []);
    const mutable = active as any;
    mutable.oauthPendingStore = { consume: async (_state: string, candidate: Record<string, unknown>) => { attempts.push(String(candidate.capabilityFingerprint)); throw mismatchError(); } };
    const response = await createGoogleCallbackHandler(active)({ httpMethod: "GET", queryStringParameters: { state: "state", code: "code" } });
    expect(response.statusCode).toBe(302);
    expect(attempts).toHaveLength(7);
    expect(new Set(attempts).size).toBe(7);
    expect(response.headers?.location).toBe("https://onyx-alpha0.netlify.app/?google_status=error-safe");
  });

  it("covers every grant combination with canonical, order-independent fingerprints", () => {
    expect(() => canonicalizeGoogleCapabilities([])).toThrow();
    for (const grantSet of allGrantSets) {
      const reversed = [...grantSet].reverse();
      expect(canonicalizeGoogleCapabilities(reversed)).toEqual(canonicalizeGoogleCapabilities(grantSet));
      expect(fingerprintForCapabilities([...grantSet, ...grantSet])).toBe(fingerprintForCapabilities(grantSet));
      expect(Object.isFrozen(canonicalizeGoogleCapabilities(grantSet))).toBe(true);
      expect(fingerprintForCapabilities(grantSet)).not.toMatch(/token|secret|Bearer/i);
    }
    expect(() => canonicalizeGoogleCapabilities(["calendar.events.write"])).toThrow();
  });

  it("persists every granted capability combination and excludes ungranted scopes", async () => {
    for (const grantSet of allGrantSets) {
      const persisted: Array<Record<string, unknown>> = [];
      const expectedFingerprint = fingerprintForCapabilities(grantSet);
      const active = callbackRuntime(grantSet, expectedFingerprint, persisted);
      const response = await createGoogleCallbackHandler(active)({ httpMethod: "GET", queryStringParameters: { state: "state", code: "code" } });
      expect(response.statusCode).toBe(302);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({ canonicalAccountRef: "account-one", capabilityFingerprint: expectedFingerprint });
      expect(persisted[0]!.capabilityFingerprint).not.toContain("write");
      expect(response.headers?.location).toContain(grantSet.length === capabilities.length ? "google_status=connected" : "google_status=connected-partial");
      expect(response.headers?.location).not.toContain("connected-empty");
    }
  });

  it("keeps status and read execution aligned for every grant combination", async () => {
    const handlers = {
      "calendar.events.read": createGoogleCalendarHandler,
      "mail.messages.read": createGoogleGmailHandler,
      "files.metadata.read": createGoogleDriveHandler,
    } as const;
    for (const grantSet of allGrantSets) {
      const fingerprint = fingerprintForCapabilities(grantSet);
      const active = activeRuntime({ [fingerprint]: { recordId: fingerprint, state: "ACTIVE" } }, []);
      const status = JSON.parse((await createGoogleStatusHandler(active)({ httpMethod: "GET" })).body);
      expect(status.status).toBe(grantSet.length === capabilities.length ? "CONNECTED" : "CONNECTED_PARTIAL");
      for (const capability of capabilities) {
        const response = await handlers[capability](active)({ httpMethod: "POST", body: "{}" });
        expect(response.statusCode).toBe(grantSet.includes(capability) ? 200 : 400);
        expect(status.capabilities[capability]).toBe(grantSet.includes(capability) ? "connected" : "insufficient-scope");
      }
    }
  });

  it("disconnects each canonical binding once and denies malformed or unavailable records", async () => {
    for (const grantSet of allGrantSets) {
      const fingerprint = fingerprintForCapabilities(grantSet);
      const deleted: string[] = [];
      const active = activeRuntime({ [fingerprint]: { recordId: fingerprint, state: "ACTIVE" } }, []);
      (active.credentialStore.delete as unknown as (recordId: string) => Promise<void>) = async (recordId) => { deleted.push(recordId); };
      const response = await createGoogleDisconnectHandler(active)({ httpMethod: "POST" });
      expect(response.statusCode).toBe(200);
      expect(deleted).toEqual([fingerprint]);
    }
    const malformed = activeRuntime({ "mail.messages.read": { recordId: "malformed", state: "ACTIVE", providerId: "other" } }, []);
    expect(JSON.parse((await createGoogleStatusHandler(malformed)({ httpMethod: "GET" })).body).status).toBe("NOT_CONNECTED");
    const unavailable = activeRuntime({}, []);
    (unavailable.credentialStore.findActive as unknown as () => Promise<never>) = async () => { throw new Error("storage unavailable"); };
    expect((await createGoogleStatusHandler(unavailable)({ httpMethod: "GET" })).statusCode).toBe(400);
  });

  it("fails closed for account and session mismatches", async () => {
    const wrongAccount = activeRuntime({ "mail.messages.read": { recordId: "wrong-account", state: "ACTIVE", canonicalAccountRef: "account-two" } }, []);
    expect(JSON.parse((await createGoogleStatusHandler(wrongAccount)({ httpMethod: "GET" })).body).status).toBe("NOT_CONNECTED");
    const wrongSession = activeRuntime({ "mail.messages.read": { recordId: "session-record", state: "ACTIVE" } }, []);
    (wrongSession.sessionGateway.validate as unknown as () => Promise<never>) = async () => { throw new Error("session context mismatch"); };
    expect((await createGoogleGmailHandler(wrongSession)({ httpMethod: "POST", body: "{}" })).statusCode).toBe(400);
  });
});