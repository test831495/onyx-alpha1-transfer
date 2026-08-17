import { BrowserCacheLocation, PublicClientApplication, type AccountInfo, type Configuration } from "@azure/msal-browser";
import type { WorkspaceProviderSnapshot, WorkspaceProfile } from "@onyx/workspace-contracts";
export interface MicrosoftWorkspaceConfig { clientId?: string; tenantId?: string; redirectUri?: string; }
const capabilities = [
  { id: "profile" as const, label: "Microsoft profile", enabled: true },
  { id: "mail" as const, label: "Outlook mail", enabled: false, plannedRelease: "Alpha 3.1.2" },
  { id: "calendar" as const, label: "Microsoft calendar", enabled: false, plannedRelease: "Alpha 3.1.1" },
  { id: "files" as const, label: "OneDrive", enabled: false, plannedRelease: "Alpha 3.1.3" },
  { id: "sharepoint" as const, label: "SharePoint", enabled: false, plannedRelease: "Alpha 3.1.3" },
];
export class MicrosoftWorkspaceConnector {
  private application?: PublicClientApplication;
  private account?: AccountInfo;
  private diagnostic = "Microsoft workspace is not configured.";
  constructor(private readonly config: MicrosoftWorkspaceConfig) {}
  get configured() { return Boolean(this.config.clientId && this.config.tenantId); }
  async initialize(): Promise<WorkspaceProviderSnapshot> {
    if (!this.configured) return this.snapshot("unconfigured");
    const authority = `https://login.microsoftonline.com/${this.config.tenantId}`;
    const configuration: Configuration = { auth: { clientId: this.config.clientId!, authority, redirectUri: this.config.redirectUri ?? window.location.origin }, cache: { cacheLocation: BrowserCacheLocation.SessionStorage } };
    this.application = new PublicClientApplication(configuration);
    await this.application.initialize();
    const redirect = await this.application.handleRedirectPromise();
    this.account = redirect?.account ?? this.application.getAllAccounts()[0];
    this.diagnostic = this.account ? "Microsoft workspace session is connected." : "Microsoft workspace is ready to connect.";
    return this.snapshot(this.account ? "connected" : "disconnected");
  }
  async connect(): Promise<void> {
    if (!this.application) { await this.initialize(); }
    if (!this.application || !this.configured) throw new Error("Microsoft workspace configuration is incomplete.");
    this.diagnostic = "Redirecting to Microsoft sign-in.";
    await this.application.loginRedirect({ scopes: ["User.Read"], prompt: "select_account" });
  }
  async disconnect(): Promise<void> {
    if (!this.application || !this.account) return;
    await this.application.logoutRedirect({ account: this.account, postLogoutRedirectUri: window.location.origin });
  }
  async loadProfile(): Promise<WorkspaceProfile | undefined> {
    if (!this.application || !this.account) return undefined;
    const token = await this.application.acquireTokenSilent({ account: this.account, scopes: ["User.Read"] });
    const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,id", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    if (!response.ok) throw new Error(`Microsoft Graph profile request failed (${response.status}).`);
    const value = await response.json() as { displayName: string; mail?: string; userPrincipalName?: string; id?: string };
    return { displayName: value.displayName, email: value.mail ?? value.userPrincipalName, tenantId: this.account.tenantId, accountId: value.id ?? this.account.homeAccountId };
  }
  snapshot(state?: WorkspaceProviderSnapshot["state"], profile?: WorkspaceProfile): WorkspaceProviderSnapshot {
    return { provider: "microsoft", label: "Microsoft 365", state: state ?? (this.account ? "connected" : this.configured ? "disconnected" : "unconfigured"), profile, capabilities, diagnostic: this.diagnostic };
  }
}
