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
  killSwitchState: "OFF";
  activationAllowed: false;
}>;

export const B1_FEATURE_FLAGS: readonly B1FeatureFlag[] = Object.freeze([
  Object.freeze({ flagId: "b1.universal-connector-intelligence", owner: "RAHUL", purpose: "Synthetic B1 Search and Synthesis rehearsal", defaultState: "OFF", killSwitchState: "OFF", activationAllowed: false }),
]);

export function projectOperationalState(input: Omit<B1OperationalState, "enabled" | "nonAuthorizing">): B1OperationalState {
  return Object.freeze({ ...input, enabled: false, nonAuthorizing: true });
}