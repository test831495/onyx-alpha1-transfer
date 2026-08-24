export const STALE_AUTHORITY_STATES = [
  "expired-session",
  "revoked-session",
  "replaced-session",
  "consumed-approval",
  "expired-approval",
  "malformed-approval",
  "replayed-approval",
  "revoked-connector",
  "suspended-role",
  "disabled-account",
  "expired-membership",
  "stale-delegation",
  "revoked-delegation",
  "expired-step-up-grant",
  "expired-break-glass-grant",
  "consumed-break-glass-grant",
  "invalid-recovery-grant",
  "unknown-authority-status"
] as const;

export type StaleAuthorityState = (typeof STALE_AUTHORITY_STATES)[number];

export interface RestorationDecision {
  allowed: boolean;
  mode: string;
  state: string;
  authorityRestored: false;
  technicalReason: string;
  auditRequired: true;
}

export function evaluateCapabilityRestoration(input: {
  requestedMode: string;
  authorityState: string;
  auditAvailable: boolean;
}): RestorationDecision {
  if (!input.auditAvailable) return denied(input.requestedMode, input.authorityState, "AUDIT_UNAVAILABLE");
  if (input.authorityState !== "active") return denied(input.requestedMode, input.authorityState, "AUTHORITY_REVALIDATION_REQUIRED");
  if (!["ACTIVE", "LIGHT"].includes(input.requestedMode)) return denied(input.requestedMode, input.authorityState, "MODE_RESTORATION_UNSUPPORTED");
  return { allowed: true, mode: input.requestedMode, state: input.authorityState, authorityRestored: false, technicalReason: "CAPABILITY_ONLY_RESTORATION", auditRequired: true };
}

function denied(mode: string, state: string, technicalReason: string): RestorationDecision {
  return { allowed: false, mode, state, authorityRestored: false, technicalReason, auditRequired: true };
}
