import { createHash } from "node:crypto";
import type { CredentialBinding, GatewayRequest } from "@onyx/provider-neutral-credential-store-session-foundation";
import { GOOGLE_CAPABILITIES, GOOGLE_SCOPES, type CalendarQuery, type FileQuery, type MailQuery } from "@onyx/workspace-connectors";
import { GOOGLE_CAPABILITY_FINGERPRINT, GOOGLE_PROVIDER_ID, GOOGLE_PURPOSE, type GoogleServerRuntime } from "./index";

export type GoogleFunctionEvent = {
  readonly httpMethod?: string;
  readonly headers?: Record<string, string | undefined>;
  readonly body?: string | null;
  readonly queryStringParameters?: Record<string, string | undefined>;
};
export type GoogleFunctionResponse = { readonly statusCode: number; readonly headers?: Record<string, string>; readonly body: string };
export type GoogleFunctionHandler = (event: GoogleFunctionEvent) => Promise<GoogleFunctionResponse>;

const json = (statusCode: number, value: unknown, headers: Record<string, string> = { "content-type": "application/json" }): GoogleFunctionResponse => ({ statusCode, headers, body: JSON.stringify(value) });
const header = (event: GoogleFunctionEvent, name: string): string | undefined => Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
const expectedOrigin = (event: GoogleFunctionEvent): string => process.env.ONYX_APP_ORIGIN ?? "https://onyx-alpha0.netlify.app";
const parseBody = (event: GoogleFunctionEvent): Record<string, unknown> => {
  if (!event.body) return {};
  const value: unknown = JSON.parse(event.body);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body rejected.");
  return value as Record<string, unknown>;
};
const sessionRequest = (event: GoogleFunctionEvent): GatewayRequest => ({
  method: event.httpMethod ?? "",
  cookieHeader: header(event, "cookie"),
  sessionProof: header(event, "x-onyx-session-proof"),
  origin: header(event, "origin"),
  expectedOrigin: expectedOrigin(event),
  csrfToken: header(event, "x-csrf-token"),
  idempotencyKey: header(event, "idempotency-key"),
  contentType: header(event, "content-type")?.split(";", 1)[0],
});
const redirectFingerprint = (redirectUri: string): string => createHash("sha256").update(redirectUri).digest("base64url");
const codeChallenge = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");
const canonicalCapabilities = (capabilities: readonly string[]): string => [...capabilities].sort().join("|");
const active = (runtime: GoogleServerRuntime): GoogleFunctionResponse | undefined => runtime.policy.credentialOperationsEnabled ? undefined : json(503, { status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." });
const failure = (error: unknown): GoogleFunctionResponse => json(400, { status: "ERROR_SAFE", message: error instanceof Error ? error.message : "Google request was rejected." });

function binding(account: string, capabilityFingerprint: string = GOOGLE_CAPABILITY_FINGERPRINT, connectorAccountRef = `google-account:${account}`): CredentialBinding {
  return { canonicalAccountRef: account, providerId: GOOGLE_PROVIDER_ID, connectorAccountRef, credentialType: "oauth-refresh-token", purpose: GOOGLE_PURPOSE, capabilityFingerprint };
}

export function createGoogleInitiateHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." }, { allow: "POST", "content-type": "application/json" });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const body = parseBody(event);
      const reconnect = body.reconnect === true;
      const requested = Array.isArray(body.capabilities) ? body.capabilities.filter((value): value is string => typeof value === "string") : [...GOOGLE_CAPABILITIES];
      if (requested.some((capability) => !GOOGLE_CAPABILITIES.includes(capability as (typeof GOOGLE_CAPABILITIES)[number]))) throw new Error("Google capability request rejected.");
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const pending = await runtime.oauthPendingStore.create({ providerId: GOOGLE_PROVIDER_ID, canonicalAccountRef: validation.context.canonicalAccountRef, sessionRef: validation.context.sessionRef, purpose: GOOGLE_PURPOSE, capabilityFingerprint: canonicalCapabilities(requested), redirectUriFingerprint: redirectFingerprint(runtime.config.redirectUri) });
      return json(200, { status: "CONNECTING", authorizationUrl: runtime.oauth.authorizationUrl({ state: pending.state, codeChallenge: codeChallenge(pending.codeVerifier), reconnect }) });
    } catch (error) { return failure(error); }
  };
}

export function createGoogleCallbackHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." }, { allow: "GET", "content-type": "application/json" });
    const inactive = active(runtime); if (inactive) return inactive;
    const params = event.queryStringParameters ?? {};
    if (!params.state || !params.code) return failure(new Error("Google authorization could not be completed."));
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const pending = await runtime.oauthPendingStore.consume(params.state, { providerId: GOOGLE_PROVIDER_ID, canonicalAccountRef: validation.context.canonicalAccountRef, sessionRef: validation.context.sessionRef, purpose: GOOGLE_PURPOSE, capabilityFingerprint: GOOGLE_CAPABILITY_FINGERPRINT, redirectUriFingerprint: redirectFingerprint(runtime.config.redirectUri) });
      const token = await runtime.oauth.exchangeCode(params.code, pending);
      const granted = GOOGLE_SCOPES.filter((scope) => token.grantedScopes.includes(scope));
      const capabilities = GOOGLE_CAPABILITIES.filter((capability, index) => granted.includes(GOOGLE_SCOPES[index + 1]!));
      if (!token.refreshToken) throw new Error("Google reauthentication is required.");
      const capabilityFingerprint = canonicalCapabilities(capabilities);
      await runtime.credentialStore.create(binding(validation.context.canonicalAccountRef, capabilityFingerprint), token.refreshToken);
      const status = capabilities.length === GOOGLE_CAPABILITIES.length ? "connected" : capabilities.length ? "connected-partial" : "connected-empty";
      return { statusCode: 302, headers: { location: `https://onyx-alpha0.netlify.app/?google_status=${status}` }, body: "" };
    } catch (error) { return { statusCode: 302, headers: { location: "https://onyx-alpha0.netlify.app/?google_status=error-safe" }, body: "" }; }
  };
}

export function createGoogleStatusHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const records = await Promise.all(GOOGLE_CAPABILITIES.map(async (capability, index) => runtime.credentialStore.findActive?.(binding(validation.context.canonicalAccountRef, `${GOOGLE_CAPABILITIES.slice(0, index + 1).join("|")}`))));
      const connected = records.filter(Boolean).length;
      return json(200, { status: connected === 0 ? "NOT_CONNECTED" : connected === GOOGLE_CAPABILITIES.length ? "CONNECTED" : "CONNECTED_PARTIAL", capabilities: Object.fromEntries(GOOGLE_CAPABILITIES.map((capability, index) => [capability, records[index] ? "connected" : "insufficient-scope"])), freshness: "CURRENT" });
    } catch (error) { return failure(error); }
  };
}

export function createGoogleDisconnectHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      for (const capabilityCount of [1, 2, 3]) {
        const record = await runtime.credentialStore.findActive?.(binding(validation.context.canonicalAccountRef, GOOGLE_CAPABILITIES.slice(0, capabilityCount).join("|")));
        if (record) await runtime.credentialStore.delete(record.recordId, binding(validation.context.canonicalAccountRef, record.capabilityFingerprint));
      }
      return json(200, { status: "DISCONNECTED" });
    } catch (error) { return failure(error); }
  };
}

async function queryHandler(runtime: GoogleServerRuntime, event: GoogleFunctionEvent, capability: string, run: (adapter: Awaited<ReturnType<GoogleServerRuntime["createReadAdapter"]>>, body: Record<string, unknown>) => Promise<unknown>): Promise<GoogleFunctionResponse> {
  if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
  const inactive = active(runtime); if (inactive) return inactive;
  try {
    const validation = await runtime.sessionGateway.validate(sessionRequest(event), `${GOOGLE_PURPOSE}:${capability}`, capability);
    const adapter = await runtime.createReadAdapter(binding(validation.context.canonicalAccountRef, GOOGLE_CAPABILITY_FINGERPRINT));
    return json(200, { status: "CONNECTED", result: await run(adapter, parseBody(event)) });
  } catch (error) { return failure(error); }
}

export const createGoogleCalendarHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "calendar.events.read", (adapter, body) => adapter.listCalendar(body as unknown as CalendarQuery));
export const createGoogleGmailHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "mail.messages.read", (adapter, body) => adapter.listMail(body as unknown as MailQuery));
export const createGoogleDriveHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "files.metadata.read", (adapter, body) => adapter.listFiles(body as unknown as FileQuery));