import { PHASE1A9_SCHEDULER_CONTRACT_VERSION, COMPATIBLE_GOVERNED_CONTRACTS_VERSION, COMPATIBLE_RUNTIME_CONTRACT_VERSION, COMPATIBLE_UI_CONTRACT_VERSION_FROM_PREDECESSOR, COMPATIBLE_WORKFLOW_CONTRACT_VERSION } from "../shared/versions";
import { LaneStage } from "./lane-stage";

export interface SchedulerConfig {
  schedulerConfigId: string; enabled: false; contractVersion: string; compatibleWorkflowContractVersion: string;
  compatibleRuntimeContractVersion: string; compatibleUiContractVersion: string; compatibleGovernedContractsVersion: string;
  activeLaneStage: LaneStage; authoringLaneLimit: 1; stabilizationLaneLimit: 2; promotionLaneLimit: 1;
  defaultRiskClassLimit: string; defaultParallelSafetyPolicy: string; timeBudgetId: string; tokenBudgetId: string;
  costBudgetId: string; attemptBudgetId: string; evidenceBudgetId: string; recoveryPolicyId: string;
  approvalPolicyVersion: string; safetyProfileId: string; createdAt: string; updatedAt: string; evidenceReferences: readonly string[];
}

export function assertSchedulerConfig(config: SchedulerConfig): void {
  if (config.enabled !== false || config.activeLaneStage !== "S0_SINGLE" || config.authoringLaneLimit !== 1 || config.stabilizationLaneLimit !== 2 || config.promotionLaneLimit !== 1) throw new Error("Wave 1 scheduler configuration is not bounded.");
  if (config.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION || config.compatibleWorkflowContractVersion !== COMPATIBLE_WORKFLOW_CONTRACT_VERSION || config.compatibleRuntimeContractVersion !== COMPATIBLE_RUNTIME_CONTRACT_VERSION || config.compatibleUiContractVersion !== COMPATIBLE_UI_CONTRACT_VERSION_FROM_PREDECESSOR || config.compatibleGovernedContractsVersion !== COMPATIBLE_GOVERNED_CONTRACTS_VERSION) throw new Error("Scheduler compatibility mismatch.");
}

export const defaultSchedulerConfig = (): SchedulerConfig => ({
  schedulerConfigId: "1a9:config:wave1", enabled: false, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  compatibleWorkflowContractVersion: COMPATIBLE_WORKFLOW_CONTRACT_VERSION, compatibleRuntimeContractVersion: COMPATIBLE_RUNTIME_CONTRACT_VERSION,
  compatibleUiContractVersion: COMPATIBLE_UI_CONTRACT_VERSION_FROM_PREDECESSOR, compatibleGovernedContractsVersion: COMPATIBLE_GOVERNED_CONTRACTS_VERSION,
  activeLaneStage: "S0_SINGLE", authoringLaneLimit: 1, stabilizationLaneLimit: 2, promotionLaneLimit: 1,
  defaultRiskClassLimit: "R3", defaultParallelSafetyPolicy: "explicit-class-required", timeBudgetId: "budget:time:default",
  tokenBudgetId: "budget:token:default", costBudgetId: "budget:cost:default", attemptBudgetId: "budget:attempt:default",
  evidenceBudgetId: "budget:evidence:default", recoveryPolicyId: "policy:recovery:governed", approvalPolicyVersion: "1.0.0",
  safetyProfileId: "1a9:safety:wave1", createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z", evidenceReferences: [],
});