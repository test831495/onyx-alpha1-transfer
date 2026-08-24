/**
 * Material Change Detection and Handling
 *
 * Material changes invalidate prior readiness and trigger reassessment.
 * Implement a deterministic material-change classifier.
 */

import type { IdeaVersion, MaterialChange } from "./idea-model.js";

export type ChangeType = "users" | "household_scope" | "data_categories" | "connectors" | "external_recipients" | "behavior" | "authority" | "biometric" | "cost_frequency" | "phase" | "environment" | "permissions" | "retention" | "disclosure" | "memory" | "session" | "approval_engine" | "mode_impact" | "recovery" | "other";

/**
 * Category of material changes
 */
export enum MaterialChangeCategory {
  OWNERSHIP_AND_GOVERNANCE = "ownership_and_governance",
  DATA_AND_PRIVACY = "data_and_privacy",
  EXTERNAL_INTERACTIONS = "external_interactions",
  EXECUTION_AND_BEHAVIOR = "execution_and_behavior",
  COST_AND_RESOURCES = "cost_and_resources",
  DEPLOYMENT_AND_ENVIRONMENT = "deployment_and_environment",
  SAFETY_AND_COMPLIANCE = "safety_and_compliance",
  SESSION_AND_MEMORY = "session_and_memory",
}

/**
 * Classification of what constitutes a material change
 */
const MATERIAL_CHANGE_CLASSIFICATION: Record<ChangeType, {
  category: MaterialChangeCategory;
  invalidatesReadiness: boolean;
  triggersReassessment: boolean;
  description: string;
}> = {
  users: {
    category: MaterialChangeCategory.OWNERSHIP_AND_GOVERNANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "User or profile scope changed",
  },
  household_scope: {
    category: MaterialChangeCategory.OWNERSHIP_AND_GOVERNANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Household scope or membership changed",
  },
  data_categories: {
    category: MaterialChangeCategory.DATA_AND_PRIVACY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Private-data categories or sensitivity changed",
  },
  connectors: {
    category: MaterialChangeCategory.EXTERNAL_INTERACTIONS,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Connectors or external service integrations changed",
  },
  external_recipients: {
    category: MaterialChangeCategory.EXTERNAL_INTERACTIONS,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "External recipients or sharing changed",
  },
  behavior: {
    category: MaterialChangeCategory.EXECUTION_AND_BEHAVIOR,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Write or deletion behavior changed",
  },
  authority: {
    category: MaterialChangeCategory.OWNERSHIP_AND_GOVERNANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Agent authority or automated actions changed",
  },
  biometric: {
    category: MaterialChangeCategory.DATA_AND_PRIVACY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Camera or biometric processing capability changed",
  },
  cost_frequency: {
    category: MaterialChangeCategory.COST_AND_RESOURCES,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Cost or frequency changed materially",
  },
  phase: {
    category: MaterialChangeCategory.DEPLOYMENT_AND_ENVIRONMENT,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Target phase changed",
  },
  environment: {
    category: MaterialChangeCategory.DEPLOYMENT_AND_ENVIRONMENT,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Deployment environment changed",
  },
  permissions: {
    category: MaterialChangeCategory.OWNERSHIP_AND_GOVERNANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Permissions or secrets changed",
  },
  retention: {
    category: MaterialChangeCategory.DATA_AND_PRIVACY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Data retention policy changed",
  },
  disclosure: {
    category: MaterialChangeCategory.DATA_AND_PRIVACY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Cross-profile or cross-household disclosure changed",
  },
  memory: {
    category: MaterialChangeCategory.SESSION_AND_MEMORY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Memory access or namespace changed",
  },
  session: {
    category: MaterialChangeCategory.SESSION_AND_MEMORY,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Session behavior or validity changed",
  },
  approval_engine: {
    category: MaterialChangeCategory.SAFETY_AND_COMPLIANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Approval Engine behavior or requirements changed",
  },
  mode_impact: {
    category: MaterialChangeCategory.COST_AND_RESOURCES,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Operating-mode impact or behavior changed",
  },
  recovery: {
    category: MaterialChangeCategory.SAFETY_AND_COMPLIANCE,
    invalidatesReadiness: true,
    triggersReassessment: true,
    description: "Recovery or rollback requirements changed",
  },
  other: {
    category: MaterialChangeCategory.EXECUTION_AND_BEHAVIOR,
    invalidatesReadiness: false,
    triggersReassessment: false,
    description: "Other change (may not be material)",
  },
};

export interface MaterialChangeClassification {
  isMaterial: boolean;
  category?: MaterialChangeCategory;
  invalidatesReadiness: boolean;
  triggersReassessment: boolean;
  description: string;
  recommendation: string;
}

/**
 * Classify if a change is material
 * @param changeType Type of change that occurred
 * @returns Classification result
 */
export function classifyMaterialChange(changeType: ChangeType): MaterialChangeClassification {
  const classification = MATERIAL_CHANGE_CLASSIFICATION[changeType];

  if (changeType === "other") {
    return {
      isMaterial: false,
      category: classification.category,
      invalidatesReadiness: classification.invalidatesReadiness,
      triggersReassessment: classification.triggersReassessment,
      description: classification.description,
      recommendation: "Evaluate context to determine if this change affects the idea",
    };
  }

  return {
    isMaterial: true,
    category: classification.category,
    invalidatesReadiness: classification.invalidatesReadiness,
    triggersReassessment: classification.triggersReassessment,
    description: classification.description,
    recommendation: "This change invalidates prior readiness. Fresh preflight validation is required.",
  };
}

/**
 * Determine if a material change invalidates readiness
 * @param changeType Type of change that occurred
 * @returns True if this change type invalidates readiness
 */
export function changeInvalidatesReadiness(changeType: ChangeType): boolean {
  return MATERIAL_CHANGE_CLASSIFICATION[changeType].invalidatesReadiness;
}

/**
 * Determine if a material change triggers reassessment
 * @param changeType Type of change that occurred
 * @returns True if this change type triggers reassessment
 */
export function changeTriggersReassessment(changeType: ChangeType): boolean {
  return MATERIAL_CHANGE_CLASSIFICATION[changeType].triggersReassessment;
}

/**
 * Get all change types in a category
 * @param category Material change category
 * @returns Array of change types in that category
 */
export function getChangeTypesInCategory(category: MaterialChangeCategory): readonly ChangeType[] {
  return Object.entries(MATERIAL_CHANGE_CLASSIFICATION)
    .filter(([, value]) => value.category === category)
    .map(([key]) => key as ChangeType);
}

/**
 * Create a material change record
 * @param previousVersion Previous idea version
 * @param newVersion New idea version
 * @param changeType Type of change
 * @param description Human-readable description
 * @returns Material change record
 */
export function createMaterialChangeRecord(
  previousVersion: IdeaVersion,
  newVersion: IdeaVersion,
  changeType: ChangeType,
  description: string,
): MaterialChange {
  const classification = classifyMaterialChange(changeType);

  return {
    changedAt: new Date(),
    previousVersion,
    newVersion,
    changeType,
    description,
    invalidatesReadiness: classification.invalidatesReadiness,
    triggersReassessment: classification.triggersReassessment,
  };
}
