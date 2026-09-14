import type { FileSourceId } from "@onyx/workspace-contracts";

export interface FileSourceRegistration { readonly sourceId: FileSourceId; readonly displayName: string; readonly providerFamily: string; readonly operations: readonly ("BROWSE" | "READ_METADATA")[]; }

export const FILE_SOURCE_REGISTRY: readonly FileSourceRegistration[] = [
  { sourceId: "local", displayName: "Local Files", providerFamily: "local", operations: ["BROWSE", "READ_METADATA"] },
  { sourceId: "microsoft-onedrive", displayName: "OneDrive", providerFamily: "microsoft", operations: ["BROWSE", "READ_METADATA"] },
  { sourceId: "microsoft-sharepoint", displayName: "SharePoint", providerFamily: "microsoft", operations: ["BROWSE", "READ_METADATA"] },
  { sourceId: "google-drive", displayName: "Google Drive", providerFamily: "google", operations: ["BROWSE", "READ_METADATA"] },
];