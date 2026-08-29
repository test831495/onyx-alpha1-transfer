export type MergeReadinessInput = Readonly<Record<string, boolean>>;
export type MergeReadinessResult = Readonly<{ outcome: "TECHNICALLY_READY" | "GOVERNANCE_BLOCKED" | "APPROVAL_REQUIRED" | "THREAD_RESOLUTION_REQUIRED" | "CHECKS_PENDING" | "FINDING_REMEDIATION_REQUIRED" | "TARGET_DRIFT" | "NOT_ASSESSABLE"; authority: "NON_AUTHORIZING" }>;
export type MainClosureInput = Readonly<Record<string, boolean>>;
export type MainClosureResult = Readonly<{ outcome: "MAIN_CLOSED" | "NOT_ASSESSABLE"; authority: "NON_AUTHORIZING" }>;
const nonAuthorizing = <T extends string>(outcome: T): Readonly<{ outcome: T; authority: "NON_AUTHORIZING" }> => Object.freeze({ outcome, authority: "NON_AUTHORIZING" });

export const assessMergeReadiness = (input: MergeReadinessInput): MergeReadinessResult => {
  if (!input || input.prOpen !== true || input.draft !== false || input.conflicts !== false || input.rulesetVisible !== true) return nonAuthorizing("NOT_ASSESSABLE");
  if (input.targetExact !== true || input.headFresh !== true || input.commitScopeValid !== true) return nonAuthorizing("TARGET_DRIFT");
  if (input.checksPassed !== true) return nonAuthorizing("CHECKS_PENDING");
  if (input.threadsResolved !== true) return nonAuthorizing("THREAD_RESOLUTION_REQUIRED");
  if (input.findingsClosed !== true || input.coverageComplete !== true || input.evidenceFresh !== true) return nonAuthorizing("FINDING_REMEDIATION_REQUIRED");
  if (input.approvalsPresent !== true || input.ownerAuthorization !== true) return nonAuthorizing("APPROVAL_REQUIRED");
  return nonAuthorizing("TECHNICALLY_READY");
};

export const assessMainClosure = (input: MainClosureInput): MainClosureResult => {
  const required = ["prMergedClosed", "mainLineage", "commitsReachable", "fileScopeIncorporated", "validationCurrent", "finalMarker", "handoff"];
  return required.every((key) => input?.[key] === true) && input.unauthorizedReleaseClaim === false ? nonAuthorizing("MAIN_CLOSED") : nonAuthorizing("NOT_ASSESSABLE");
};

export const verifyLifecycle = (input: Readonly<{ outcome: "PASS" | "FAIL" | "NOT_ASSESSABLE" }>): Readonly<{ outcome: "PASS" | "FAIL" | "NOT_ASSESSABLE"; authority: "NON_AUTHORIZING" }> => nonAuthorizing(input?.outcome ?? "NOT_ASSESSABLE");