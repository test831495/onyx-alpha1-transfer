import { PHASE1A9_AUTHORITY_CONTRACT_VERSION } from "./versions";

export const SCHEDULER_PACKAGE_ID = "@onyx/phase1a9-governed-scheduler" as const;
export interface SchedulerAuthorityBoundary {
  authorityContractId: string; schedulerPackageId: string; workflowAuthorityReference: string;
  runtimeAuthorityReference: string; governedContractsReference: string; approvalAuthorityReference: string;
  operationalLedgerBoundaryReference: string; schedulerOwnedStateClasses: readonly string[];
  schedulerReferencedStateClasses: readonly string[]; schedulerProhibitedAuthorityClasses: readonly string[];
  activeRuntimeLaneLimit: 1; promotionLaneLimit: 1; safetyProfileId: string; contractVersion: string;
  evidenceReferences: readonly string[];
}

export function assertSchedulerAuthorityBoundary(value: SchedulerAuthorityBoundary): void {
  if (value.contractVersion !== PHASE1A9_AUTHORITY_CONTRACT_VERSION || value.schedulerPackageId !== SCHEDULER_PACKAGE_ID) throw new Error("Invalid scheduler authority contract.");
  if (value.activeRuntimeLaneLimit !== 1 || value.promotionLaneLimit !== 1) throw new Error("Scheduler lane authority limits are frozen.");
  if (value.schedulerOwnedStateClasses.includes("workflow-authority") || value.schedulerOwnedStateClasses.includes("runtime-authority")) throw new Error("Scheduler cannot own predecessor authority.");
  if (value.schedulerProhibitedAuthorityClasses.length === 0) throw new Error("Scheduler prohibited authority classes are required.");
}

export const defaultSchedulerAuthorityBoundary = (): SchedulerAuthorityBoundary => ({
  authorityContractId: "1a9:authority:wave1", schedulerPackageId: SCHEDULER_PACKAGE_ID,
  workflowAuthorityReference: "phase1a5:workflow-state-machine", runtimeAuthorityReference: "phase1a6:runtime-authority",
  governedContractsReference: "phase1a8:governed-contract-groups", approvalAuthorityReference: "rahul-or-governed-approval",
  operationalLedgerBoundaryReference: "phase1a8:M4-operational-ledger", schedulerOwnedStateClasses: ["operational-scheduler-state"],
  schedulerReferencedStateClasses: ["phase1a5:workflow-state", "phase1a6:runtime-status", "phase1a8:governed-reference"],
  schedulerProhibitedAuthorityClasses: ["workflow-authority", "runtime-authority", "memory-authority", "connector-authority", "promotion-authority"],
  activeRuntimeLaneLimit: 1, promotionLaneLimit: 1, safetyProfileId: "1a9:safety:wave1", contractVersion: PHASE1A9_AUTHORITY_CONTRACT_VERSION,
  evidenceReferences: [],
});