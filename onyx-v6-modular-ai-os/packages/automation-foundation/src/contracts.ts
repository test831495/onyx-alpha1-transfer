export type AutomationRisk =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AutomationStatus =
  | "draft"
  | "approved"
  | "planning"
  | "executing"
  | "validating"
  | "evidence-ready"
  | "draft-pr-ready"
  | "awaiting-review"
  | "completed"
  | "failed"
  | "cancelled";

export interface AutomationCapability {
  id: string;
  name: string;
  risk: AutomationRisk;
  approvalRequired: boolean;
  enabled: boolean;
}

export interface AutomationJobSummary {
  id: string;
  capabilityId: string;
  status: AutomationStatus;
}
