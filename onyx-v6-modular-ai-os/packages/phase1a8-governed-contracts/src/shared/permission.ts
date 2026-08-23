import { AGENT_PERMISSION_CONTRACT_VERSION } from "./versions";
import { RISK_CLASSES, type RiskClass } from "./risk-classes";

export interface PerAgentPermissionContract {
  permissionProfileId: string;
  agentId: string;
  capabilityAllowlist: string[];
  capabilityDenylist: string[];
  connectorScopes: string[];
  memoryReadScopes: string[];
  memoryWriteScopes: string[];
  toolScopes: string[];
  networkScopes: string[];
  readPermissions: string[];
  writePermissions: string[];
  approvalRequirements: string[];
  riskClassLimit: RiskClass;
  promotionPermissions: boolean;
  paidActionLimit: number;
  secretAccessProhibited: true;
  productionProhibited: true;
  contractVersion: string;
}

/** Deny-by-default: a capability must be explicitly allowlisted and not denylisted. */
export function isCapabilityPermitted(profile: PerAgentPermissionContract, capabilityId: string): boolean {
  if (profile.capabilityDenylist.includes(capabilityId)) return false;
  return profile.capabilityAllowlist.includes(capabilityId);
}

export function isRiskClassPermitted(profile: PerAgentPermissionContract, riskClass: RiskClass): boolean {
  if (riskClass === "R5") return false;
  return RISK_CLASSES.indexOf(riskClass) <= RISK_CLASSES.indexOf(profile.riskClassLimit);
}

export function defaultDenyAllPermissionProfile(agentId: string, permissionProfileId: string): PerAgentPermissionContract {
  return {
    permissionProfileId,
    agentId,
    capabilityAllowlist: [],
    capabilityDenylist: [],
    connectorScopes: [],
    memoryReadScopes: [],
    memoryWriteScopes: [],
    toolScopes: [],
    networkScopes: [],
    readPermissions: [],
    writePermissions: [],
    approvalRequirements: [],
    riskClassLimit: "R0",
    promotionPermissions: false,
    paidActionLimit: 0,
    secretAccessProhibited: true,
    productionProhibited: true,
    contractVersion: AGENT_PERMISSION_CONTRACT_VERSION,
  };
}
