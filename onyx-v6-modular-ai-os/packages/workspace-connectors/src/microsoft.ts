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

  // Token audience: NOT_INSPECTABLE unless directly and safely evidenced
  let tokenAudience: MicrosoftTokenAudienceClass = "NOT_INSPECTABLE";
  if (typeof result?.aud === "string" && result.aud.trim().length > 0) {
    const rawAud = result.aud.toLowerCase();
    tokenAudience = (rawAud.includes("graph.microsoft.com") || rawAud.includes("graph.windows.net"))
      ? "MICROSOFT_GRAPH_EXPECTED"
      : "UNEXPECTED_RESOURCE";
  }

  // Calendar scope report
  let calendarScope: MicrosoftCalendarScopeReport = "NOT_REPORTED";
  if (returnedScopes) {
    const hasCalRead = returnedScopes.some((s: string) => typeof s === "string" && s.toLowerCase() === "calendars.read");
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
  private authority: string | undefined;
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
    await this.application.loginRedirect({ scopes: workspaceScopes, prompt: "select_account" });
  }
  async reconnect(): Promise<void> {
    if (!this.application) await this.initialize();
    if (!this.application || !this.account) throw new Error("Microsoft workspace is not connected.");
    try {
      await this.getAccessToken(calendarScopes);
    } catch (error) {
      const underlyingCause = error instanceof Error ? error.cause : undefined;
      if (isInteractionRequiredTokenError(underlyingCause) || isInteractionRequiredTokenError(error)) {
        this.diagnostic = "Redirecting to Microsoft sign-in.";
        await this.application.loginRedirect({ scopes: workspaceScopes, prompt: "select_account" });
        return;
      }
      throw error;
    }
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
    const token = await this.application.acquireTokenSilent({ account: this.account, scopes: profileScopes });
    const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,id", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    if (!response.ok) throw new Error(`Microsoft Graph profile request failed (${response.status}).`);
    const value = await response.json() as { displayName: string; mail?: string; userPrincipalName?: string; id?: string };
    return { displayName: value.displayName, email: value.mail ?? value.userPrincipalName, tenantId: this.account.tenantId, accountId: value.id ?? this.account.homeAccountId };
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
      return { events: [], diagnostic: { stage: "RANGE_CONSTRUCTION", outcome: "FAILED", reasonCode: "CALENDAR_RANGE_INVALID", requestRangeValid: false } };
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
          return { events: [], diagnostic: { ...baseDiagnostic, reasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", silentAttempted: true, silentOutcome: "ABSENT", credentialPresent: false } };
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
          return {
            events: [],
            diagnostic: {
              ...baseDiagnostic,
              outcome: "FAILED",
              reasonCode: failureReason,
              finalReasonCode: failureReason,
              headerAttached: false, // FAIL CLOSED: Never attach header or perform Graph request
            },
          };
        }
      } else {
        token = await this.getAccessToken(calendarScopes);
      }
    } catch (error) {
      if (isInteractionRequiredTokenError(error)) {
        return { events: [], diagnostic: { ...baseDiagnostic, reasonCode: "MICROSOFT_INTERACTION_REQUIRED", finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED", interactionRequired: true, silentAttempted: true, silentOutcome: "INTERACTION_REQUIRED", credentialPresent: false } };
      }
      return { events: [], diagnostic: { ...baseDiagnostic, reasonCode: this.hasMsalSilentRuntime() ? "MICROSOFT_SILENT_TOKEN_FAILED" : "CALENDAR_TOKEN_ACQUISITION_FAILED", finalReasonCode: this.hasMsalSilentRuntime() ? "MICROSOFT_SILENT_TOKEN_FAILED" : "CALENDAR_TOKEN_ACQUISITION_FAILED", silentAttempted: true, silentOutcome: "FAILED", credentialPresent: false } };
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
      return { events: [], diagnostic: { ...baseDiagnostic, stage: "GRAPH_REQUEST", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", requestRangeValid: true, retryable: true, interactionRequired: false } };
    }
    if (!response.ok) {
      if (response.status === 401 && this.hasMsalSilentRuntime()) {
        const refreshBase = { ...baseDiagnostic, stage: "GRAPH_RESPONSE" as const, outcome: "FAILED" as const, reasonCode: "MICROSOFT_GRAPH_HTTP_401_INITIAL" as const, httpStatus: response.status, initialGraphStatus: response.status, finalReasonCode: "MICROSOFT_GRAPH_HTTP_401_INITIAL" as const, retryable: true, requestRangeValid: true, headerAttached: true, refreshAttempted: true, forceRefreshAttempted: true };
        let refreshedMetadata: BDynamicTokenAdjudication | undefined;
        try {
          refreshedMetadata = await this.acquireCalendarAccessTokenWithMetadata(true);
        } catch (error) {
          if (isInteractionRequiredTokenError(error)) {
            return { events: [], diagnostic: { ...refreshBase, refreshOutcome: "INTERACTION_REQUIRED", interactionRequired: true, reasonCode: "MICROSOFT_INTERACTION_REQUIRED", finalReasonCode: "MICROSOFT_INTERACTION_REQUIRED" } };
          }
          return { events: [], diagnostic: { ...refreshBase, refreshOutcome: "FAILED", reasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", finalReasonCode: "MICROSOFT_TOKEN_FORCE_REFRESH_FAILED", interactionRequired: false } };
        }
        if (!refreshedMetadata || !refreshedMetadata.accessToken) {
          return { events: [], diagnostic: { ...refreshBase, refreshOutcome: "ABSENT", reasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", finalReasonCode: "MICROSOFT_ACCESS_TOKEN_ABSENT", credentialPresent: false, interactionRequired: false } };
        }

        // Independently update refreshed token metadata
        refreshBase.calendarReturnedScopes = refreshedMetadata.returnedScopes;
        refreshBase.calendarScope = refreshedMetadata.calendarScope;
        refreshBase.accountBinding = refreshedMetadata.accountBinding;
        refreshBase.tokenAudience = refreshedMetadata.tokenAudience;

        // FINDING 2 FAIL CLOSED: Validate refreshed token adjudication independently
        if (!refreshedMetadata.valid) {
          const failureReason = refreshedMetadata.failureReason ?? "MICROSOFT_ACTIVE_ACCOUNT_MISMATCH";
          return {
            events: [],
            diagnostic: {
              ...refreshBase,
              refreshOutcome: "FAILED",
              reasonCode: failureReason,
              finalReasonCode: failureReason,
              retryAttempted: false, // FAIL CLOSED: Zero retry fetch calls made
              interactionRequired: false,
            },
          };
        }

        refreshBase.refreshOutcome = "SUCCEEDED";
        const refreshedToken = refreshedMetadata.accessToken;
        try {
          const retryResponse = await fetch(endpoint, { method: "GET", headers: { Authorization: `Bearer ${refreshedToken}`, Prefer: 'outlook.timezone="UTC"' } });
          if (retryResponse.ok) {
            const parsed = await this.parseCalendarGraphResponse(retryResponse);
            if (parsed.ok) {
              return { events: parsed.events, diagnostic: { ...refreshBase, ...parsed.diagnostic, stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED", reasonCode: "MICROSOFT_GRAPH_RETRY_SUCCEEDED", finalReasonCode: "MICROSOFT_GRAPH_RETRY_SUCCEEDED", refreshAttempted: true, refreshOutcome: "SUCCEEDED", retryAttempted: true, retryGraphStatus: retryResponse.status, headerAttached: true, interactionRequired: false, httpStatus: retryResponse.status, forceRefreshAttempted: true } };
            }
            return { events: parsed.events, diagnostic: { ...refreshBase, ...parsed.diagnostic, stage: "GRAPH_RESPONSE", outcome: parsed.diagnostic.outcome, reasonCode: parsed.diagnostic.reasonCode, finalReasonCode: parsed.diagnostic.reasonCode, refreshAttempted: true, refreshOutcome: "SUCCEEDED", retryAttempted: true, retryGraphStatus: retryResponse.status, headerAttached: true, interactionRequired: false, httpStatus: retryResponse.status, forceRefreshAttempted: true } };
          }
          if (retryResponse.status === 401) {
            const persistent401 = await this.diagnosePersistent401(refreshedToken, { ...refreshBase, retryAttempted: true, retryGraphStatus: retryResponse.status, reasonCode: "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH", finalReasonCode: "MICROSOFT_GRAPH_HTTP_401_AFTER_REFRESH", interactionRequired: false, headerAttached: true }, range);
            return { events: [], diagnostic: persistent401 };
          }
          const retryReasonCode = retryResponse.status === 400 ? "CALENDAR_GRAPH_HTTP_400" : retryResponse.status === 403 ? "CALENDAR_GRAPH_HTTP_403" : retryResponse.status === 404 ? "CALENDAR_GRAPH_HTTP_404" : retryResponse.status === 429 ? "CALENDAR_GRAPH_HTTP_429" : retryResponse.status >= 500 ? "CALENDAR_GRAPH_HTTP_5XX" : "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
          return { events: [], diagnostic: { ...refreshBase, retryAttempted: true, retryGraphStatus: retryResponse.status, reasonCode: retryReasonCode, finalReasonCode: retryReasonCode, interactionRequired: false, headerAttached: true } };
        } catch {
          return { events: [], diagnostic: { ...refreshBase, retryAttempted: true, retryGraphStatus: 0, reasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", finalReasonCode: "CALENDAR_GRAPH_NETWORK_FAILURE", interactionRequired: false } };
        }
      }
      const reasonCode = response.status === 400 ? "CALENDAR_GRAPH_HTTP_400" : response.status === 401 ? "CALENDAR_GRAPH_HTTP_401" : response.status === 403 ? "CALENDAR_GRAPH_HTTP_403" : response.status === 404 ? "CALENDAR_GRAPH_HTTP_404" : response.status === 429 ? "CALENDAR_GRAPH_HTTP_429" : response.status >= 500 ? "CALENDAR_GRAPH_HTTP_5XX" : "CALENDAR_UNKNOWN_BOUNDED_FAILURE";
      return { events: [], diagnostic: { ...baseDiagnostic, stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode, finalReasonCode: reasonCode, httpStatus: response.status, requestRangeValid: true, retryable: response.status === 429 || response.status >= 500 } };
    }

    const parsed = await this.parseCalendarGraphResponse(response);
    if (!parsed.ok) {
      return { events: [], diagnostic: { ...baseDiagnostic, ...parsed.diagnostic, finalReasonCode: parsed.diagnostic.reasonCode } };
    }

    return { events: parsed.events, diagnostic: { ...baseDiagnostic, ...parsed.diagnostic, httpStatus: response.status, headerAttached: true, finalReasonCode: parsed.diagnostic.reasonCode } };
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
    return { ok: true, events: Object.freeze(normalized), diagnostic: { ...diagnostic, httpStatus: response.status, returnedEventCount, normalizedEventCount, rejectedEventCount, requestRangeValid: true, headerAttached: true, finalReasonCode: diagnostic.reasonCode } };
  }
  private async probeGraphEndpoint(token: string, path: string): Promise<{ status?: number; envelopeValid: boolean; errorClass?: MicrosoftGraphErrorClass; requestIdPresent: boolean; clientRequestIdPresent: boolean; claimsChallengePresent: boolean; wwwAuthenticateClass: MicrosoftGraphWwwAuthenticateClass }> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const requestIdPresent = Boolean(response.headers?.get?.("x-ms-request-id"));
      const clientRequestIdPresent = Boolean(response.headers?.get?.("client-request-id"));
      const wwwAuthenticate = response.headers?.get?.("www-authenticate") ?? "";
      const claimsChallengePresent = /claims/i.test(wwwAuthenticate);
      let envelopeValid = false;
      let errorClass: MicrosoftGraphErrorClass | undefined;
      try {
        const body = await response.json() as { value?: unknown; id?: unknown; error?: { code?: unknown } };
        envelopeValid = response.ok ? typeof body.id === "string" && body.id.trim().length > 0 : Boolean(body.error && typeof body.error.code === "string");
        errorClass = typeof body.error?.code === "string" ? classifyGraphErrorCode(body.error.code) : undefined;
      } catch {
        envelopeValid = false;
      }
      return {
        status: response.status,
        envelopeValid,
        errorClass,
        requestIdPresent,
        clientRequestIdPresent,
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
  private async executeCalendarEndpointMatrix(token: string, range: MicrosoftCalendarRange): Promise<{ defaultCalendarStatus?: number; calendarsCollectionStatus?: number; defaultCalendarViewStatus?: number; directCalendarViewStatus?: number; eventsCollectionStatus?: number; requestIdPresent: boolean; clientRequestIdPresent: boolean; claimsChallengePresent: boolean; graphErrorClass?: MicrosoftGraphErrorClass; wwwAuthenticateClass: MicrosoftGraphWwwAuthenticateClass }> {
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
      return { ...base, graphMeStatus: me.status, graphMeEnvelopeValid: me.envelopeValid, graphRequestIdPresent: me.requestIdPresent, graphClientRequestIdPresent: me.clientRequestIdPresent, claimsChallengePresent: me.claimsChallengePresent, wwwAuthenticateClass: me.wwwAuthenticateClass, graphErrorClass: me.errorClass, reasonCode: "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY", finalReasonCode: "MICROSOFT_GRAPH_TOKEN_REJECTED_GLOBALLY" };
    }
    if (me.status !== 200 || !me.envelopeValid) {
      return { ...base, graphMeStatus: me.status, graphMeEnvelopeValid: me.envelopeValid, graphRequestIdPresent: me.requestIdPresent, graphClientRequestIdPresent: me.clientRequestIdPresent, claimsChallengePresent: me.claimsChallengePresent, wwwAuthenticateClass: me.wwwAuthenticateClass, graphErrorClass: me.errorClass, reasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER", finalReasonCode: "MICROSOFT_EXTERNAL_TOKEN_ACCEPTANCE_BLOCKER" };
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
} {
  const activeProbes = probes.filter((p): p is GraphProbePartial => Boolean(p));

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
  for (const p of activeProbes) {
    if (!p.errorClass) continue;
    if (!graphErrorClass) {
      graphErrorClass = p.errorClass;
    } else {
      const currentRank = ERROR_CLASS_PRECEDENCE[graphErrorClass] ?? 99;
      const newRank = ERROR_CLASS_PRECEDENCE[p.errorClass] ?? 99;
      if (newRank < currentRank) {
        graphErrorClass = p.errorClass;
      }
    }
  }

  return {
    requestIdPresent,
    clientRequestIdPresent,
    claimsChallengePresent,
    wwwAuthenticateClass,
    graphErrorClass,
  };
}
