export const MODE_NAMES = ["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"] as const;
export type OperatingMode = (typeof MODE_NAMES)[number];

export const MODE_POLICY_VERSION = "mode-policy-1";
export const CAPABILITY_POLICY_VERSION = "capability-policy-1";
export const BUDGET_POLICY_VERSION = "budget-policy-1";
export const APPROVED_BUDGET_UNITS = ["count", "minutes"] as const;
export const APPROVED_BUDGET_PERIODS = ["hour", "day"] as const;

export const MODE_CAPABILITY_MATRIX = {
  ACTIVE: {
    ownerLogin: "enabled",
    recovery: "enabled",
    emergencyApprovals: "enabled",
    criticalAudit: "enabled",
    securityAlerts: "enabled",
    cameraAndDoorAlerts: "enabled",
    conciseSummaries: "enabled",
    normalInteractions: "enabled",
    modelRouting: "budgeted",
    councilRuns: "budgeted",
    specialistAgents: "budgeted",
    backgroundResearch: "budgeted",
    voice: "budgeted",
    connectorPolling: "budgeted",
    indexing: "budgeted",
    cameraAnalytics: "budgeted",
    telemetry: "budgeted",
    reports: "budgeted",
    backupVerification: "enabled",
    recoveryVerification: "enabled",
    localEdgeTasks: "budgeted",
    futureGatewayContributions: "budgeted"
  },
  LIGHT: {
    ownerLogin: "enabled",
    recovery: "enabled",
    emergencyApprovals: "enabled",
    criticalAudit: "enabled",
    securityAlerts: "enabled",
    cameraAndDoorAlerts: "enabled",
    conciseSummaries: "enabled",
    normalInteractions: "reduced",
    modelRouting: "reduced",
    councilRuns: "reduced",
    specialistAgents: "reduced",
    backgroundResearch: "reduced",
    voice: "reduced",
    connectorPolling: "reduced",
    indexing: "reduced",
    cameraAnalytics: "reduced",
    telemetry: "reduced",
    reports: "reduced",
    backupVerification: "enabled",
    recoveryVerification: "enabled",
    localEdgeTasks: "reduced",
    futureGatewayContributions: "reduced"
  },
  VACATION: {
    ownerLogin: "owner-only",
    recovery: "critical-only",
    emergencyApprovals: "critical-only",
    criticalAudit: "critical-only",
    securityAlerts: "critical-only",
    cameraAndDoorAlerts: "critical-only",
    conciseSummaries: "reduced",
    normalInteractions: "suspended",
    modelRouting: "suspended",
    councilRuns: "suspended",
    specialistAgents: "suspended",
    backgroundResearch: "suspended",
    voice: "suspended",
    connectorPolling: "suspended",
    indexing: "suspended",
    cameraAnalytics: "suspended",
    telemetry: "reduced",
    reports: "suspended",
    backupVerification: "enabled",
    recoveryVerification: "enabled",
    localEdgeTasks: "suspended",
    futureGatewayContributions: "suspended"
  },
  HIBERNATION: {
    ownerLogin: "owner-only",
    recovery: "critical-only",
    emergencyApprovals: "critical-only",
    criticalAudit: "critical-only",
    securityAlerts: "critical-only",
    cameraAndDoorAlerts: "critical-only",
    conciseSummaries: "suspended",
    normalInteractions: "suspended",
    modelRouting: "suspended",
    councilRuns: "suspended",
    specialistAgents: "suspended",
    backgroundResearch: "suspended",
    voice: "suspended",
    connectorPolling: "suspended",
    indexing: "suspended",
    cameraAnalytics: "suspended",
    telemetry: "suspended",
    reports: "suspended",
    backupVerification: "enabled",
    recoveryVerification: "enabled",
    localEdgeTasks: "suspended",
    futureGatewayContributions: "suspended"
  }
} as const;

export const MODE_BUDGETS = {
  interactions: { min: 0, max: 200, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  modelRequests: { min: 0, max: 200, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  modelPlanningUnits: { min: 0, max: 120, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  agentTurns: { min: 0, max: 80, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  councilRuns: { min: 0, max: 8, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  specialistRuns: { min: 0, max: 4, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  connectorPolling: { min: 0, max: 20, unit: "count", period: "hour", policyVersion: BUDGET_POLICY_VERSION },
  voiceMinutes: { min: 0, max: 30, unit: "minutes", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  cameraAnalysis: { min: 0, max: 12, unit: "count", period: "hour", policyVersion: BUDGET_POLICY_VERSION },
  indexing: { min: 0, max: 50, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  telemetry: { min: 0, max: 60, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  reports: { min: 0, max: 10, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  backgroundTasks: { min: 0, max: 12, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  localEdgeTasks: { min: 0, max: 24, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  backupVerification: { min: 0, max: 12, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  recoveryVerification: { min: 0, max: 12, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION },
  futureGatewayContributions: { min: 0, max: 2, unit: "count", period: "day", policyVersion: BUDGET_POLICY_VERSION }
} as const;

export const BUDGET_CLASSES = Object.keys(MODE_BUDGETS) as Array<keyof typeof MODE_BUDGETS>;

export function validateModeName(mode: string): boolean {
  return MODE_NAMES.includes(mode as OperatingMode);
}

export function validateModeBudget(envelope: Record<string, any>): boolean {
  if (!envelope || typeof envelope !== "object") return false;
  const keys = Object.keys(MODE_BUDGETS);
  return keys.every((key) => {
    const value = envelope[key];
    if (!value || typeof value !== "object") return false;
    const min = Number(value.min); const max = Number(value.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    if (min < 0 || max < 0 || min > max) return false;
    if (!APPROVED_BUDGET_UNITS.includes(value.unit as (typeof APPROVED_BUDGET_UNITS)[number])) return false;
    if (!APPROVED_BUDGET_PERIODS.includes(value.period as (typeof APPROVED_BUDGET_PERIODS)[number])) return false;
    if (value.policyVersion !== BUDGET_POLICY_VERSION) return false;
    return true;
  });
}
