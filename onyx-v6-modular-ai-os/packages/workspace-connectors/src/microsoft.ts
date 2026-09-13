import { BrowserCacheLocation, InteractionRequiredAuthError, PublicClientApplication, type AccountInfo, type Configuration } from "@azure/msal-browser";
import type { WorkspaceProviderSnapshot, WorkspaceProfile } from "@onyx/workspace-contracts";
import type { FileAccountKind } from "@onyx/workspace-contracts";
export interface MicrosoftWorkspaceConfig { clientId?: string; tenantId?: string; authority?: string; redirectUri?: string; }
export interface MicrosoftCalendarRange { start: string; end: string; timeZone: string; }
export interface MicrosoftCalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isCancelled: boolean;
  showAs?: string;
  location?: string;
  isOnlineMeeting: boolean;
}
export interface MicrosoftMailMessage {
  provider: "microsoft";
  subject: string;
  senderDisplayName: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
}
export type MicrosoftMailDiagnosticOutcome = "NOT_REQUESTED" | "REQUESTED" | "SUCCEEDED" | "EMPTY" | "FAILED";
export type MicrosoftMailDiagnosticReasonCode =
  | "MAIL_NOT_REQUESTED"
  | "MAIL_SUCCEEDED"
  | "MAIL_EMPTY"
  | "MAIL_PERMISSION_REQUIRED"
  | "MAIL_ACCOUNT_MISMATCH"
  | "MAIL_SCOPE_MISSING"
  | "MAIL_SCOPE_NOT_INSPECTABLE"
  | "MAIL_AUTHENTICATION_REQUIRED"
  | "MAIL_ACCESS_TOKEN_ABSENT"
  | "MAIL_HTTP_401"
  | "MAIL_HTTP_403"
  | "MAIL_HTTP_429"
  | "MAIL_PROVIDER_5XX"
  | "MAIL_TRANSPORT_FAILURE"
  | "MAIL_ABORTED"
  | "MAIL_MALFORMED_RESPONSE"
  | "MAIL_RETRY_SUCCEEDED";
export type MicrosoftMailScopeReport = "REPORTED_PRESENT" | "REPORTED_ABSENT" | "NOT_REPORTED";
export interface MicrosoftMailReadDiagnostic {
  outcome: MicrosoftMailDiagnosticOutcome;
  reasonCode: MicrosoftMailDiagnosticReasonCode;
  finalReasonCode: MicrosoftMailDiagnosticReasonCode;
  httpStatus?: number;
  mailScope: MicrosoftMailScopeReport;
  accountBinding: MicrosoftAccountBindingClass;
  refreshAttempted: boolean;
  retryAttempted: boolean;
  requestIdPresent?: boolean;
  clientRequestIdPresent?: boolean;
  retryAfterPresent?: boolean;
  contentTypeJson?: boolean;
  returnedMessageCount?: number;
  normalizedMessageCount?: number;
  rejectedMessageCount?: number;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  sanitizedDiagnostic?: MicrosoftSanitizedDiagnosticEnvelope;
}
export type MicrosoftMailTraceStage =
  | "IDLE" | "REFRESH_REQUESTED" | "CONNECT_REQUESTED" | "AUTH_CALLBACK_RECEIVED"
  | "ACCOUNT_SELECTED" | "TOKEN_REQUESTED" | "TOKEN_ACQUIRED" | "TOKEN_INTERACTION_REQUIRED"
  | "ACCOUNT_BINDING_EVALUATED" | "GRAPH_REQUEST_STARTED" | "GRAPH_RESPONSE_RECEIVED"
  | "GRAPH_RETRY_STARTED" | "GRAPH_RETRY_RESPONSE_RECEIVED" | "RESPONSE_PARSE_STARTED"
  | "RESPONSE_PARSED" | "ITEMS_NORMALIZED" | "CONTROLLER_RESULT_ASSIGNED"
  | "UI_PROJECTION_RECEIVED" | "COMPLETED" | "FAILED" | "ABORTED";
export type MicrosoftMailTraceStatusClass =
  | "NONE" | "INFORMATIONAL" | "SUCCESS_2XX" | "AUTHENTICATION_401" | "FORBIDDEN_403"
  | "NOT_FOUND_404" | "RATE_LIMITED_429" | "CLIENT_4XX_OTHER" | "PROVIDER_5XX"
  | "NETWORK_FAILURE" | "ABORTED" | "MALFORMED_RESPONSE" | "UNKNOWN";
export type MicrosoftMailTraceTokenStage =
  | "NOT_STARTED" | "SILENT_REQUESTED" | "SILENT_SUCCEEDED" | "INTERACTION_REQUIRED"
  | "REFRESH_REQUESTED" | "REFRESH_SUCCEEDED" | "FAILED" | "UNKNOWN";
export interface MicrosoftMailTraceBuildIdentity {
  sha: string;
  context: "production" | "preview" | "local" | "unknown";
  version: string;
}
export interface MicrosoftMailTraceAccountBindingEvidence {
  expectedHomePresent: boolean;
  returnedHomePresent: boolean;
  homeMatch: "MATCH" | "MISMATCH" | "NOT_COMPARABLE";
  expectedTenantPresent: boolean;
  returnedTenantPresent: boolean;
  tenantMatch: "MATCH" | "MISMATCH" | "NOT_COMPARABLE";
  activeAccountCountClass: "ZERO" | "ONE" | "MULTIPLE" | "UNKNOWN";
  bindingDecision: "MATCHED" | "MISMATCHED" | "UNKNOWN";
}
export type MicrosoftMailTraceResponseEnvelopeClass =
  | "NOT_RECEIVED" | "OBJECT_WITH_VALUE_ARRAY" | "OBJECT_WITHOUT_VALUE"
  | "OBJECT_WITH_NON_ARRAY_VALUE" | "NULL_VALUE" | "ARRAY_ROOT" | "PRIMITIVE_ROOT"
  | "NON_JSON" | "UNKNOWN";
export interface MicrosoftMailRuntimeTrace {
  schemaVersion: 1;
  correlationId: string;
  buildIdentity: MicrosoftMailTraceBuildIdentity;
  stage: MicrosoftMailTraceStage;
  reasonCode?: MicrosoftMailDiagnosticReasonCode;
  statusClass: MicrosoftMailTraceStatusClass;
  retryAttempted: boolean;
  tokenStage: MicrosoftMailTraceTokenStage;
  accountBindingEvidence: MicrosoftMailTraceAccountBindingEvidence;
  responseEnvelopeClass: MicrosoftMailTraceResponseEnvelopeClass;
  normalizedItemCount: number;
  rejectedItemCount: number;
  requestCompleted: boolean;
}
export interface MicrosoftMailRuntimeTraceOptions {
  diagnosticsEnabled: boolean;
  buildIdentity: MicrosoftMailTraceBuildIdentity;
  onTrace: (trace: MicrosoftMailRuntimeTrace) => void;
}
type MailTraceContext = {
  emit: (patch: Partial<MicrosoftMailRuntimeTrace>) => void;
};
export interface MicrosoftMailReadResult {
  messages: readonly MicrosoftMailMessage[];
  diagnostic: MicrosoftMailReadDiagnostic;
}
export type MicrosoftCalendarDiagnosticStage = "ADAPTER_SELECTION" | "RANGE_CONSTRUCTION" | "TOKEN_ACQUISITION" | "GRAPH_REQUEST" | "GRAPH_RESPONSE" | "RESPONSE_VALIDATION" | "NORMALIZATION";
export type MicrosoftCalendarDiagnosticOutcome = "NOT_STARTED" | "STARTED" | "SUCCEEDED" | "SUCCEEDED_EMPTY" | "FAILED" | "REJECTED";
export type MicrosoftCalendarDiagnosticReasonCode =
  | "CALENDAR_RANGE_INVALID"
  | "CALENDAR_TOKEN_ACQUISITION_FAILED"
  | "CALENDAR_GRAPH_REQUEST_STARTED"
  | "CALENDAR_GRAPH_HTTP_400"
  | "CALENDAR_GRAPH_HTTP_401"
  | "CALENDAR_GRAPH_HTTP_403"
  | "CALENDAR_GRAPH_HTTP_404"
  | "CALENDAR_GRAPH_HTTP_429"
  | "CALENDAR_GRAPH_HTTP_5XX"
  | "CALENDAR_GRAPH_NETWORK_FAILURE"
  | "CALENDAR_GRAPH_NON_JSON_RESPONSE"
  | "CALENDAR_GRAPH_INVALID_ENVELOPE"
  | "CALENDAR_GRAPH_VALUE_NOT_ARRAY"
  | "CALENDAR_GRAPH_SUCCEEDED_EMPTY"
  | "CALENDAR_GRAPH_SUCCEEDED_WITH_EVENTS"
  | "CALENDAR_NORMALIZATION_REJECTED_ALL"
  | "CALENDAR_NORMALIZATION_PARTIAL"
  | "CALENDAR_NORMALIZATION_SUCCEEDED"
  | "CALENDAR_UNKNOWN_BOUNDED_FAILURE"
  | "MICROSOFT_ACCOUNT_NOT_AVAILABLE"
  | "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH"
  | "MICROSOFT_GRAPH_SCOPES_MISSING"
  | "MICROSOFT_CALENDAR_SCOPE_ABSENT"
  | "MICROSOFT_SILENT_TOKEN_SUCCEEDED"
  | "MICROSOFT_SILENT_TOKEN_FAILED"
  | "MICROSOFT_ACCESS_TOKEN_ABSENT"
  | "MICROSOFT_ACCESS_TOKEN_EXPIRED"
  | "MICROSOFT_AUTHORIZATION_HEADER_ABSENT"
  | "MICROSOFT_GRAPH_HTTP_401_INITIAL"
  | "MICROSOFT_TOKEN_FORCE_REFRESH_STARTED"
  | "MICROSOFT_TOKEN_FORCE_REFRESH_SUCCEEDED"
  | "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED"
  | "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH"
  | "MICROSOFT_GRAPH_RETRY_SUCCEEDED"
  | "MICROSOFT_INTERACTION_REQUIRED"
  | "MICROSOFT_REAUTHENTICATION_REQUIRED"
  | "MICROSOFT_TOKEN_REQUEST_STALE_IGNORED"
  | "MICROSOFT_TOKEN_UNKNOWN_BOUNDED_FAILURE"
  | "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY"
  | "MICROSOFT_GRAPH_CALENDAR_ROOT_REJECTED"
  | "MICROSOFT_GRAPH_CALENDAR_RESOURCE_EXTERNAL_401"
  | "MICROSOFT_GRAPH_CALENDAR_CLAIMS_CHALLENGE"
  | "MICROSOFT_GRAPH_CALENDAR_PERMISSION_NOT_ACCEPTED"
  | "MICROSOFT_GRAPH_CALENDAR_PERMISSION_FORBIDDEN"
  | "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION"
  | "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER";
export type MicrosoftGraphErrorClass = "INVALID_AUTHENTICATION_TOKEN" | "TOKEN_EXPIRED" | "TOKEN_NOT_YET_VALID" | "INVALID_AUDIENCE" | "NO_PERMISSIONS_IN_ACCESS_TOKEN" | "ACCESS_DENIED" | "ERROR_ACCESS_DENIED" | "UNKNOWN_BOUNDED_GRAPH_ERROR";
export type MicrosoftTokenAudienceClass = "MICROSOFT_GRAPH_EXPECTED" | "UNEXPECTED_RESOURCE" | "NOT_INSPECTABLE";
export type MicrosoftCalendarScopeReport = "REPORTED_PRESENT" | "REPORTED_ABSENT" | "NOT_REPORTED";
export type MicrosoftAccountBindingClass = "MATCHED" | "MISMATCHED" | "UNKNOWN";
export type MicrosoftGraphWwwAuthenticateClass = "ABSENT" | "BEARER_CHALLENGE" | "CLAIMS_CHALLENGE" | "OTHER_BOUNDED";
export interface MicrosoftCalendarReadDiagnostic {
  stage: MicrosoftCalendarDiagnosticStage;
  outcome: MicrosoftCalendarDiagnosticOutcome;
  reasonCode: MicrosoftCalendarDiagnosticReasonCode;
  accountAvailable?: boolean;
  activeAccountMatched?: boolean;
  graphScopesRequested?: boolean;
  silentAttempted?: boolean;
  silentOutcome?: "SUCCEEDED" | "FAILED" | "INTERACTION_REQUIRED" | "ABSENT" | "UNKNOWN";
  credentialPresent?: boolean;
  expiryKnown?: boolean;
  expiredAtRequest?: boolean;
  nearExpiry?: boolean;
  graphResourceCompatible?: boolean;
  headerAttached?: boolean;
  initialGraphStatus?: number;
  refreshAttempted?: boolean;
  refreshOutcome?: "SUCCEEDED" | "FAILED" | "INTERACTION_REQUIRED" | "ABSENT" | "UNKNOWN";
  retryAttempted?: boolean;
  retryGraphStatus?: number;
  graphMeStatus?: number;
  graphMeEnvelopeValid?: boolean;
  graphCalendarRootStatus?: number;
  graphCalendarRootEnvelopeValid?: boolean;
  defaultCalendarStatus?: number;
  calendarsCollectionStatus?: number;
  defaultCalendarViewStatus?: number;
  directCalendarViewStatus?: number;
  eventsCollectionStatus?: number;
  graphErrorClass?: MicrosoftGraphErrorClass;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  tokenAudience?: MicrosoftTokenAudienceClass;
  calendarScope?: MicrosoftCalendarScopeReport;
  calendarRequestedScopes?: readonly string[];
  calendarReturnedScopes?: readonly string[];
  accountBinding?: MicrosoftAccountBindingClass;
  forceRefreshAttempted?: boolean;
  interactiveRecoveryRequired?: boolean;
  graphRequestIdPresent?: boolean;
  graphClientRequestIdPresent?: boolean;
  claimsChallengePresent?: boolean;
  wwwAuthenticateClass?: MicrosoftGraphWwwAuthenticateClass;
  interactionRequired?: boolean;
  finalReasonCode?: MicrosoftCalendarDiagnosticReasonCode;
  httpStatus?: number;
  returnedEventCount?: number;
  normalizedEventCount?: number;
  rejectedEventCount?: number;
  requestRangeClass?: string;
  requestRangeValid?: boolean;
  retryable?: boolean;
  sanitizedDiagnostic?: MicrosoftSanitizedDiagnosticEnvelope;
}
export interface MicrosoftCalendarReadResult {
  events: readonly MicrosoftCalendarEvent[];
  diagnostic: MicrosoftCalendarReadDiagnostic;
}
export function isSuccessfulMicrosoftCalendarDiagnostic(diagnostic: MicrosoftCalendarReadDiagnostic): boolean {
  return diagnostic.outcome === "SUCCEEDED" || diagnostic.outcome === "SUCCEEDED_EMPTY";
}
export function isFailedMicrosoftCalendarDiagnostic(diagnostic: MicrosoftCalendarReadDiagnostic): boolean {
  return diagnostic.outcome === "FAILED" || diagnostic.outcome === "REJECTED";
}
function isInteractionRequiredTokenError(error: unknown): boolean {
  if (error instanceof InteractionRequiredAuthError) return true;
  if (error && typeof error === "object") {
    const candidate = error as { errorCode?: string; message?: string; name?: string; code?: string };
    return /interaction[_ -]?required/i.test(candidate.errorCode ?? "") || /interaction[_ -]?required/i.test(candidate.message ?? "") || /interaction[_ -]?required/i.test(candidate.name ?? "") || /interaction[_ -]?required/i.test(candidate.code ?? "");
  }
  return false;
}

/**
 * Bounded, safe representation of MSAL AuthenticationResult metadata and adjudication.
 * Never includes raw tokens, refresh tokens, ID tokens, or raw claims.
 * Used internally to trace token ownership and populate diagnostics.
 * @internal
 */
export const MICROSOFT_GRAPH_APP_ID = "00000003-0000-0000-c000-000000000000";

export const MICROSOFT_CAPABILITY_SCOPES = Object.freeze({
  profile: Object.freeze(["User.Read"] as const),
  calendar: Object.freeze(["Calendars.Read"] as const),
  mail: Object.freeze(["Mail.ReadBasic"] as const),
  filesReadWrite: Object.freeze(["Files.ReadWrite"] as const),
});

export const MICROSOFT_COMBINED_WORKSPACE_SCOPES: readonly string[] = Object.freeze([
  ...MICROSOFT_CAPABILITY_SCOPES.profile,
  ...MICROSOFT_CAPABILITY_SCOPES.filesReadWrite,
  ...MICROSOFT_CAPABILITY_SCOPES.calendar,
  ...MICROSOFT_CAPABILITY_SCOPES.mail,
]);

const ACCEPTED_GRAPH_SCOPE_PREFIXES = [
  "https://graph.microsoft.com/",
  "https://graph.windows.net/",
  "http://graph.microsoft.com/",
  "http://graph.windows.net/",
] as const;

export function normalizeScope(scope: string): string {
  if (typeof scope !== "string") return "";
  let trimmed = scope.trim();
  for (const prefix of ACCEPTED_GRAPH_SCOPE_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      trimmed = trimmed.slice(prefix.length);
      break;
    }
  }
  return trimmed.toLowerCase();
}

const ACCEPTED_GRAPH_AUDIENCES = new Set([
  MICROSOFT_GRAPH_APP_ID,
  `${MICROSOFT_GRAPH_APP_ID}/`,
  "https://graph.microsoft.com",
  "https://graph.microsoft.com/",
  "https://graph.windows.net",
  "https://graph.windows.net/",
]);

function isAcceptedGraphAudience(aud: string): boolean {
  return ACCEPTED_GRAPH_AUDIENCES.has(aud.toLowerCase().trim());
}

export function inspectTokenAudience(accessToken: string | undefined): MicrosoftTokenAudienceClass {
  if (!accessToken || typeof accessToken !== "string") return "NOT_INSPECTABLE";
  const trimmed = accessToken.trim();
  if (trimmed.length < 10 || trimmed.length > 16384) return "NOT_INSPECTABLE";
  const parts = trimmed.split(".");
  if (parts.length !== 3) return "NOT_INSPECTABLE";
  try {
    const payloadBase64 = parts[1];
    if (!payloadBase64 || payloadBase64.length > 8192) return "NOT_INSPECTABLE";
    if (!/^[A-Za-z0-9_-]+$/.test(payloadBase64)) return "NOT_INSPECTABLE";

    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const jsonStr = typeof atob === "function"
      ? atob(padded)
      : typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : "";
    if (!jsonStr || jsonStr.length > 8192) return "NOT_INSPECTABLE";
    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "NOT_INSPECTABLE";

    // Strictly inspect ONLY aud
    const aud = payload.aud;
    if (typeof aud === "string" && aud.trim().length > 0) {
      return isAcceptedGraphAudience(aud) ? "MICROSOFT_GRAPH_EXPECTED" : "UNEXPECTED_RESOURCE";
    }
    if (Array.isArray(aud) && aud.length > 0) {
      const match = aud.some((item: unknown) => typeof item === "string" && isAcceptedGraphAudience(item));
      return match ? "MICROSOFT_GRAPH_EXPECTED" : "UNEXPECTED_RESOURCE";
    }
    return "NOT_INSPECTABLE";
  } catch {
    return "NOT_INSPECTABLE";
  }
}

export function scrubGraphErrorMessage(message: unknown): string | undefined {
  if (typeof message !== "string" || !message.trim()) return undefined;
  let scrubbed = message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED_TOKEN]");
  scrubbed = scrubbed.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?/g, "[REDACTED_JWT]");
  scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
  return scrubbed.slice(0, 200).trim();
}

export function scrubGraphErrorCode(code: unknown): string | undefined {
  if (typeof code !== "string" || !code.trim()) return undefined;
  const trimmed = code.trim();
  if (trimmed.length > 64) return "UNKNOWN_BOUNDED_GRAPH_ERROR";
  if (/[@\s]/.test(trimmed)) return "UNKNOWN_BOUNDED_GRAPH_ERROR";
  return /^[A-Za-z0-9._-]+$/.test(trimmed) ? trimmed : "UNKNOWN_BOUNDED_GRAPH_ERROR";
}

export interface GraphErrorDetails {
  httpStatus: number;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  graphErrorClass?: MicrosoftGraphErrorClass;
  requestId?: string;
  clientRequestId?: string;
  retryAfter?: string;
}

export async function extractGraphErrorDetails(response: Response): Promise<GraphErrorDetails> {
  const httpStatus = response.status;
  const requestId = response.headers?.get?.("x-ms-request-id") || undefined;
  const clientRequestId = response.headers?.get?.("client-request-id") || undefined;
  const retryAfter = response.headers?.get?.("retry-after") || undefined;

  let graphErrorCode: string | undefined;
  let graphErrorMessage: string | undefined;
  let graphErrorClass: MicrosoftGraphErrorClass | undefined;

  try {
    const body = typeof response.json === "function" ? (await response.json()) as { error?: { code?: unknown; message?: unknown } } : undefined;
    if (typeof body?.error?.code === "string") {
      graphErrorCode = scrubGraphErrorCode(body.error.code);
      graphErrorClass = classifyGraphErrorCode(body.error.code);
    }
    if (typeof body?.error?.message === "string") {
      graphErrorMessage = scrubGraphErrorMessage(body.error.message);
    }
  } catch {
    // Non-JSON or unparseable
  }

  return {
    httpStatus,
    graphErrorCode,
    graphErrorMessage,
    graphErrorClass,
    requestId: requestId ? requestId.slice(0, 128) : undefined,
    clientRequestId: clientRequestId ? clientRequestId.slice(0, 128) : undefined,
    retryAfter,
  };
}

export interface MicrosoftSanitizedDiagnosticEnvelope {
  capability: "MICROSOFT_MAIL" | "MICROSOFT_CALENDAR";
  operation: string;
  requestedScopes: readonly string[];
  returnedScopes?: readonly string[];
  accountBinding: MicrosoftAccountBindingClass;
  fromCache?: boolean;
  forceRefresh: boolean;
  tokenPresent: boolean;
  tokenExpiryState?: "VALID" | "EXPIRED" | "UNKNOWN";
  decodedAudience: MicrosoftTokenAudienceClass;
  sanitizedGraphEndpoint: string;
  httpStatus?: number;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  requestId?: string;
  clientRequestId?: string;
  correlationId?: string;
  retryAttempt: boolean;
  finalReasonCode: string;
}

export function createSanitizedDiagnosticEnvelope(params: {
  capability: "MICROSOFT_MAIL" | "MICROSOFT_CALENDAR";
  operation: string;
  requestedScopes: readonly string[];
  returnedScopes?: readonly string[];
  accountBinding: MicrosoftAccountBindingClass;
  fromCache?: boolean;
  forceRefresh: boolean;
  tokenPresent: boolean;
  tokenExpiryState?: "VALID" | "EXPIRED" | "UNKNOWN";
  decodedAudience: MicrosoftTokenAudienceClass;
  sanitizedGraphEndpoint: string;
  httpStatus?: number;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  requestId?: string;
  clientRequestId?: string;
  correlationId?: string;
  retryAttempt: boolean;
  finalReasonCode: string;
}): MicrosoftSanitizedDiagnosticEnvelope {
  return Object.freeze({
    capability: params.capability,
    operation: params.operation,
    requestedScopes: Object.freeze([...params.requestedScopes]),
    returnedScopes: params.returnedScopes ? Object.freeze([...params.returnedScopes]) : undefined,
    accountBinding: params.accountBinding,
    fromCache: params.fromCache,
    forceRefresh: params.forceRefresh,
    tokenPresent: params.tokenPresent,
    tokenExpiryState: params.tokenExpiryState,
    decodedAudience: params.decodedAudience,
    sanitizedGraphEndpoint: params.sanitizedGraphEndpoint,
    httpStatus: params.httpStatus,
    graphErrorCode: params.graphErrorCode,
    graphErrorMessage: params.graphErrorMessage ? scrubGraphErrorMessage(params.graphErrorMessage) : undefined,
    requestId: params.requestId,
    clientRequestId: params.clientRequestId,
    correlationId: params.correlationId,
    retryAttempt: params.retryAttempt,
    finalReasonCode: params.finalReasonCode,
  });
}

export interface BDynamicTokenAdjudication {
  accessToken: string;
  requestedScopes: readonly string[];
  returnedScopes?: readonly string[];
  accountBinding: MicrosoftAccountBindingClass;
  authorityBinding: "EXPECTED" | "UNEXPECTED" | "NOT_REPORTED";
  tenantBinding: "MATCHED" | "MISMATCHED" | "UNKNOWN";
  tokenAudience: MicrosoftTokenAudienceClass;
  calendarScope: MicrosoftCalendarScopeReport;
  tokenSource: "CACHE" | "REFRESH" | "NETWORK" | "NOT_REPORTED";
  accountHomeAccountId?: string;
  accountTenantId?: string;
  failureReason?: MicrosoftCalendarDiagnosticReasonCode;
  valid: boolean;
}

export function adjudicateTokenResult(
  activeAccount: AccountInfo | undefined,
  result: any,
  requestedScopes: readonly string[],
  expectedAuthority: string | undefined,
  mode: "INITIAL" | "FORCE_REFRESH",
): BDynamicTokenAdjudication {
  const accessToken = typeof result?.accessToken === "string" ? result.accessToken : "";
  const returnedScopes = Array.isArray(result?.scopes) ? Object.freeze([...result.scopes]) : undefined;

  // Account identity sourced ONLY from result.account
  const returnedAccount = result?.account && typeof result.account === "object" ? (result.account as AccountInfo) : undefined;
  const accountHomeAccountId = typeof returnedAccount?.homeAccountId === "string" && returnedAccount.homeAccountId.trim().length > 0
    ? returnedAccount.homeAccountId
    : undefined;
  const accountTenantId = typeof returnedAccount?.tenantId === "string" && returnedAccount.tenantId.trim().length > 0
    ? returnedAccount.tenantId
    : typeof result?.tenantId === "string" && result.tenantId.trim().length > 0
      ? result.tenantId
      : undefined;

  // Compute accountBinding by comparing activeAccount vs returnedAccount
  let accountBinding: MicrosoftAccountBindingClass = "UNKNOWN";
  if (activeAccount && returnedAccount) {
    if (activeAccount.homeAccountId && returnedAccount.homeAccountId) {
      accountBinding = activeAccount.homeAccountId === returnedAccount.homeAccountId ? "MATCHED" : "MISMATCHED";
    } else if (activeAccount.username && returnedAccount.username) {
      accountBinding = activeAccount.username === returnedAccount.username ? "MATCHED" : "MISMATCHED";
    }
  } else if (!returnedAccount) {
    accountBinding = "UNKNOWN";
  }

  // Compute tenantBinding
  let tenantBinding: "MATCHED" | "MISMATCHED" | "UNKNOWN" = "UNKNOWN";
  if (activeAccount?.tenantId && accountTenantId) {
    tenantBinding = activeAccount.tenantId === accountTenantId ? "MATCHED" : "MISMATCHED";
  }

  // Compute authorityBinding
  let authorityBinding: "EXPECTED" | "UNEXPECTED" | "NOT_REPORTED" = "NOT_REPORTED";
  if (typeof result?.authority === "string" && expectedAuthority) {
    try {
      const returnedHost = new URL(result.authority).hostname.toLowerCase();
      const expectedHost = new URL(expectedAuthority).hostname.toLowerCase();
      authorityBinding = returnedHost === expectedHost ? "EXPECTED" : "UNEXPECTED";
    } catch {
      authorityBinding = "UNEXPECTED";
    }
  }

  // Token audience: inspected from JWT payload if available
  const tokenAudience = inspectTokenAudience(accessToken);

  // Calendar scope report
  let calendarScope: MicrosoftCalendarScopeReport = "NOT_REPORTED";
  if (returnedScopes) {
    const hasCalRead = returnedScopes.some((s: string) => normalizeScope(s) === "calendars.read");
    calendarScope = hasCalRead ? "REPORTED_PRESENT" : "REPORTED_ABSENT";
  }

  // Token source
  let tokenSource: "CACHE" | "REFRESH" | "NETWORK" | "NOT_REPORTED" = "NOT_REPORTED";
  if (typeof result?.fromCache === "boolean") {
    tokenSource = result.fromCache ? "CACHE" : mode === "FORCE_REFRESH" ? "REFRESH" : "NETWORK";
  }

  // Determine fail-closed status
  let failureReason: MicrosoftCalendarDiagnosticReasonCode | undefined;
  let valid = true;

  if (!accessToken) {
    valid = false;
    failureReason = "MICROSOFT_ACCESS_TOKEN_ABSENT";
  } else if (accountBinding === "MISMATCHED") {
    valid = false;
    failureReason = "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
  } else if (accountBinding === "UNKNOWN") {
    valid = false;
    failureReason = "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
  } else if (tenantBinding === "MISMATCHED") {
    valid = false;
    failureReason = "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
  } else if (calendarScope === "REPORTED_ABSENT") {
    valid = false;
    failureReason = "MICROSOFT_GRAPH_SCOPES_MISSING";
  }

  return {
    accessToken,
    requestedScopes: Object.freeze(Array.from(requestedScopes)),
    returnedScopes,
    accountBinding,
    authorityBinding,
    tenantBinding,
    tokenAudience,
    calendarScope,
    tokenSource,
    accountHomeAccountId,
    accountTenantId,
    failureReason,
    valid,
  };
}
const profileScopes = MICROSOFT_CAPABILITY_SCOPES.profile;
const calendarScopes = MICROSOFT_CAPABILITY_SCOPES.calendar;
const mailScopes = MICROSOFT_CAPABILITY_SCOPES.mail;
const capabilities = [
  { id: "profile" as const, label: "Microsoft profile", enabled: true },
  { id: "mail" as const, label: "Outlook mail", enabled: true },
  { id: "calendar" as const, label: "Microsoft calendar", enabled: true },
  { id: "files" as const, label: "OneDrive", enabled: true },
  { id: "sharepoint" as const, label: "SharePoint", enabled: true },
];
export class MicrosoftWorkspaceConnector {
  private application?: PublicClientApplication;
  private account?: AccountInfo;
  private diagnostic = "Microsoft workspace is not configured.";
  private initialization?: Promise<WorkspaceProviderSnapshot>;
  private authority: string | undefined;
  constructor(private readonly config: MicrosoftWorkspaceConfig) {}
  get configured() { return Boolean(this.config.clientId && this.config.tenantId); }
  getFilesAccountKind(): FileAccountKind {
    const claims = this.account?.idTokenClaims as { acct?: unknown; tid?: unknown } | undefined;
    const accountType = claims?.acct === 0 || claims?.acct === "0" ? "PERSONAL_MICROSOFT_ACCOUNT" : claims?.acct === 1 || claims?.acct === "1" ? "ORGANIZATIONAL_MICROSOFT_ACCOUNT" : undefined;
    if (accountType === "PERSONAL_MICROSOFT_ACCOUNT" || claims?.tid === "consumers") return "PERSONAL_MICROSOFT_ACCOUNT";
    if (accountType === "ORGANIZATIONAL_MICROSOFT_ACCOUNT" && this.account?.tenantId && this.config.tenantId && this.account.tenantId !== this.config.tenantId && this.config.tenantId !== "common") return "GUEST_MICROSOFT_ACCOUNT";
    if (this.account?.tenantId && (accountType === "ORGANIZATIONAL_MICROSOFT_ACCOUNT" || claims?.tid)) return "ORGANIZATIONAL_MICROSOFT_ACCOUNT";
    return "UNKNOWN_MICROSOFT_ACCOUNT";
  }
  async initialize(): Promise<WorkspaceProviderSnapshot> {
    if (this.initialization) return this.initialization;
    const attempt = Promise.resolve().then(() => this.initializeOnce());
    this.initialization = attempt;
    try {
      const snapshot = await attempt;
      if (snapshot.state === "error") this.initialization = undefined;
      return snapshot;
    } catch (error) {
      this.initialization = undefined;
      throw error;
    }
  }
  private async initializeOnce(): Promise<WorkspaceProviderSnapshot> {
    if (!this.configured) return this.snapshot("unconfigured");
    const authority = this.config.authority ?? "https://login.microsoftonline.com/common";
    this.authority = authority;
    const configuration: Configuration = { auth: { clientId: this.config.clientId!, authority, redirectUri: this.config.redirectUri ?? window.location.origin }, cache: { cacheLocation: BrowserCacheLocation.SessionStorage } };
    this.application = new PublicClientApplication(configuration);
    await this.application.initialize();
    try {
      const redirect = await this.application.handleRedirectPromise();
      const accounts = this.application.getAllAccounts();
      this.account = selectMicrosoftAccount(redirect?.account, accounts);
      if (this.account) this.application.setActiveAccount(this.account);
    } catch (error) {
      this.diagnostic = error instanceof Error ? error.message : "Microsoft sign-in could not be completed.";
      return this.snapshot("error");
    }
    this.diagnostic = this.account ? "Microsoft workspace session is connected." : "Microsoft workspace is ready to connect.";
    return this.snapshot(this.account ? "connected" : "disconnected");
  }
  async connect(): Promise<void> {
    if (!this.application) { await this.initialize(); }
    if (!this.application || !this.configured) throw new Error("Microsoft workspace configuration is incomplete.");
    this.diagnostic = "Redirecting to Microsoft sign-in.";
    await this.application.loginRedirect({ scopes: [...MICROSOFT_COMBINED_WORKSPACE_SCOPES], prompt: "select_account" });
  }
  async connectMail(): Promise<void> {
    if (!this.application) await this.initialize();
    if (!this.application || !this.configured) throw new Error("Microsoft workspace configuration is incomplete.");
    this.diagnostic = "Redirecting to Microsoft Mail consent.";
    await this.application.loginRedirect({ scopes: [...profileScopes, ...mailScopes], prompt: "select_account" });
  }
  async reconnect(): Promise<void> {
    if (!this.application) await this.initialize();
    if (!this.application || !this.account) throw new Error("Microsoft workspace is not connected.");
    try {
      await this.getAccessToken([...MICROSOFT_COMBINED_WORKSPACE_SCOPES]);
    } catch (error) {
      const underlyingCause = error instanceof Error ? error.cause : undefined;
      if (isInteractionRequiredTokenError(underlyingCause) || isInteractionRequiredTokenError(error)) {
        this.diagnostic = "Redirecting to Microsoft sign-in.";
        await this.application.loginRedirect({ scopes: [...MICROSOFT_COMBINED_WORKSPACE_SCOPES], prompt: "select_account" });
        return;
      }
      throw error;
    }
  }
  async reconnectFiles(): Promise<void> {
    if (!this.application) await this.initialize();
    if (!this.application || !this.configured) throw new Error("Microsoft workspace configuration is incomplete.");
    this.diagnostic = "Redirecting to Microsoft Files consent.";
    await this.application.loginRedirect({ scopes: [...profileScopes, ...MICROSOFT_CAPABILITY_SCOPES.filesReadWrite], prompt: "select_account" });
  }
  async disconnect(): Promise<void> {
    if (!this.application || !this.account) return;
    await this.application.logoutRedirect({ account: this.account, postLogoutRedirectUri: window.location.origin });
  }
  async getAccessToken(scopes: readonly string[] | string[]): Promise<string> {
    if (!this.application || !this.account) {
      throw new Error(
        "Microsoft workspace is not connected. Connect Microsoft and try again.",
      );
    }

    const requestedScopes = Array.from(
      new Set([...profileScopes, ...scopes]),
    );

    try {
      const token = await this.application.acquireTokenSilent({
        account: this.account,
        scopes: requestedScopes,
      });

      if (!token.accessToken) {
        throw new Error(
          "Microsoft returned an empty access token. Reconnect Microsoft and try again.",
        );
      }

      this.diagnostic = "Microsoft authorization is valid.";
      return token.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        this.diagnostic = "Microsoft Calendar sign-in is required. Use Reconnect to continue.";
        throw new Error(
          "Microsoft Calendar sign-in is required. Use Reconnect to continue.",
          { cause: error },
        );
      }

      this.diagnostic =
        error instanceof Error
          ? `Microsoft authorization failed: ${error.message}`
          : "Microsoft authorization failed.";

      throw new Error(
        "Microsoft authorization failed. Reconnect Microsoft and try again.",
        { cause: error },
      );
    }
  }
  async loadProfile(): Promise<WorkspaceProfile | undefined> {
    if (!this.application || !this.account) return undefined;
    const token = await this.application.acquireTokenSilent({ account: this.account, scopes: [...profileScopes] });
    const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,id", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    if (!response.ok) throw new Error(`Microsoft Graph profile request failed (${response.status}).`);
    const value = await response.json() as { displayName: string; mail?: string; userPrincipalName?: string; id?: string };
    return { displayName: value.displayName, email: value.mail ?? value.userPrincipalName, tenantId: this.account.tenantId, accountId: value.id ?? this.account.homeAccountId };
  }
  private async acquireMailAccessToken(forceRefresh = false, trace?: MailTraceContext): Promise<{ accessToken?: string; mailScope: MicrosoftMailScopeReport; accountBinding: MicrosoftAccountBindingClass; tokenAudience: MicrosoftTokenAudienceClass; reasonCode?: MicrosoftMailDiagnosticReasonCode }> {
    const application = this.application;
    const account = this.account;
    trace?.emit({ stage: "TOKEN_REQUESTED", tokenStage: forceRefresh ? "REFRESH_REQUESTED" : "SILENT_REQUESTED" });
    if (!application || !account || typeof application.acquireTokenSilent !== "function") {
      trace?.emit({ stage: "FAILED", tokenStage: "FAILED", reasonCode: "MAIL_PERMISSION_REQUIRED" });
      return { mailScope: "NOT_REPORTED", accountBinding: "UNKNOWN", tokenAudience: "NOT_INSPECTABLE", reasonCode: "MAIL_PERMISSION_REQUIRED" };
    }
    try {
      const result = await application.acquireTokenSilent({
        account,
        scopes: [...profileScopes, ...mailScopes],
        ...(forceRefresh ? { forceRefresh: true } : {}),
      });
      const returnedAccount = result?.account;
      const accountBinding = classifyMailAccountBinding(account, returnedAccount);
      const activeAccountCountClass = typeof application.getAllAccounts === "function"
        ? application.getAllAccounts().length > 1 ? "MULTIPLE" : application.getAllAccounts().length === 1 ? "ONE" : "ZERO"
        : account ? "ONE" : "ZERO";
      trace?.emit({ stage: "ACCOUNT_BINDING_EVALUATED", accountBindingEvidence: readMailAccountBindingEvidence(account, returnedAccount, accountBinding, activeAccountCountClass) });
      const returnedScopes = Array.isArray(result?.scopes) ? result.scopes : undefined;
      const mailScope: MicrosoftMailScopeReport = !returnedScopes
        ? "NOT_REPORTED"
        : returnedScopes.some((scope: unknown) => typeof scope === "string" && normalizeScope(scope) === "mail.readbasic")
          ? "REPORTED_PRESENT"
          : "REPORTED_ABSENT";
      const tokenAudience = inspectTokenAudience(result?.accessToken);
      if (!result?.accessToken) { trace?.emit({ stage: "FAILED", tokenStage: "FAILED", reasonCode: "MAIL_ACCESS_TOKEN_ABSENT" }); return { mailScope, accountBinding, tokenAudience: "NOT_INSPECTABLE", reasonCode: "MAIL_ACCESS_TOKEN_ABSENT" }; }
      trace?.emit({ stage: "TOKEN_ACQUIRED", tokenStage: forceRefresh ? "REFRESH_SUCCEEDED" : "SILENT_SUCCEEDED" });
      if (accountBinding !== "MATCHED") { trace?.emit({ stage: "FAILED", reasonCode: "MAIL_ACCOUNT_MISMATCH" }); return { mailScope, accountBinding, tokenAudience, reasonCode: "MAIL_ACCOUNT_MISMATCH" }; }
      if (mailScope === "REPORTED_ABSENT") { trace?.emit({ stage: "FAILED", reasonCode: "MAIL_SCOPE_MISSING" }); return { mailScope, accountBinding, tokenAudience, reasonCode: "MAIL_SCOPE_MISSING" }; }
      if (mailScope === "NOT_REPORTED") { trace?.emit({ stage: "FAILED", reasonCode: "MAIL_SCOPE_NOT_INSPECTABLE" }); return { mailScope, accountBinding, tokenAudience, reasonCode: "MAIL_SCOPE_NOT_INSPECTABLE" }; }
      return { accessToken: result.accessToken, mailScope, accountBinding, tokenAudience };
    } catch (error) {
      trace?.emit({ stage: isInteractionRequiredTokenError(error) ? "TOKEN_INTERACTION_REQUIRED" : "FAILED", tokenStage: isInteractionRequiredTokenError(error) ? "INTERACTION_REQUIRED" : "FAILED", reasonCode: isInteractionRequiredTokenError(error) ? "MAIL_AUTHENTICATION_REQUIRED" : "MAIL_TRANSPORT_FAILURE" });
      return {
        mailScope: "NOT_REPORTED",
        accountBinding: "UNKNOWN",
        tokenAudience: "NOT_INSPECTABLE",
        reasonCode: isInteractionRequiredTokenError(error) ? "MAIL_AUTHENTICATION_REQUIRED" : "MAIL_TRANSPORT_FAILURE",
      };
    }
  }
  async loadMailMessagesWithDiagnostic(options?: MicrosoftMailRuntimeTraceOptions): Promise<MicrosoftMailReadResult> {
    const trace = createMailTraceContext(options);
    trace?.emit({ stage: "REFRESH_REQUESTED" });
    const initial = await this.acquireMailAccessToken(false, trace);
    const base = (reasonCode: MicrosoftMailDiagnosticReasonCode): MicrosoftMailReadDiagnostic => ({
      outcome: reasonCode === "MAIL_NOT_REQUESTED" ? "NOT_REQUESTED" : "FAILED",
      reasonCode,
      finalReasonCode: reasonCode,
      mailScope: initial.mailScope,
      accountBinding: initial.accountBinding,
      refreshAttempted: false,
      retryAttempted: false,
      sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_MAIL",
        operation: "loadMailMessages",
        requestedScopes: [...profileScopes, ...mailScopes],
        accountBinding: initial.accountBinding,
        forceRefresh: false,
        tokenPresent: Boolean(initial.accessToken),
        decodedAudience: initial.tokenAudience,
        sanitizedGraphEndpoint: "/me/messages",
        retryAttempt: false,
        finalReasonCode: reasonCode,
      }),
    });
    if (!initial.accessToken) { trace?.emit({ stage: "FAILED", reasonCode: initial.reasonCode ?? "MAIL_PERMISSION_REQUIRED" }); return { messages: [], diagnostic: base(initial.reasonCode ?? "MAIL_PERMISSION_REQUIRED") }; }

    const request = async (accessToken: string, retry = false) => {
      trace?.emit({ stage: retry ? "GRAPH_RETRY_STARTED" : "GRAPH_REQUEST_STARTED", retryAttempted: retry });
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${new URLSearchParams({ $top: "10", $select: "subject,sender,receivedDateTime,isRead,hasAttachments" })}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      trace?.emit({ stage: retry ? "GRAPH_RETRY_RESPONSE_RECEIVED" : "GRAPH_RESPONSE_RECEIVED", statusClass: mailTraceStatusClass(response.status), retryAttempted: retry });
      return response;
    };
    let response: Response;
    try {
      response = await request(initial.accessToken);
    } catch (error) {
      const reasonCode = error instanceof Error && error.name === "AbortError" ? "MAIL_ABORTED" : "MAIL_TRANSPORT_FAILURE";
      trace?.emit({ stage: error instanceof Error && error.name === "AbortError" ? "ABORTED" : "FAILED", statusClass: error instanceof Error && error.name === "AbortError" ? "ABORTED" : "NETWORK_FAILURE", reasonCode });
      return { messages: [], diagnostic: base(reasonCode) };
    }
    if (response.status === 401) {
      const refreshed = await this.acquireMailAccessToken(true, trace);
      if (!refreshed.accessToken) {
        const reasonCode = refreshed.reasonCode ?? "MAIL_HTTP_401";
        trace?.emit({ stage: "FAILED", reasonCode });
        const diag: MicrosoftMailReadDiagnostic = {
          outcome: "FAILED",
          reasonCode,
          finalReasonCode: reasonCode,
          mailScope: refreshed.mailScope,
          accountBinding: refreshed.accountBinding,
          refreshAttempted: true,
          retryAttempted: false,
          sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_MAIL",
            operation: "loadMailMessages",
            requestedScopes: [...profileScopes, ...mailScopes],
            accountBinding: refreshed.accountBinding,
            forceRefresh: true,
            tokenPresent: false,
            decodedAudience: "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/messages",
            httpStatus: 401,
            retryAttempt: false,
            finalReasonCode: reasonCode,
          }),
        };
        return { messages: [], diagnostic: diag };
      }
      try {
        response = await request(refreshed.accessToken, true);
      } catch (error) {
        const reasonCode = error instanceof Error && error.name === "AbortError" ? "MAIL_ABORTED" : "MAIL_TRANSPORT_FAILURE";
        trace?.emit({ stage: error instanceof Error && error.name === "AbortError" ? "ABORTED" : "FAILED", statusClass: error instanceof Error && error.name === "AbortError" ? "ABORTED" : "NETWORK_FAILURE", reasonCode });
        const diag: MicrosoftMailReadDiagnostic = {
          outcome: "FAILED",
          reasonCode,
          finalReasonCode: reasonCode,
          mailScope: refreshed.mailScope,
          accountBinding: refreshed.accountBinding,
          refreshAttempted: true,
          retryAttempted: true,
          sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_MAIL",
            operation: "loadMailMessages",
            requestedScopes: [...profileScopes, ...mailScopes],
            accountBinding: refreshed.accountBinding,
            forceRefresh: true,
            tokenPresent: true,
            decodedAudience: refreshed.tokenAudience,
            sanitizedGraphEndpoint: "/me/messages",
            retryAttempt: true,
            finalReasonCode: reasonCode,
          }),
        };
        return { messages: [], diagnostic: diag };
      }
      if (response.ok) return this.parseMailResponse(response, refreshed, true, refreshed.accessToken, trace);
      const diagnostic = await this.mailHttpFailure(response, refreshed, true, refreshed.accessToken);
      trace?.emit({ stage: "FAILED", statusClass: mailTraceStatusClass(response.status), reasonCode: diagnostic.reasonCode, retryAttempted: true });
      return { messages: [], diagnostic };
    }
    if (!response.ok) { const diagnostic = await this.mailHttpFailure(response, initial, false, initial.accessToken); trace?.emit({ stage: "FAILED", statusClass: mailTraceStatusClass(response.status), reasonCode: diagnostic.reasonCode }); return { messages: [], diagnostic }; }
    return this.parseMailResponse(response, initial, false, initial.accessToken, trace);
  }
  private async mailHttpFailure(response: Response, token: { mailScope: MicrosoftMailScopeReport; accountBinding: MicrosoftAccountBindingClass; tokenAudience?: MicrosoftTokenAudienceClass }, retried: boolean, accessToken?: string): Promise<MicrosoftMailReadDiagnostic> {
    const errorDetails = await extractGraphErrorDetails(response);
    const reasonCode: MicrosoftMailDiagnosticReasonCode = response.status === 401
      ? "MAIL_HTTP_401"
      : response.status === 403
        ? "MAIL_HTTP_403"
        : response.status === 429
          ? "MAIL_HTTP_429"
          : response.status >= 500
            ? "MAIL_PROVIDER_5XX"
            : "MAIL_MALFORMED_RESPONSE";

    const decodedAudience = token.tokenAudience ?? (accessToken ? inspectTokenAudience(accessToken) : "NOT_INSPECTABLE");

    return {
      outcome: "FAILED",
      reasonCode,
      finalReasonCode: reasonCode,
      httpStatus: response.status,
      mailScope: token.mailScope,
      accountBinding: token.accountBinding,
      refreshAttempted: retried,
      retryAttempted: retried,
      requestIdPresent: Boolean(errorDetails.requestId),
      clientRequestIdPresent: Boolean(errorDetails.clientRequestId),
      retryAfterPresent: Boolean(errorDetails.retryAfter),
      graphErrorCode: errorDetails.graphErrorCode,
      graphErrorMessage: errorDetails.graphErrorMessage,
      sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_MAIL",
        operation: "loadMailMessages",
        requestedScopes: [...profileScopes, ...mailScopes],
        accountBinding: token.accountBinding,
        forceRefresh: retried,
        tokenPresent: Boolean(accessToken),
        decodedAudience,
        sanitizedGraphEndpoint: "/me/messages",
        httpStatus: response.status,
        graphErrorCode: errorDetails.graphErrorCode,
        graphErrorMessage: errorDetails.graphErrorMessage,
        requestId: errorDetails.requestId,
        clientRequestId: errorDetails.clientRequestId,
        retryAttempt: retried,
        finalReasonCode: reasonCode,
      }),
    };
  }
  private async parseMailResponse(response: Response, token: { mailScope: MicrosoftMailScopeReport; accountBinding: MicrosoftAccountBindingClass; tokenAudience?: MicrosoftTokenAudienceClass }, retried: boolean, accessToken: string, trace?: MailTraceContext): Promise<MicrosoftMailReadResult> {
    trace?.emit({ stage: "RESPONSE_PARSE_STARTED" });
    const contentTypeJson = Boolean(response.headers?.get?.("content-type")?.toLowerCase().includes("json"));
    if (!contentTypeJson) {
      trace?.emit({ stage: "FAILED", statusClass: "MALFORMED_RESPONSE", responseEnvelopeClass: "NON_JSON", reasonCode: "MAIL_MALFORMED_RESPONSE" });
      const failDiag = await this.mailHttpFailure(response, token, retried, accessToken);
      return { messages: [], diagnostic: { ...failDiag, reasonCode: "MAIL_MALFORMED_RESPONSE", finalReasonCode: "MAIL_MALFORMED_RESPONSE", contentTypeJson } };
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      trace?.emit({ stage: "FAILED", statusClass: "MALFORMED_RESPONSE", responseEnvelopeClass: "NON_JSON", reasonCode: "MAIL_MALFORMED_RESPONSE" });
      const failDiag = await this.mailHttpFailure(response, token, retried, accessToken);
      return { messages: [], diagnostic: { ...failDiag, reasonCode: "MAIL_MALFORMED_RESPONSE", finalReasonCode: "MAIL_MALFORMED_RESPONSE", contentTypeJson } };
    }
    const envelopeClass = mailTraceEnvelopeClass(body);
    if (!isUnknownRecord(body) || !Array.isArray(body.value)) {
      trace?.emit({ stage: "FAILED", statusClass: "MALFORMED_RESPONSE", responseEnvelopeClass: envelopeClass, reasonCode: "MAIL_MALFORMED_RESPONSE" });
      const failDiag = await this.mailHttpFailure(response, token, retried, accessToken);
      return { messages: [], diagnostic: { ...failDiag, reasonCode: "MAIL_MALFORMED_RESPONSE", finalReasonCode: "MAIL_MALFORMED_RESPONSE", contentTypeJson } };
    }
    trace?.emit({ stage: "RESPONSE_PARSED", responseEnvelopeClass: envelopeClass });
    const messages: MicrosoftMailMessage[] = [];
    for (const value of body.value) {
      const message = normalizeMailMessage(value);
      if (message) messages.push(message);
    }
    const returnedMessageCount = body.value.length;
    const normalizedMessageCount = messages.length;
    const rejectedMessageCount = returnedMessageCount - normalizedMessageCount;
    trace?.emit({ stage: "ITEMS_NORMALIZED", responseEnvelopeClass: envelopeClass, normalizedItemCount: Math.min(normalizedMessageCount, 10), rejectedItemCount: Math.min(rejectedMessageCount, 10) });
    const reasonCode: MicrosoftMailDiagnosticReasonCode = normalizedMessageCount === 0 && returnedMessageCount > 0 ? "MAIL_MALFORMED_RESPONSE" : retried ? "MAIL_RETRY_SUCCEEDED" : returnedMessageCount === 0 ? "MAIL_EMPTY" : "MAIL_SUCCEEDED";
    trace?.emit({ stage: "COMPLETED", reasonCode, requestCompleted: true });
    const requestId = response.headers?.get?.("x-ms-request-id") ?? undefined;
    const clientRequestId = response.headers?.get?.("client-request-id") ?? undefined;
    const decodedAudience = token.tokenAudience ?? inspectTokenAudience(accessToken);
    return {
      messages: Object.freeze(messages),
      diagnostic: {
        outcome: returnedMessageCount === 0 ? "EMPTY" : normalizedMessageCount === 0 ? "FAILED" : "SUCCEEDED",
        reasonCode,
        finalReasonCode: reasonCode,
        httpStatus: response.status,
        mailScope: token.mailScope,
        accountBinding: token.accountBinding,
        refreshAttempted: retried,
        retryAttempted: retried,
        contentTypeJson,
        returnedMessageCount,
        normalizedMessageCount,
        rejectedMessageCount,
        requestIdPresent: Boolean(requestId),
        clientRequestIdPresent: Boolean(clientRequestId),
        sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
          capability: "MICROSOFT_MAIL",
          operation: "loadMailMessages",
          requestedScopes: [...profileScopes, ...mailScopes],
          accountBinding: token.accountBinding,
          forceRefresh: retried,
          tokenPresent: true,
          decodedAudience,
          sanitizedGraphEndpoint: "/me/messages",
          httpStatus: response.status,
          requestId,
          clientRequestId,
          retryAttempt: retried,
          finalReasonCode: reasonCode,
        }),
      },
    };
  }
  async loadCalendarEvents(range: MicrosoftCalendarRange): Promise<readonly MicrosoftCalendarEvent[]> {
    const result = await this.loadCalendarEventsWithDiagnostic(range);
    if (!isSuccessfulMicrosoftCalendarDiagnostic(result.diagnostic)) {
      if (result.diagnostic.reasonCode === "CALENDAR_RANGE_INVALID") throw new Error("Microsoft calendar range is invalid.");
      if (result.diagnostic.httpStatus) throw new Error(`Microsoft Graph calendar request failed (${result.diagnostic.httpStatus}).`);
      if (result.diagnostic.reasonCode === "CALENDAR_GRAPH_NETWORK_FAILURE") throw new Error("Microsoft Graph calendar request failed.");
      throw new Error(result.diagnostic.outcome === "REJECTED" ? "Microsoft Graph calendar normalization failed." : "Microsoft Graph calendar response is invalid.");
    }
    return result.events;
  }
  private hasMsalSilentRuntime(): boolean {
    return Boolean(this.application && this.account && typeof this.application.acquireTokenSilent === "function");
  }
  private async acquireCalendarAccessTokenWithMetadata(forceRefresh = false): Promise<BDynamicTokenAdjudication | undefined> {
    const application = this.application;
    const account = this.account;
    if (!application || !account || typeof application.acquireTokenSilent !== "function") return undefined;
    const requestedScopes = Array.from(new Set([...profileScopes, ...calendarScopes]));
    const result = await application.acquireTokenSilent({
      account,
      scopes: requestedScopes,
      ...(forceRefresh ? { forceRefresh: true } : {}),
    });
    return adjudicateTokenResult(
      account,
      result,
      requestedScopes,
      this.authority,
      forceRefresh ? "FORCE_REFRESH" : "INITIAL",
    );
  }
  private async acquireCalendarAccessToken(forceRefresh = false): Promise<string | undefined> {
    const result = await this.acquireCalendarAccessTokenWithMetadata(forceRefresh);
    return result?.valid ? result.accessToken : undefined;
  }
  async loadCalendarEventsWithDiagnostic(range: MicrosoftCalendarRange): Promise<MicrosoftCalendarReadResult> {
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      const diag: MicrosoftCalendarReadDiagnostic = {
        stage: "RANGE_CONSTRUCTION",
        outcome: "FAILED",
        reasonCode: "CALENDAR_RANGE_INVALID",
        requestRangeValid: false,
        sanitizedDiagnostic: createSanitizedDiagnosticEnvelope({
          capability: "MICROSOFT_CALENDAR",
          operation: "loadCalendarEvents",
          requestedScopes: [...profileScopes, ...calendarScopes],
          accountBinding: "UNKNOWN",
          forceRefresh: false,
          tokenPresent: false,
          decodedAudience: "NOT_INSPECTABLE",
          sanitizedGraphEndpoint: "/me/calendar/calendarView",
          retryAttempt: false,
          finalReasonCode: "CALENDAR_RANGE_INVALID",
        }),
      };
      return { events: [], diagnostic: diag };
    }

    const accountAvailable = Boolean(this.application && this.account);
    const baseDiagnostic: MicrosoftCalendarReadDiagnostic = {
      stage: "TOKEN_ACQUISITION" as const,
      outcome: "FAILED" as const,
      reasonCode: "MICROSOFT_ACCOUNT_NOT_AVAILABLE" as const,
      accountAvailable,
      activeAccountMatched: accountAvailable,
      graphScopesRequested: true,
      silentAttempted: false,
      credentialPresent: false,
      graphResourceCompatible: true,
      headerAttached: false,
      requestRangeValid: true,
      tokenAudience: "NOT_INSPECTABLE" as const,
      calendarScope: "NOT_REPORTED" as const,
      accountBinding: "UNKNOWN" as const,
    };

    let token: string | undefined;
    let tokenMetadata: BDynamicTokenAdjudication | undefined;
    try {
      if (this.hasMsalSilentRuntime()) {
        tokenMetadata = await this.acquireCalendarAccessTokenWithMetadata(false);
        if (!tokenMetadata || !tokenMetadata.accessToken) {
          const diag: MicrosoftCalendarReadDiagnostic = {
            ...baseDiagnostic,
            reasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT",
            finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT",
            silentAttempted: true,
            silentOutcome: "ABSENT",
            credentialPresent: false,
          };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: [...profileScopes, ...calendarScopes],
            accountBinding: "UNKNOWN",
            forceRefresh: false,
            tokenPresent: false,
            decodedAudience: "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            retryAttempt: false,
            finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT",
          });
          return { events: [], diagnostic: diag };
        }
        token = tokenMetadata.accessToken;
        baseDiagnostic.silentAttempted = true;
        baseDiagnostic.silentOutcome = "SUCCEEDED";
        baseDiagnostic.credentialPresent = true;
        baseDiagnostic.reasonCode = "MICROSOFT_SILENT_TOKEN_SUCCEEDED";
        baseDiagnostic.finalReasonCode = "MICROSOFT_SILENT_TOKEN_SUCCEEDED";
        // Populate token metadata diagnostics
        baseDiagnostic.calendarRequestedScopes = tokenMetadata.requestedScopes;
        baseDiagnostic.calendarReturnedScopes = tokenMetadata.returnedScopes;
        baseDiagnostic.tokenAudience = tokenMetadata.tokenAudience;
        baseDiagnostic.calendarScope = tokenMetadata.calendarScope;
        baseDiagnostic.accountBinding = tokenMetadata.accountBinding;

        // FINDING 1 FAIL CLOSED: Fail closed if initial token adjudication is invalid
        if (!tokenMetadata.valid) {
          const failureReason = tokenMetadata.failureReason ?? "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
          const diag: MicrosoftCalendarReadDiagnostic = {
            ...baseDiagnostic,
            outcome: "FAILED",
            reasonCode: failureReason,
            finalReasonCode: failureReason,
            headerAttached: false, // FAIL CLOSED: Never attach header or perform Graph request
          };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: tokenMetadata.requestedScopes,
            returnedScopes: tokenMetadata.returnedScopes,
            accountBinding: tokenMetadata.accountBinding,
            forceRefresh: false,
            tokenPresent: Boolean(tokenMetadata.accessToken),
            decodedAudience: tokenMetadata.tokenAudience,
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            retryAttempt: false,
            finalReasonCode: failureReason,
          });
          return {
            events: [],
            diagnostic: diag,
          };
        }
      } else {
        token = await this.getAccessToken(calendarScopes);
      }
    } catch (error) {
      if (isInteractionRequiredTokenError(error)) {
        const diag: MicrosoftCalendarReadDiagnostic = { ...baseDiagnostic, reasonCode: "MICROSOFT_INTERACTION_REQUIRED", finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED", interactionRequired: true, silentAttempted: true, silentOutcome: "INTERACTION_REQUIRED", credentialPresent: false };
        diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
          capability: "MICROSOFT_CALENDAR",
          operation: "loadCalendarEvents",
          requestedScopes: [...profileScopes, ...calendarScopes],
          accountBinding: "UNKNOWN",
          forceRefresh: false,
          tokenPresent: false,
          decodedAudience: "NOT_INSPECTABLE",
          sanitizedGraphEndpoint: "/me/calendar/calendarView",
          retryAttempt: false,
          finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED",
        });
        return { events: [], diagnostic: diag };
      }
      const reasonCode = this.hasMsalSilentRuntime() ? "MICROSOFT_SILENT_TOKEN_FAILED" : "CALENDAR_TOKEN_ACQUISITION_FAILED";
      const diag: MicrosoftCalendarReadDiagnostic = { ...baseDiagnostic, reasonCode, finalReasonCode: reasonCode, silentAttempted: true, silentOutcome: "FAILED", credentialPresent: false };
      diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_CALENDAR",
        operation: "loadCalendarEvents",
        requestedScopes: [...profileScopes, ...calendarScopes],
        accountBinding: "UNKNOWN",
        forceRefresh: false,
        tokenPresent: false,
        decodedAudience: "NOT_INSPECTABLE",
        sanitizedGraphEndpoint: "/me/calendar/calendarView",
        retryAttempt: false,
        finalReasonCode: reasonCode,
      });
      return { events: [], diagnostic: diag };
    }

    // Token passed adjudication and is attached to header
    baseDiagnostic.headerAttached = true;
    const parameters = new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $select: "id,subject,start,end,isAllDay,isCancelled,showAs,location,organizer,isOnlineMeeting,onlineMeeting,sensitivity",
      $orderby: "start/dateTime",
    });
    const endpoint = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?${parameters}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });
    } catch {
      const diag: MicrosoftCalendarReadDiagnostic = { ...baseDiagnostic, stage: "GRAPH_REQUEST", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", requestRangeValid: true, retryable: true, interactionRequired: false };
      diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_CALENDAR",
        operation: "loadCalendarEvents",
        requestedScopes: [...profileScopes, ...calendarScopes],
        accountBinding: baseDiagnostic.accountBinding ?? "UNKNOWN",
        forceRefresh: false,
        tokenPresent: true,
        decodedAudience: baseDiagnostic.tokenAudience ?? "NOT_INSPECTABLE",
        sanitizedGraphEndpoint: "/me/calendar/calendarView",
        retryAttempt: false,
        finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
      });
      return { events: [], diagnostic: diag };
    }
    if (!response.ok) {
      if (response.status === 401 && this.hasMsalSilentRuntime()) {
        const refreshBase = { ...baseDiagnostic, stage: "GRAPH_RESPONSE" as const, outcome: "FAILED" as const, reasonCode: "MICROSOFT_GRAPH_HTTP_401_INITIAL" as const, httpStatus: response.status, initialGraphStatus: response.status, finalReasonCode: "MICROSOFT_GRAPH_HTTP_401_INITIAL" as const, retryable: true, requestRangeValid: true, headerAttached: true, refreshAttempted: true, forceRefreshAttempted: true };
        let refreshedMetadata: BDynamicTokenAdjudication | undefined;
        try {
          refreshedMetadata = await this.acquireCalendarAccessTokenWithMetadata(true);
        } catch (error) {
          if (isInteractionRequiredTokenError(error)) {
            const diag: MicrosoftCalendarReadDiagnostic = { ...refreshBase, refreshOutcome: "INTERACTION_REQUIRED", interactionRequired: true, reasonCode: "MICROSOFT_INTERACTION_REQUIRED", finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED" };
            diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
              capability: "MICROSOFT_CALENDAR",
              operation: "loadCalendarEvents",
              requestedScopes: [...profileScopes, ...calendarScopes],
              accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
              forceRefresh: true,
              tokenPresent: false,
              decodedAudience: "NOT_INSPECTABLE",
              sanitizedGraphEndpoint: "/me/calendar/calendarView",
              httpStatus: 401,
              retryAttempt: false,
              finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED",
            });
            return { events: [], diagnostic: diag };
          }
          const diag: MicrosoftCalendarReadDiagnostic = { ...refreshBase, refreshOutcome: "FAILED", reasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", finalReasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", interactionRequired: false };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: [...profileScopes, ...calendarScopes],
            accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
            forceRefresh: true,
            tokenPresent: false,
            decodedAudience: "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            httpStatus: 401,
            retryAttempt: false,
            finalReasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED",
          });
          return { events: [], diagnostic: diag };
        }
        if (!refreshedMetadata || !refreshedMetadata.accessToken) {
          const diag: MicrosoftCalendarReadDiagnostic = { ...refreshBase, refreshOutcome: "ABSENT", reasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", credentialPresent: false, interactionRequired: false };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: [...profileScopes, ...calendarScopes],
            accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
            forceRefresh: true,
            tokenPresent: false,
            decodedAudience: "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            httpStatus: 401,
            retryAttempt: false,
            finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT",
          });
          return { events: [], diagnostic: diag };
        }

        // Independently update refreshed token metadata
        refreshBase.calendarReturnedScopes = refreshedMetadata.returnedScopes;
        refreshBase.calendarScope = refreshedMetadata.calendarScope;
        refreshBase.accountBinding = refreshedMetadata.accountBinding;
        refreshBase.tokenAudience = refreshedMetadata.tokenAudience;

        // FINDING 2 FAIL CLOSED: Validate refreshed token adjudication independently
        if (!refreshedMetadata.valid) {
          const failureReason = refreshedMetadata.failureReason ?? "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
          const diag: MicrosoftCalendarReadDiagnostic = {
            ...refreshBase,
            refreshOutcome: "FAILED",
            reasonCode: failureReason,
            finalReasonCode: failureReason,
            retryAttempted: false, // FAIL CLOSED: Zero retry fetch calls made
            interactionRequired: false,
          };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: refreshedMetadata.requestedScopes,
            returnedScopes: refreshedMetadata.returnedScopes,
            accountBinding: refreshedMetadata.accountBinding,
            forceRefresh: true,
            tokenPresent: Boolean(refreshedMetadata.accessToken),
            decodedAudience: refreshedMetadata.tokenAudience,
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            httpStatus: 401,
            retryAttempt: false,
            finalReasonCode: failureReason,
          });
          return {
            events: [],
            diagnostic: diag,
          };
        }

        refreshBase.refreshOutcome = "SUCCEEDED";
        const refreshedToken = refreshedMetadata.accessToken;
        try {
          const retryResponse = await fetch(endpoint, { method: "GET", headers: { Authorization: `Bearer ${refreshedToken}`, Prefer: 'outlook.timezone="UTC"' } });
          if (retryResponse.ok) {
            const parsed = await this.parseCalendarGraphResponse(retryResponse);
            const diag: MicrosoftCalendarReadDiagnostic = { ...refreshBase, ...parsed.diagnostic, stage: "GRAPH_RESPONSE", outcome: parsed.ok ? "SUCCEEDED" : parsed.diagnostic.outcome, reasonCode: parsed.ok ? "MICROSOFT_GRAPH_RETRY_SUCCEEDED" : parsed.diagnostic.reasonCode, finalReasonCode: parsed.ok ? "MICROSOFT_GRAPH_RETRY_SUCCEEDED" : parsed.diagnostic.reasonCode, refreshAttempted: true, refreshOutcome: "SUCCEEDED", retryAttempted: true, retryGraphStatus: retryResponse.status, headerAttached: true, interactionRequired: false, httpStatus: retryResponse.status, forceRefreshAttempted: true };
            diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
              capability: "MICROSOFT_CALENDAR",
              operation: "loadCalendarEvents",
              requestedScopes: [...profileScopes, ...calendarScopes],
              accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
              forceRefresh: true,
              tokenPresent: true,
              decodedAudience: refreshBase.tokenAudience ?? "NOT_INSPECTABLE",
              sanitizedGraphEndpoint: "/me/calendar/calendarView",
              httpStatus: retryResponse.status,
              retryAttempt: true,
              finalReasonCode: diag.finalReasonCode ?? "MICROSOFT_GRAPH_RETRY_SUCCEEDED",
            });
            return { events: parsed.events, diagnostic: diag };
          }
          if (retryResponse.status === 401) {
            const persistent401 = await this.diagnosePersistent401(refreshedToken, { ...refreshBase, retryAttempted: true, retryGraphStatus: retryResponse.status, reasonCode: "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH", finalReasonCode: "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH", interactionRequired: false, headerAttached: true }, range);
            persistent401.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
              capability: "MICROSOFT_CALENDAR",
              operation: "loadCalendarEvents",
              requestedScopes: [...profileScopes, ...calendarScopes],
              accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
              forceRefresh: true,
              tokenPresent: true,
              decodedAudience: refreshBase.tokenAudience ?? "NOT_INSPECTABLE",
              sanitizedGraphEndpoint: "/me/calendar/calendarView",
              httpStatus: 401,
              graphErrorCode: persistent401.graphErrorCode,
              graphErrorMessage: persistent401.graphErrorMessage,
              requestId: retryResponse.headers?.get?.("x-ms-request-id") ?? undefined,
              clientRequestId: retryResponse.headers?.get?.("client-request-id") ?? undefined,
              retryAttempt: true,
              finalReasonCode: persistent401.finalReasonCode ?? "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH",
            });
            return { events: [], diagnostic: persistent401 };
          }
          const errorDetails = await extractGraphErrorDetails(retryResponse);
          const retryReasonCode = retryResponse.status === 400 ? "CALENDAR_GRAPH_HTTP_400" : retryResponse.status === 403 ? "CALENDAR_GRAPH_HTTP_403" : retryResponse.status === 404 ? "CALENDAR_GRAPH_HTTP_404" : retryResponse.status === 429 ? "CALENDAR_GRAPH_HTTP_429" : retryResponse.status >= 500 ? "CALENDAR_GRAPH_HTTP_5XX" : "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
          const diag: MicrosoftCalendarReadDiagnostic = {
            ...refreshBase,
            retryAttempted: true,
            retryGraphStatus: retryResponse.status,
            reasonCode: retryReasonCode,
            finalReasonCode: retryReasonCode,
            interactionRequired: false,
            headerAttached: true,
            httpStatus: retryResponse.status,
            graphErrorCode: errorDetails.graphErrorCode,
            graphErrorMessage: errorDetails.graphErrorMessage,
            graphErrorClass: errorDetails.graphErrorClass,
            graphRequestIdPresent: Boolean(errorDetails.requestId),
            graphClientRequestIdPresent: Boolean(errorDetails.clientRequestId),
          };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: [...profileScopes, ...calendarScopes],
            accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
            forceRefresh: true,
            tokenPresent: true,
            decodedAudience: refreshBase.tokenAudience ?? "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            httpStatus: retryResponse.status,
            graphErrorCode: errorDetails.graphErrorCode,
            graphErrorMessage: errorDetails.graphErrorMessage,
            requestId: errorDetails.requestId,
            clientRequestId: errorDetails.clientRequestId,
            retryAttempt: true,
            finalReasonCode: retryReasonCode,
          });
          return { events: [], diagnostic: diag };
        } catch {
          const diag: MicrosoftCalendarReadDiagnostic = { ...refreshBase, retryAttempted: true, retryGraphStatus: 0, reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", interactionRequired: false };
          diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
            capability: "MICROSOFT_CALENDAR",
            operation: "loadCalendarEvents",
            requestedScopes: [...profileScopes, ...calendarScopes],
            accountBinding: refreshBase.accountBinding ?? "UNKNOWN",
            forceRefresh: true,
            tokenPresent: true,
            decodedAudience: refreshBase.tokenAudience ?? "NOT_INSPECTABLE",
            sanitizedGraphEndpoint: "/me/calendar/calendarView",
            retryAttempt: true,
            finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE",
          });
          return { events: [], diagnostic: diag };
        }
      }
      const errorDetails = await extractGraphErrorDetails(response);
      const reasonCode = response.status === 400 ? "CALENDAR_GRAPH_HTTP_400" : response.status === 401 ? "CALENDAR_GRAPH_HTTP_401" : response.status === 403 ? "CALENDAR_GRAPH_HTTP_403" : response.status === 404 ? "CALENDAR_GRAPH_HTTP_404" : response.status === 429 ? "CALENDAR_GRAPH_HTTP_429" : response.status >= 500 ? "CALENDAR_GRAPH_HTTP_5XX" : "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
      const diag: MicrosoftCalendarReadDiagnostic = {
        ...baseDiagnostic,
        stage: "GRAPH_RESPONSE",
        outcome: "FAILED",
        reasonCode,
        finalReasonCode: reasonCode,
        httpStatus: response.status,
        requestRangeValid: true,
        retryable: response.status === 429 || response.status >= 500,
        graphErrorCode: errorDetails.graphErrorCode,
        graphErrorMessage: errorDetails.graphErrorMessage,
        graphErrorClass: errorDetails.graphErrorClass,
        graphRequestIdPresent: Boolean(errorDetails.requestId),
        graphClientRequestIdPresent: Boolean(errorDetails.clientRequestId),
      };
      diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_CALENDAR",
        operation: "loadCalendarEvents",
        requestedScopes: [...profileScopes, ...calendarScopes],
        accountBinding: baseDiagnostic.accountBinding ?? "UNKNOWN",
        forceRefresh: false,
        tokenPresent: true,
        decodedAudience: baseDiagnostic.tokenAudience ?? "NOT_INSPECTABLE",
        sanitizedGraphEndpoint: "/me/calendar/calendarView",
        httpStatus: response.status,
        graphErrorCode: errorDetails.graphErrorCode,
        graphErrorMessage: errorDetails.graphErrorMessage,
        requestId: errorDetails.requestId,
        clientRequestId: errorDetails.clientRequestId,
        retryAttempt: false,
        finalReasonCode: reasonCode,
      });
      return { events: [], diagnostic: diag };
    }

    const parsed = await this.parseCalendarGraphResponse(response);
    const requestId = response.headers?.get?.("x-ms-request-id") ?? undefined;
    const clientRequestId = response.headers?.get?.("client-request-id") ?? undefined;
    if (!parsed.ok) {
      const diag: MicrosoftCalendarReadDiagnostic = { ...baseDiagnostic, ...parsed.diagnostic, finalReasonCode: parsed.diagnostic.reasonCode };
      diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
        capability: "MICROSOFT_CALENDAR",
        operation: "loadCalendarEvents",
        requestedScopes: [...profileScopes, ...calendarScopes],
        accountBinding: baseDiagnostic.accountBinding ?? "UNKNOWN",
        forceRefresh: false,
        tokenPresent: true,
        decodedAudience: baseDiagnostic.tokenAudience ?? "NOT_INSPECTABLE",
        sanitizedGraphEndpoint: "/me/calendar/calendarView",
        httpStatus: response.status,
        requestId,
        clientRequestId,
        retryAttempt: false,
        finalReasonCode: parsed.diagnostic.reasonCode,
      });
      return { events: [], diagnostic: diag };
    }

    const diag: MicrosoftCalendarReadDiagnostic = { ...baseDiagnostic, ...parsed.diagnostic, httpStatus: response.status, headerAttached: true, finalReasonCode: parsed.diagnostic.reasonCode };
    diag.sanitizedDiagnostic = createSanitizedDiagnosticEnvelope({
      capability: "MICROSOFT_CALENDAR",
      operation: "loadCalendarEvents",
      requestedScopes: [...profileScopes, ...calendarScopes],
      accountBinding: baseDiagnostic.accountBinding ?? "UNKNOWN",
      forceRefresh: false,
      tokenPresent: true,
      decodedAudience: baseDiagnostic.tokenAudience ?? "NOT_INSPECTABLE",
      sanitizedGraphEndpoint: "/me/calendar/calendarView",
      httpStatus: response.status,
      requestId,
      clientRequestId,
      retryAttempt: false,
      finalReasonCode: parsed.diagnostic.reasonCode,
    });
    return { events: parsed.events, diagnostic: diag };
  }
  private async parseCalendarGraphResponse(response: Response): Promise<{ ok: boolean; events: readonly MicrosoftCalendarEvent[]; diagnostic: MicrosoftCalendarReadDiagnostic }> {
    if (response.status === 401) {
      return { ok: false, events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode: "MICROSOFT_GRAPH_HTTP_401_INITIAL", httpStatus: 401, requestRangeValid: true } };
    }
    let body: { value?: unknown };
    try {
      const contentType = response.headers?.get?.("content-type");
      if (contentType && !contentType.toLowerCase().includes("json")) {
        return { ok: false, events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_NON_JSON_RESPONSE", httpStatus: response.status, requestRangeValid: true } };
      }
      body = await response.json() as { value?: unknown };
    } catch {
      return { ok: false, events: [], diagnostic: { stage: "RESPONSE_VALIDATION", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_INVALID_ENVELOPE", httpStatus: response.status, requestRangeValid: true } };
    }
    if (!Array.isArray(body.value)) {
      return { ok: false, events: [], diagnostic: { stage: "RESPONSE_VALIDATION", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_VALUE_NOT_ARRAY", httpStatus: response.status, requestRangeValid: true } };
    }

    const normalized: MicrosoftCalendarEvent[] = [];
    for (const value of body.value) {
      try { normalized.push(normalizeCalendarEvent(value)); } catch { /* bounded rejection count only */ }
    }
    const returnedEventCount = body.value.length;
    const normalizedEventCount = normalized.length;
    const rejectedEventCount = returnedEventCount - normalizedEventCount;
    const diagnostic = normalizedEventCount === 0 && returnedEventCount > 0
      ? { stage: "NORMALIZATION" as const, outcome: "REJECTED" as const, reasonCode: "CALENDAR_NORMALIZATION_REJECTED_ALL" as const }
      : rejectedEventCount > 0
        ? { stage: "NORMALIZATION" as const, outcome: "SUCCEEDED" as const, reasonCode: "CALENDAR_NORMALIZATION_PARTIAL" as const }
        : normalizedEventCount === 0
          ? { stage: "GRAPH_RESPONSE" as const, outcome: "SUCCEEDED_EMPTY" as const, reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY" as const }
          : { stage: "NORMALIZATION" as const, outcome: "SUCCEEDED" as const, reasonCode: "CALENDAR_NORMALIZATION_SUCCEEDED" as const };
    const requestId = response.headers?.get?.("x-ms-request-id") ?? undefined;
    const clientRequestId = response.headers?.get?.("client-request-id") ?? undefined;
    return {
      ok: true,
      events: Object.freeze(normalized),
      diagnostic: {
        ...diagnostic,
        httpStatus: response.status,
        returnedEventCount,
        normalizedEventCount,
        rejectedEventCount,
        requestRangeValid: true,
        headerAttached: true,
        finalReasonCode: diagnostic.reasonCode,
        graphRequestIdPresent: Boolean(requestId),
        graphClientRequestIdPresent: Boolean(clientRequestId),
      },
    };
  }
  private async probeGraphEndpoint(token: string, path: string): Promise<GraphProbePartial> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const requestId = response.headers?.get?.("x-ms-request-id") || undefined;
      const clientRequestId = response.headers?.get?.("client-request-id") || undefined;
      const wwwAuthenticate = response.headers?.get?.("www-authenticate") ?? "";
      const claimsChallengePresent = /claims/i.test(wwwAuthenticate);
      let envelopeValid = false;
      let errorClass: MicrosoftGraphErrorClass | undefined;
      let graphErrorCode: string | undefined;
      let graphErrorMessage: string | undefined;
      try {
        const body = typeof response.json === "function" ? (await response.json()) as { value?: unknown; id?: unknown; error?: { code?: unknown; message?: unknown } } : undefined;
        if (body && typeof body === "object") {
          envelopeValid = response.ok ? typeof body.id === "string" && body.id.trim().length > 0 : Boolean(body.error && typeof body.error.code === "string");
          if (typeof body.error?.code === "string") {
            errorClass = classifyGraphErrorCode(body.error.code);
            graphErrorCode = errorClass !== "UNKNOWN_BOUNDED_GRAPH_ERROR" ? errorClass : undefined;
          }
          if (typeof body.error?.message === "string") {
            graphErrorMessage = scrubGraphErrorMessage(body.error.message);
          }
        }
      } catch {
        envelopeValid = false;
      }
      return {
        status: response.status,
        envelopeValid,
        errorClass,
        graphErrorCode,
        graphErrorMessage,
        requestId,
        clientRequestId,
        requestIdPresent: Boolean(requestId),
        clientRequestIdPresent: Boolean(clientRequestId),
        claimsChallengePresent,
        wwwAuthenticateClass: classifyWwwAuthenticateHeader(wwwAuthenticate),
      };
    } catch {
      return { envelopeValid: false, requestIdPresent: false, clientRequestIdPresent: false, claimsChallengePresent: false, wwwAuthenticateClass: "ABSENT" };
    }
  }
  private buildCalendarRangeParams(range: MicrosoftCalendarRange): string {
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return "";
    return new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $select: "id,subject,start,end,isAllDay,isCancelled,showAs,location,isOnlineMeeting",
    }).toString();
  }
  private async executeCalendarEndpointMatrix(token: string, range: MicrosoftCalendarRange): Promise<{ defaultCalendarStatus?: number; calendarsCollectionStatus?: number; defaultCalendarViewStatus?: number; directCalendarViewStatus?: number; eventsCollectionStatus?: number; requestIdPresent: boolean; clientRequestIdPresent: boolean; claimsChallengePresent: boolean; graphErrorClass?: MicrosoftGraphErrorClass; graphErrorCode?: string; graphErrorMessage?: string; requestId?: string; clientRequestId?: string; wwwAuthenticateClass: MicrosoftGraphWwwAuthenticateClass }> {
    const rangeParams = this.buildCalendarRangeParams(range);
    const defaultCalendar = await this.probeGraphEndpoint(token, "me/calendar?$select=id");
    const calendarsCollection = await this.probeGraphEndpoint(token, "me/calendars?$select=id");
    const defaultCalendarView = rangeParams ? await this.probeGraphEndpoint(token, `me/calendar/calendarView?${rangeParams}`) : undefined;
    const directCalendarView = rangeParams ? await this.probeGraphEndpoint(token, `me/calendarView?${rangeParams}`) : undefined;
    const eventsCollection = rangeParams ? await this.probeGraphEndpoint(token, `me/events?$select=id&$top=1`) : undefined;

    const aggregated = aggregateMatrixProbes([
      defaultCalendar,
      calendarsCollection,
      defaultCalendarView,
      directCalendarView,
      eventsCollection,
    ]);

    return {
      defaultCalendarStatus: defaultCalendar.status,
      calendarsCollectionStatus: calendarsCollection.status,
      defaultCalendarViewStatus: defaultCalendarView?.status,
      directCalendarViewStatus: directCalendarView?.status,
      eventsCollectionStatus: eventsCollection?.status,
      ...aggregated,
    };
  }
  private async diagnosePersistent401(token: string, base: MicrosoftCalendarReadDiagnostic, range: MicrosoftCalendarRange): Promise<MicrosoftCalendarReadDiagnostic> {
    const me = await this.probeGraphEndpoint(token, "me?$select=id");
    if (me.status === 401) {
      return {
        ...base,
        graphMeStatus: me.status,
        graphMeEnvelopeValid: me.envelopeValid,
        graphRequestIdPresent: me.requestIdPresent,
        graphClientRequestIdPresent: me.clientRequestIdPresent,
        claimsChallengePresent: me.claimsChallengePresent,
        wwwAuthenticateClass: me.wwwAuthenticateClass,
        graphErrorClass: me.errorClass,
        graphErrorCode: me.graphErrorCode,
        graphErrorMessage: me.graphErrorMessage,
        reasonCode: "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY",
        finalReasonCode: "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY",
      };
    }
    if (me.status !== 200 || !me.envelopeValid) {
      return {
        ...base,
        graphMeStatus: me.status,
        graphMeEnvelopeValid: me.envelopeValid,
        graphRequestIdPresent: me.requestIdPresent,
        graphClientRequestIdPresent: me.clientRequestIdPresent,
        claimsChallengePresent: me.claimsChallengePresent,
        wwwAuthenticateClass: me.wwwAuthenticateClass,
        graphErrorClass: me.errorClass,
        graphErrorCode: me.graphErrorCode,
        graphErrorMessage: me.graphErrorMessage,
        reasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER",
        finalReasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER",
      };
    }

    const calendar = await this.probeGraphEndpoint(token, "me/calendar?$select=id");
    const diagnostic = {
      ...base,
      graphRequestIdPresent: me.requestIdPresent || calendar.requestIdPresent,
      graphClientRequestIdPresent: me.clientRequestIdPresent || calendar.clientRequestIdPresent,
      claimsChallengePresent: me.claimsChallengePresent || calendar.claimsChallengePresent,
      wwwAuthenticateClass: calendar.wwwAuthenticateClass !== "ABSENT" ? calendar.wwwAuthenticateClass : me.wwwAuthenticateClass,
      graphMeStatus: me.status,
      graphMeEnvelopeValid: me.envelopeValid,
      graphCalendarRootStatus: calendar.status,
      graphCalendarRootEnvelopeValid: calendar.envelopeValid,
      graphErrorClass: calendar.errorClass ?? me.errorClass,
      graphErrorCode: calendar.graphErrorCode ?? me.graphErrorCode,
      graphErrorMessage: calendar.graphErrorMessage ?? me.graphErrorMessage,
    };

    if (calendar.status === 401) {
      const matrix = await this.executeCalendarEndpointMatrix(token, range);
      const aggregated = aggregateMatrixProbes([
        me,
        calendar,
        {
          status: undefined,
          envelopeValid: false,
          errorClass: matrix.graphErrorClass,
          graphErrorCode: matrix.graphErrorCode,
          graphErrorMessage: matrix.graphErrorMessage,
          requestId: matrix.requestId,
          clientRequestId: matrix.clientRequestId,
          requestIdPresent: matrix.requestIdPresent,
          clientRequestIdPresent: matrix.clientRequestIdPresent,
          claimsChallengePresent: matrix.claimsChallengePresent,
          wwwAuthenticateClass: matrix.wwwAuthenticateClass,
        },
      ]);

      const calendarDiagnostic = {
        ...diagnostic,
        defaultCalendarStatus: matrix.defaultCalendarStatus,
        calendarsCollectionStatus: matrix.calendarsCollectionStatus,
        defaultCalendarViewStatus: matrix.defaultCalendarViewStatus,
        directCalendarViewStatus: matrix.directCalendarViewStatus,
        eventsCollectionStatus: matrix.eventsCollectionStatus,
        graphRequestIdPresent: aggregated.requestIdPresent,
        graphClientRequestIdPresent: aggregated.clientRequestIdPresent,
        claimsChallengePresent: aggregated.claimsChallengePresent,
        wwwAuthenticateClass: aggregated.wwwAuthenticateClass,
        graphErrorClass: aggregated.graphErrorClass,
        graphErrorCode: aggregated.graphErrorCode ?? diagnostic.graphErrorCode,
        graphErrorMessage: aggregated.graphErrorMessage ?? diagnostic.graphErrorMessage,
      };

      const allCalendarEndpointsRejected = [matrix.defaultCalendarStatus, matrix.calendarsCollectionStatus, matrix.defaultCalendarViewStatus, matrix.directCalendarViewStatus, matrix.eventsCollectionStatus].every((status) => status === 401 || typeof status === "undefined");
      if (calendarDiagnostic.claimsChallengePresent) return { ...calendarDiagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_CLAIMS_CHALLENGE", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_CLAIMS_CHALLENGE" };
      if (calendarDiagnostic.graphErrorClass === "NO_PERMISSIONS_IN_ACCESS_TOKEN") return { ...calendarDiagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_PERMISSION_NOT_ACCEPTED", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_PERMISSION_NOT_ACCEPTED" };
      const additionalEndpointEvidence = [matrix.calendarsCollectionStatus, matrix.defaultCalendarViewStatus, matrix.directCalendarViewStatus, matrix.eventsCollectionStatus].filter((status) => typeof status === "number").length > 0;
      if (allCalendarEndpointsRejected && additionalEndpointEvidence) return { ...calendarDiagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_RESOURCE_EXTERNAL_401", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_RESOURCE_EXTERNAL_401" };
      return { ...calendarDiagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_ROOT_REJECTED", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_ROOT_REJECTED" };
    }
    if (calendar.status === 403) return { ...diagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_PERMISSION_FORBIDDEN", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_PERMISSION_FORBIDDEN" };
    if (calendar.status !== 200 || !calendar.envelopeValid) return { ...diagnostic, reasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER", finalReasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER" };
    return { ...diagnostic, reasonCode: "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION", finalReasonCode: "MICROSOFT_GRAPH_CALENDAR_VIEW_SPECIFIC_REJECTION" };
  }
  snapshot(state?: WorkspaceProviderSnapshot["state"], profile?: WorkspaceProfile): WorkspaceProviderSnapshot {
    return { provider: "microsoft", label: "Microsoft 365", state: state ?? (this.account ? "connected" : this.configured ? "disconnected" : "unconfigured"), profile, capabilities, diagnostic: this.diagnostic };
  }
}

export function selectMicrosoftAccount(
  redirectAccount: AccountInfo | undefined,
  cachedAccounts: AccountInfo[],
): AccountInfo | undefined {
  if (redirectAccount) return redirectAccount;
  if (cachedAccounts.length === 0) return undefined;
  if (cachedAccounts.length > 1) {
    throw new Error("Multiple Microsoft accounts are cached; select an account before continuing.");
  }
  return cachedAccounts[0];
}

function normalizeMailMessage(value: unknown): MicrosoftMailMessage | undefined {
  try {
    if (!isUnknownRecord(value)) return undefined;
    const receivedAt = readGraphString(value.receivedDateTime);
    const parsedReceivedAt = new Date(receivedAt);
    const sender = value.sender;
    if (!receivedAt || Number.isNaN(parsedReceivedAt.getTime()) || !isUnknownRecord(sender) || !isUnknownRecord(sender.emailAddress)) return undefined;
    const senderDisplayName = boundedGraphString(sender.emailAddress.name, 120);
    if (!senderDisplayName) return undefined;
    return Object.freeze({
      provider: "microsoft",
      subject: boundedGraphString(value.subject, 160),
      senderDisplayName,
      receivedAt: parsedReceivedAt.toISOString(),
      isRead: value.isRead === true,
      hasAttachments: value.hasAttachments === true,
    });
  } catch {
    return undefined;
  }
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function classifyMailAccountBinding(expectedAccount: AccountInfo | undefined, returnedAccount: unknown): MicrosoftAccountBindingClass {
  if (!expectedAccount || !isUnknownRecord(returnedAccount)) return "UNKNOWN";
  const expectedHomeAccountId = readGraphString(expectedAccount.homeAccountId);
  const returnedHomeAccountId = readGraphString(returnedAccount.homeAccountId);
  const expectedTenantId = readGraphString(expectedAccount.tenantId);
  const returnedTenantId = readGraphString(returnedAccount.tenantId);
  if (!expectedHomeAccountId || !returnedHomeAccountId) return "UNKNOWN";
  if (expectedHomeAccountId !== returnedHomeAccountId) return "MISMATCHED";
  if (expectedTenantId && returnedTenantId && expectedTenantId !== returnedTenantId) return "MISMATCHED";
  return "MATCHED";
}

function createMailTraceContext(options?: MicrosoftMailRuntimeTraceOptions): MailTraceContext | undefined {
  if (!options?.diagnosticsEnabled) return undefined;
  let current: MicrosoftMailRuntimeTrace = Object.freeze({ schemaVersion: 1, correlationId: createMailCorrelationId(), buildIdentity: sanitizeMailBuildIdentity(options.buildIdentity), stage: "IDLE", statusClass: "NONE", retryAttempted: false, tokenStage: "NOT_STARTED", accountBindingEvidence: emptyMailBindingEvidence(), responseEnvelopeClass: "NOT_RECEIVED", normalizedItemCount: 0, rejectedItemCount: 0, requestCompleted: false });
  return { emit: (patch) => { current = Object.freeze({ ...current, ...patch, normalizedItemCount: Math.max(0, Math.min(10, patch.normalizedItemCount ?? current.normalizedItemCount)), rejectedItemCount: Math.max(0, Math.min(10, patch.rejectedItemCount ?? current.rejectedItemCount)) }); try { options.onTrace(current); } catch {} } };
}

function createMailCorrelationId(): string {
  try { if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().slice(0, 36); } catch {}
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.slice(0, 64);
}

function sanitizeMailBuildIdentity(identity: MicrosoftMailTraceBuildIdentity): MicrosoftMailTraceBuildIdentity {
  const safe = (value: string) => /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value : "UNKNOWN";
  return Object.freeze({ sha: safe(identity.sha), context: identity.context, version: safe(identity.version) });
}

function emptyMailBindingEvidence(): MicrosoftMailTraceAccountBindingEvidence {
  return Object.freeze({ expectedHomePresent: false, returnedHomePresent: false, homeMatch: "NOT_COMPARABLE", expectedTenantPresent: false, returnedTenantPresent: false, tenantMatch: "NOT_COMPARABLE", activeAccountCountClass: "UNKNOWN", bindingDecision: "UNKNOWN" });
}

function readMailAccountBindingEvidence(expectedAccount: AccountInfo | undefined, returnedAccount: unknown, decision: MicrosoftAccountBindingClass, activeAccountCountClass: MicrosoftMailTraceAccountBindingEvidence["activeAccountCountClass"] = "UNKNOWN"): MicrosoftMailTraceAccountBindingEvidence {
  const expectedHomePresent = Boolean(readGraphString(expectedAccount?.homeAccountId));
  const returnedHomePresent = Boolean(isUnknownRecord(returnedAccount) && readGraphString(returnedAccount.homeAccountId));
  const expectedTenantPresent = Boolean(readGraphString(expectedAccount?.tenantId));
  const returnedTenantPresent = Boolean(isUnknownRecord(returnedAccount) && readGraphString(returnedAccount.tenantId));
  const expectedHome = readGraphString(expectedAccount?.homeAccountId);
  const returnedHome = isUnknownRecord(returnedAccount) ? readGraphString(returnedAccount.homeAccountId) : "";
  const expectedTenant = readGraphString(expectedAccount?.tenantId);
  const returnedTenant = isUnknownRecord(returnedAccount) ? readGraphString(returnedAccount.tenantId) : "";
  return Object.freeze({ expectedHomePresent, returnedHomePresent, homeMatch: expectedHome && returnedHome ? (expectedHome === returnedHome ? "MATCH" : "MISMATCH") : "NOT_COMPARABLE", expectedTenantPresent, returnedTenantPresent, tenantMatch: expectedTenant && returnedTenant ? (expectedTenant === returnedTenant ? "MATCH" : "MISMATCH") : "NOT_COMPARABLE", activeAccountCountClass, bindingDecision: decision });
}

function mailTraceStatusClass(status: number): MicrosoftMailTraceStatusClass {
  if (status >= 200 && status < 300) return "SUCCESS_2XX";
  if (status === 401) return "AUTHENTICATION_401";
  if (status === 403) return "FORBIDDEN_403";
  if (status === 404) return "NOT_FOUND_404";
  if (status === 429) return "RATE_LIMITED_429";
  if (status >= 500) return "PROVIDER_5XX";
  if (status >= 400) return "CLIENT_4XX_OTHER";
  if (status >= 100) return "INFORMATIONAL";
  return "UNKNOWN";
}

function mailTraceEnvelopeClass(value: unknown): MicrosoftMailTraceResponseEnvelopeClass {
  if (value === null) return "NULL_VALUE";
  if (Array.isArray(value)) return "ARRAY_ROOT";
  if (!isUnknownRecord(value)) return "PRIMITIVE_ROOT";
  if (!("value" in value)) return "OBJECT_WITHOUT_VALUE";
  return Array.isArray(value.value) ? "OBJECT_WITH_VALUE_ARRAY" : "OBJECT_WITH_NON_ARRAY_VALUE";
}

function boundedGraphString(value: unknown, maximumLength: number): string {
  return readGraphString(value).replace(/[\r\n\t]+/g, " ").slice(0, maximumLength);
}

function normalizeCalendarEvent(value: unknown): MicrosoftCalendarEvent {
  const event = value as Record<string, unknown>;
  const start = normalizeGraphDateTime(event.start);
  const end = normalizeGraphDateTime(event.end);
  if (!readGraphString(event.id) || !start || !end) {
    throw new Error("Microsoft Graph calendar event is invalid.");
  }

  const location = readGraphString((event.location as Record<string, unknown> | undefined)?.displayName);
  const normalized: MicrosoftCalendarEvent = {
    id: readGraphString(event.id),
    subject: /^(private|confidential)$/i.test(readGraphString(event.sensitivity))
      ? "Private event"
      : readGraphString(event.subject) || "Untitled event",
    start,
    end,
    isAllDay: event.isAllDay === true,
    isCancelled: event.isCancelled === true,
    isOnlineMeeting: event.isOnlineMeeting === true,
  };
  const showAs = readGraphString(event.showAs);
  if (showAs) normalized.showAs = showAs;
  if (location) normalized.location = location;
  return Object.freeze(normalized);
}

function normalizeGraphDateTime(value: unknown): string {
  const dateTimeTimeZone = value as Record<string, unknown> | undefined;
  const dateTime = readGraphString(dateTimeTimeZone?.dateTime);
  if (!dateTime) return "";
  const timeZone = readGraphString(dateTimeTimeZone?.timeZone);
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(dateTime)
    ? dateTime
    : timeZone === "UTC"
      ? `${dateTime}Z`
      : "";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function readGraphString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function classifyGraphErrorCode(code: string): MicrosoftGraphErrorClass {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  switch (normalized) {
    case "INVALIDAUTHENTICATIONTOKEN": return "INVALID_AUTHENTICATION_TOKEN";
    case "TOKENEXPIRED": return "TOKEN_EXPIRED";
    case "TOKENNOTYETVALID": return "TOKEN_NOT_YET_VALID";
    case "INVALIDAUDIENCE": return "INVALID_AUDIENCE";
    case "NOPERMISSIONSINACCESSTOKEN": return "NO_PERMISSIONS_IN_ACCESS_TOKEN";
    case "ACCESSDENIED": return "ACCESS_DENIED";
    case "ERRORACCESSDENIED": return "ERROR_ACCESS_DENIED";
    default: return "UNKNOWN_BOUNDED_GRAPH_ERROR";
  }
}

function classifyWwwAuthenticateHeader(headerValue: string): MicrosoftGraphWwwAuthenticateClass {
  const normalized = (headerValue ?? "").trim();
  if (!normalized) return "ABSENT";
  const upper = normalized.toUpperCase();
  if (upper.includes("CLAIMS")) return "CLAIMS_CHALLENGE";
  if (upper.startsWith("BEARER")) return "BEARER_CHALLENGE";
  return "OTHER_BOUNDED";
}

interface GraphProbePartial {
  status?: number;
  envelopeValid?: boolean;
  errorClass?: MicrosoftGraphErrorClass;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  requestId?: string;
  clientRequestId?: string;
  requestIdPresent?: boolean;
  clientRequestIdPresent?: boolean;
  claimsChallengePresent?: boolean;
  wwwAuthenticateClass?: MicrosoftGraphWwwAuthenticateClass;
}

const ERROR_CLASS_PRECEDENCE: Record<MicrosoftGraphErrorClass, number> = {
  NO_PERMISSIONS_IN_ACCESS_TOKEN: 1,
  INVALID_AUDIENCE: 2,
  ACCESS_DENIED: 3,
  ERROR_ACCESS_DENIED: 4,
  INVALID_AUTHENTICATION_TOKEN: 5,
  TOKEN_EXPIRED: 6,
  TOKEN_NOT_YET_VALID: 7,
  UNKNOWN_BOUNDED_GRAPH_ERROR: 8,
};

function aggregateMatrixProbes(probes: Array<GraphProbePartial | undefined>): {
  requestIdPresent: boolean;
  clientRequestIdPresent: boolean;
  claimsChallengePresent: boolean;
  wwwAuthenticateClass: MicrosoftGraphWwwAuthenticateClass;
  graphErrorClass?: MicrosoftGraphErrorClass;
  graphErrorCode?: string;
  graphErrorMessage?: string;
  requestId?: string;
  clientRequestId?: string;
} {
  const activeProbes = probes.filter((p): p is GraphProbePartial => Boolean(p));

  const requestId = activeProbes.find((p) => Boolean(p.requestId))?.requestId;
  const clientRequestId = activeProbes.find((p) => Boolean(p.clientRequestId))?.clientRequestId;
  const requestIdPresent = activeProbes.some((p) => Boolean(p.requestIdPresent));
  const clientRequestIdPresent = activeProbes.some((p) => Boolean(p.clientRequestIdPresent));
  const claimsChallengePresent = activeProbes.some((p) => Boolean(p.claimsChallengePresent));

  let wwwAuthenticateClass: MicrosoftGraphWwwAuthenticateClass = "ABSENT";
  if (activeProbes.some((p) => p.wwwAuthenticateClass === "CLAIMS_CHALLENGE" || p.claimsChallengePresent)) {
    wwwAuthenticateClass = "CLAIMS_CHALLENGE";
  } else if (activeProbes.some((p) => p.wwwAuthenticateClass === "BEARER_CHALLENGE")) {
    wwwAuthenticateClass = "BEARER_CHALLENGE";
  } else if (activeProbes.some((p) => p.wwwAuthenticateClass === "OTHER_BOUNDED")) {
    wwwAuthenticateClass = "OTHER_BOUNDED";
  }

  let graphErrorClass: MicrosoftGraphErrorClass | undefined;
  let graphErrorCode: string | undefined;
  let graphErrorMessage: string | undefined;
  for (const p of activeProbes) {
    if (!p.errorClass) continue;
    if (!graphErrorClass) {
      graphErrorClass = p.errorClass;
      graphErrorCode = p.graphErrorCode;
      graphErrorMessage = p.graphErrorMessage;
    } else {
      const currentRank = ERROR_CLASS_PRECEDENCE[graphErrorClass] ?? 99;
      const newRank = ERROR_CLASS_PRECEDENCE[p.errorClass] ?? 99;
      if (newRank < currentRank) {
        graphErrorClass = p.errorClass;
        graphErrorCode = p.graphErrorCode;
        graphErrorMessage = p.graphErrorMessage;
      }
    }
  }

  return {
    requestIdPresent,
    clientRequestIdPresent,
    claimsChallengePresent,
    wwwAuthenticateClass,
    graphErrorClass,
    graphErrorCode,
    graphErrorMessage,
    requestId,
    clientRequestId,
  };
}
