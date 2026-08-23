import { validateIdentity } from "@onyx/phase1a11-household-identity-runtime";
import { friendlySessionLabel } from "./labels";
import type { SessionEvaluationInput, SessionEvaluationResult, SessionRecord, StepUpGrant } from "./model";
const time = (value: string): number => new Date(value).getTime();
const invalid = (code: string, input: SessionEvaluationInput, status: SessionRecord["status"] = "invalid"): SessionEvaluationResult => ({ allowed: false, status, decisionCode: code, title: friendlySessionLabel(code), explanation: friendlySessionLabel(code), workPreserved: true, safeNextAction: "Verify your identity and try again.", technicalReason: code, rotationRequired: false, reauthenticationRequired: true, stepUpRequired: false, accountSwitchRequired: code === "ACCOUNT_SWITCH_REQUIRED", auditRequired: input.session.audit.required, versionReferences: input.expectedVersions });
export function evaluateSession(input: SessionEvaluationInput): SessionEvaluationResult {
  const values = [input.currentTime, input.session.timing.createdAt, input.session.timing.lastActivityAt, input.session.timing.inactivityDeadline, input.session.timing.absoluteDeadline, input.session.timing.rotationAt, input.session.revocationTime].filter(Boolean) as string[];
  if (values.some((value) => Number.isNaN(time(value)))) return invalid("INVALID_SESSION_TIME", input);
  const now = time(input.currentTime), created = time(input.session.timing.createdAt);
  if (created > now || time(input.session.timing.lastActivityAt) < created || time(input.session.timing.lastActivityAt) > now || time(input.session.timing.inactivityDeadline) < created || time(input.session.timing.absoluteDeadline) < created || time(input.session.timing.rotationAt) < created) return invalid("INVALID_SESSION_TIME", input);
  if (!validateIdentity(input.identity, input.currentTime).valid) return invalid("INVALID_IDENTITY", input);
  if (input.session.binding.accountId !== input.identity.account.accountId || input.session.binding.householdId !== input.identity.householdId || input.session.binding.membershipId !== input.identity.membership.membershipId) return invalid("ACCOUNT_SWITCH_REQUIRED", input);
  if (input.session.status === "revoked") return invalid("SESSION_REVOKED", input, "revoked");
  if (input.session.status === "replaced") return invalid("SESSION_REPLACED", input, "replaced");
  if (input.session.status === "expired-by-inactivity" || now >= time(input.session.timing.inactivityDeadline)) return invalid("SESSION_EXPIRED_INACTIVITY", input, "expired-by-inactivity");
  if (input.session.status === "expired-by-absolute-limit" || now >= time(input.session.timing.absoluteDeadline)) return invalid("SESSION_EXPIRED_ABSOLUTE", input, "expired-by-absolute-limit");
  if (input.session.status !== "active" && input.session.status !== "elevated" && input.session.status !== "rotation-required") return invalid("UNKNOWN_SESSION_STATUS", input);
  if (JSON.stringify(input.session.versions) !== JSON.stringify(input.expectedVersions)) return invalid("STALE_SESSION_VERSION", input);
  if (input.deviceClassification === "unknown" || (input.deviceClassification !== "private" && input.session.sharedDevice !== input.deviceClassification)) return invalid("SHARED_DEVICE_RESTRICTED", input);
  const rotation = now >= time(input.session.timing.rotationAt) || input.session.status === "rotation-required";
  if (input.session.audit.required && !input.auditAvailable) return invalid("AUDIT_UNAVAILABLE", input);
  if (input.requiredAssurance && ({ low: 1, standard: 2, strong: 3 }[input.session.status === "elevated" ? "strong" : "standard"] ?? 0) < ({ low: 1, standard: 2, strong: 3 }[input.requiredAssurance as "low" | "standard" | "strong"] ?? 99)) { const result = invalid("STEP_UP_REQUIRED", input); result.stepUpRequired = true; return result; }
  return { allowed: true, status: input.session.status, decisionCode: "SESSION_ACTIVE", title: friendlySessionLabel("SESSION_ACTIVE"), explanation: "Your verified session is active.", workPreserved: true, safeNextAction: "Continue.", technicalReason: "SESSION_ACTIVE", rotationRequired: rotation, reauthenticationRequired: false, stepUpRequired: false, accountSwitchRequired: false, auditRequired: input.session.audit.required, versionReferences: input.expectedVersions };
}
export function evaluateStepUp(session: SessionRecord, grant: StepUpGrant, currentTime: string, operation: string, accountId: string, purpose: string, scope: string): SessionEvaluationResult {
  const base: SessionEvaluationInput = { session, identity: { householdId: session.binding.householdId, account: { accountId: session.binding.accountId, status: "active", identityKind: "human" }, membership: { membershipId: session.binding.membershipId, householdId: session.binding.householdId, accountId: session.binding.accountId, roleId: session.binding.roleId, status: "active", roleVersion: session.versions.roleVersion } }, currentTime, expectedVersions: session.versions, deviceClassification: session.sharedDevice, auditAvailable: true };
  if (grant.accountId !== accountId || grant.sessionId !== session.sessionId || grant.protectedOperation !== operation || grant.purpose !== purpose || grant.resourceScope !== scope || Number.isNaN(time(grant.expiresAt)) || time(grant.expiresAt) <= time(currentTime) || time(grant.createdAt) < time(session.timing.createdAt) || time(grant.expiresAt) > time(session.timing.absoluteDeadline)) return invalid("STEP_UP_REQUIRED", base);
  return { ...evaluateSession(base), status: "elevated", decisionCode: "STEP_UP_GRANTED", title: "Session active", explanation: "Your verified step-up applies to this protected operation.", technicalReason: "STEP_UP_GRANTED" };
}
