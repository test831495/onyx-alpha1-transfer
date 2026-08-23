export type ReleaseRecommendation = "READY_FOR_WAVE_5C_GIT_CLOSURE" | "CONDITIONALLY_READY_FOR_WAVE_5C" | "BLOCKED" | "RECONCILIATION_REQUIRED";
export interface ReadinessInput { acceptancePassed: boolean; testMatrixPassed: boolean; simulationsPassed: boolean; securityPassed: boolean; evidencePassed: boolean; predecessorPassed: boolean; authorityPassed: boolean; schedulerEnabled: boolean; promotionExecutable: boolean; criticalOrHighIssues: number; knownIssueClassified: boolean; }
export function recommendRelease(input: ReadinessInput): { recommendation: ReleaseRecommendation; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.acceptancePassed) blockers.push("acceptance closure incomplete");
  if (!input.testMatrixPassed) blockers.push("T01-T40 audit failed");
  if (!input.simulationsPassed) blockers.push("simulation audit failed");
  if (!input.securityPassed) blockers.push("security audit failed");
  if (!input.evidencePassed) blockers.push("evidence package incomplete");
  if (!input.predecessorPassed) blockers.push("bounded predecessor regression failed");
  if (!input.authorityPassed) blockers.push("authority audit failed");
  if (input.schedulerEnabled) blockers.push("scheduler is enabled");
  if (input.promotionExecutable) blockers.push("promotionExecutable is true");
  if (input.criticalOrHighIssues > 0) blockers.push("critical or high issue remains");
  if (!input.knownIssueClassified) blockers.push("known issue is unclassified");
  if (blockers.length === 0) return { recommendation: "READY_FOR_WAVE_5C_GIT_CLOSURE", blockers };
  return { recommendation: input.knownIssueClassified ? "CONDITIONALLY_READY_FOR_WAVE_5C" : "BLOCKED", blockers };
}