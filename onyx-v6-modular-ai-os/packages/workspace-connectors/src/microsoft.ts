import { BrowserCacheLocation, InteractionRequiredAuthError, PublicClientApplication, type AccountInfo, type Configuration } from "@azure/msal-browser";
import type { WorkspaceProviderSnapshot, WorkspaceProfile } from "@onyx/workspace-contracts";
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
  | "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
export interface MicrosoftCalendarReadDiagnostic {
  stage: MicrosoftCalendarDiagnosticStage;
  outcome: MicrosoftCalendarDiagnosticOutcome;
  reasonCode: MicrosoftCalendarDiagnosticReasonCode;
  httpStatus?: number;
  returnedEventCount?: number;
  normalizedEventCount?: number;
  rejectedEventCount?: number;
  requestRangeClass?: string;
  requestRangeValid?: boolean;
  retryable?: boolean;
}
export interface MicrosoftCalendarReadResult {
  events: readonly MicrosoftCalendarEvent[];
  diagnostic: MicrosoftCalendarReadDiagnostic;
}
const profileScopes = ["User.Read"];
const calendarScopes = ["Calendars.Read"];
const workspaceScopes = [...profileScopes, ...calendarScopes];
const capabilities = [
  { id: "profile" as const, label: "Microsoft profile", enabled: true },
  { id: "mail" as const, label: "Outlook mail", enabled: false, plannedRelease: "Alpha 3.1.2" },
  { id: "calendar" as const, label: "Microsoft calendar", enabled: true },
  { id: "files" as const, label: "OneDrive", enabled: false, plannedRelease: "Alpha 3.1.3" },
  { id: "sharepoint" as const, label: "SharePoint", enabled: false, plannedRelease: "Alpha 3.1.3" },
];
export class MicrosoftWorkspaceConnector {
  private application?: PublicClientApplication;
  private account?: AccountInfo;
  private diagnostic = "Microsoft workspace is not configured.";
  private initialization?: Promise<WorkspaceProviderSnapshot>;
  constructor(private readonly config: MicrosoftWorkspaceConfig) {}
  get configured() { return Boolean(this.config.clientId && this.config.tenantId); }
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
    await this.application.loginRedirect({ scopes: workspaceScopes, prompt: "select_account" });
  }
  async reconnect(): Promise<void> {
    if (!this.application) await this.initialize();
    if (!this.application || !this.account) throw new Error("Microsoft workspace is not connected.");
    await this.getAccessToken(calendarScopes);
  }
  async disconnect(): Promise<void> {
    if (!this.application || !this.account) return;
    await this.application.logoutRedirect({ account: this.account, postLogoutRedirectUri: window.location.origin });
  }
  async getAccessToken(scopes: string[]): Promise<string> {
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
        this.diagnostic =
          "Additional Microsoft Calendar consent or sign-in is required.";

        await this.application.acquireTokenRedirect({
          account: this.account,
          scopes: requestedScopes,
          redirectStartPage: window.location.href,
        });

        throw new Error(
          "Microsoft Calendar consent is required. Complete Microsoft sign-in and retry.",
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
    const token = await this.application.acquireTokenSilent({ account: this.account, scopes: profileScopes });
    const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,id", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    if (!response.ok) throw new Error(`Microsoft Graph profile request failed (${response.status}).`);
    const value = await response.json() as { displayName: string; mail?: string; userPrincipalName?: string; id?: string };
    return { displayName: value.displayName, email: value.mail ?? value.userPrincipalName, tenantId: this.account.tenantId, accountId: value.id ?? this.account.homeAccountId };
  }
  async loadCalendarEvents(range: MicrosoftCalendarRange): Promise<readonly MicrosoftCalendarEvent[]> {
    const result = await this.loadCalendarEventsWithDiagnostic(range);
    if (result.diagnostic.outcome === "FAILED") {
      if (result.diagnostic.reasonCode === "CALENDAR_RANGE_INVALID") throw new Error("Microsoft calendar range is invalid.");
      if (result.diagnostic.httpStatus) throw new Error(`Microsoft Graph calendar request failed (${result.diagnostic.httpStatus}).`);
      if (result.diagnostic.reasonCode === "CALENDAR_GRAPH_NETWORK_FAILURE") throw new Error("Microsoft Graph calendar request failed.");
      throw new Error("Microsoft Graph calendar response is invalid.");
    }
    return result.events;
  }
  async loadCalendarEventsWithDiagnostic(range: MicrosoftCalendarRange): Promise<MicrosoftCalendarReadResult> {
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return { events: [], diagnostic: { stage: "RANGE_CONSTRUCTION", outcome: "FAILED", reasonCode: "CALENDAR_RANGE_INVALID", requestRangeValid: false } };
    }

    let token: string;
    try {
      token = await this.getAccessToken(calendarScopes);
    } catch {
      return { events: [], diagnostic: { stage: "TOKEN_ACQUISITION", outcome: "FAILED", reasonCode: "CALENDAR_TOKEN_ACQUISITION_FAILED", requestRangeValid: true, retryable: true } };
    }
    const parameters = new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $select: "id,subject,start,end,isAllDay,isCancelled,showAs,location,organizer,isOnlineMeeting,onlineMeeting,sensitivity",
      $orderby: "start/dateTime",
    });
    let response: Response;
    try {
      response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/calendarView?${parameters}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });
    } catch {
      return { events: [], diagnostic: { stage: "GRAPH_REQUEST", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", requestRangeValid: true, retryable: true } };
    }
    if (!response.ok) {
      const reasonCode = response.status === 400 ? "CALENDAR_GRAPH_HTTP_400" : response.status === 401 ? "CALENDAR_GRAPH_HTTP_401" : response.status === 403 ? "CALENDAR_GRAPH_HTTP_403" : response.status === 404 ? "CALENDAR_GRAPH_HTTP_404" : response.status === 429 ? "CALENDAR_GRAPH_HTTP_429" : response.status >= 500 ? "CALENDAR_GRAPH_HTTP_5XX" : "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
      return { events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode, httpStatus: response.status, requestRangeValid: true, retryable: response.status === 429 || response.status >= 500 } };
    }

    let body: { value?: unknown };
    try {
      const contentType = response.headers?.get?.("content-type");
      if (contentType && !contentType.toLowerCase().includes("json")) {
        return { events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_NON_JSON_RESPONSE", httpStatus: response.status, requestRangeValid: true } };
      }
      body = await response.json() as { value?: unknown };
    } catch {
      return { events: [], diagnostic: { stage: "RESPONSE_VALIDATION", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_INVALID_ENVELOPE", httpStatus: response.status, requestRangeValid: true } };
    }
    if (!Array.isArray(body.value)) {
      return { events: [], diagnostic: { stage: "RESPONSE_VALIDATION", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_VALUE_NOT_ARRAY", httpStatus: response.status, requestRangeValid: true } };
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
    return { events: Object.freeze(normalized), diagnostic: { ...diagnostic, httpStatus: response.status, returnedEventCount, normalizedEventCount, rejectedEventCount, requestRangeValid: true } };
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
