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
    this.initialization = this.initializeOnce();
    return this.initialization;
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
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new Error("Microsoft calendar range is invalid.");
    }

    const token = await this.getAccessToken(calendarScopes);
    const parameters = new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $select: "id,subject,start,end,isAllDay,isCancelled,showAs,location,organizer,isOnlineMeeting,onlineMeeting,sensitivity",
      $orderby: "start/dateTime",
    });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${parameters}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    if (!response.ok) {
      throw new Error(`Microsoft Graph calendar request failed (${response.status}).`);
    }

    const body = await response.json() as { value?: unknown };
    if (!Array.isArray(body.value)) {
      throw new Error("Microsoft Graph calendar response is invalid.");
    }

    return Object.freeze(body.value.map(normalizeCalendarEvent));
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
