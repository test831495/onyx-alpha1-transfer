import { CONNECTOR_SCOPE_CONTRACT_VERSION } from "./versions";

/** Reuses the exact provider list already frozen by Phase 1A.7's command-center dashboard. */
export const CONNECTOR_PROVIDERS = ["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

export const CONNECTOR_PERMISSION_MODES = ["READ_ONLY", "ACTION_APPROVAL_REQUIRED"] as const;
export type ConnectorPermissionMode = (typeof CONNECTOR_PERMISSION_MODES)[number];

export interface ConnectorScope {
  connectorScopeId: string;
  provider: ConnectorProvider;
  accountId: string;
  accountLabel: string;
  accountType: string;
  permissionMode: ConnectorPermissionMode;
  readScope: string[];
  writeScope: string[];
  approvalRequirement: string;
  sourceAttribution: string;
  ownerScope: string;
  projectScope: string;
  memoryWriteEligibility: boolean;
  parallelReadEligibility: boolean;
  mutationClassification: "SEQUENTIAL_CONNECTOR_MUTATION";
  contractVersion: string;
}

/** No cross-account authority is ever inferred. */
export const CROSS_ACCOUNT_INFERENCE_PERMITTED = false as const;

export function assertConnectorProvider(value: string): asserts value is ConnectorProvider {
  if (!(CONNECTOR_PROVIDERS as readonly string[]).includes(value)) {
    throw new Error(`Unknown connector provider: ${value}`);
  }
}

export function defaultConnectorScope(connectorScopeId: string, provider: ConnectorProvider, accountId: string): ConnectorScope {
  return {
    connectorScopeId,
    provider,
    accountId,
    accountLabel: accountId,
    accountType: "UNKNOWN",
    permissionMode: "READ_ONLY",
    readScope: [],
    writeScope: [],
    approvalRequirement: "REQUIRED",
    sourceAttribution: provider,
    ownerScope: "UNASSIGNED",
    projectScope: "UNASSIGNED",
    memoryWriteEligibility: false,
    parallelReadEligibility: false,
    mutationClassification: "SEQUENTIAL_CONNECTOR_MUTATION",
    contractVersion: CONNECTOR_SCOPE_CONTRACT_VERSION,
  };
}

/** Two scopes must never be treated as the same identity unless provider and account both match. */
export function assertNoMergedIdentity(a: ConnectorScope, b: ConnectorScope): void {
  if (a.accountId === b.accountId && a.provider !== b.provider) {
    throw new Error("Connector account identity must not be merged across providers.");
  }
}
