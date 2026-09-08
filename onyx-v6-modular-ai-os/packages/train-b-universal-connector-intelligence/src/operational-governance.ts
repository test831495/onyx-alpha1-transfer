export type B1OperationalState = Readonly<{
  adapterId: string;
  health: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  freshness: "CURRENT" | "STALE" | "UNKNOWN";
  quota: "AVAILABLE" | "LIMITED" | "EXHAUSTED" | "UNKNOWN";
  cost: "KNOWN" | "UNKNOWN" | "EXPIRED";
  revoked: boolean;
  recoverable: boolean;
  enabled: false;
  nonAuthorizing: true;
}>;

export type B1FeatureFlag = Readonly<{
  flagId: string;
  owner: "RAHUL";
  purpose: string;
  defaultState: "OFF";
  createdOn: string;
  reviewOn: string;
  dependencies: readonly string[];
  killSwitchState: "OFF";
  activationAllowed: false;
  removalCondition: string;
}>;

export type B1Budgets = Readonly<{
  maximumProviders: 4;
  maximumApplications: 12;
  maximumPagesPerProvider: 5;
  maximumResultsPerProvider: 50;
  maximumNormalizedResults: 150;
  maximumAdmittedEvidenceItems: 100;
  maximumFactualClaims: 40;
  maximumCitations: 120;
  maximumDuplicateGroupMembers: 20;
  maximumConflictGroupMembers: 20;
  maximumAutomaticRetries: 1;
  maximumProviderDeadlineMs: 6000;
  maximumCancellationReflectionMs: 500;
}>;

export const B1_BUDGETS: B1Budgets = Object.freeze({
  maximumProviders: 4,
  maximumApplications: 12,
  maximumPagesPerProvider: 5,
  maximumResultsPerProvider: 50,
  maximumNormalizedResults: 150,
  maximumAdmittedEvidenceItems: 100,
  maximumFactualClaims: 40,
  maximumCitations: 120,
  maximumDuplicateGroupMembers: 20,
  maximumConflictGroupMembers: 20,
  maximumAutomaticRetries: 1,
  maximumProviderDeadlineMs: 6000,
  maximumCancellationReflectionMs: 500,
});

export const B1_FEATURE_FLAGS: readonly B1FeatureFlag[] = Object.freeze([
  Object.freeze({ flagId: "b1.universal-connector-intelligence", owner: "RAHUL", purpose: "Synthetic B1 Search and Synthesis rehearsal", defaultState: "OFF", createdOn: "2026-09-08", reviewOn: "2026-12-07", dependencies: Object.freeze(["synthetic-fixtures", "owner-review"]), killSwitchState: "OFF", activationAllowed: false, removalCondition: "Remove after approved provider activation replaces synthetic rehearsal." }),
]);

export function projectOperationalState(input: Omit<B1OperationalState, "enabled" | "nonAuthorizing">): B1OperationalState {
  return Object.freeze({ ...input, enabled: false, nonAuthorizing: true });
}