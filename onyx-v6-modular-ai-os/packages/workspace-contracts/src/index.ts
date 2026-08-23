export type WorkspaceProviderId = "microsoft" | "google" | "yahoo";
export type WorkspaceConnectionState = "unconfigured" | "disconnected" | "connecting" | "connected" | "error";
export type WorkspaceCapabilityId = "profile" | "mail" | "calendar" | "files" | "sharepoint";
export interface WorkspaceProfile { displayName: string; email?: string; tenantId?: string; accountId?: string; }
export interface WorkspaceCapability { id: WorkspaceCapabilityId; label: string; enabled: boolean; plannedRelease?: string; }
export interface WorkspaceProviderSnapshot { provider: WorkspaceProviderId; label: string; state: WorkspaceConnectionState; profile?: WorkspaceProfile; capabilities: readonly WorkspaceCapability[]; diagnostic: string; }
export interface WorkspaceSnapshot { providers: readonly WorkspaceProviderSnapshot[]; activeProvider?: WorkspaceProviderId; updatedAt: number; }
