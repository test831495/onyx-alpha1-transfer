import type { AuthenticationAssurance, ConcurrentSessionPolicy, DeviceClassification } from "./model";
import type { PolicyVersion } from "@onyx/phase1a11-household-identity-runtime";

const assurances: AuthenticationAssurance[] = ["low", "standard", "strong"];
const devices: DeviceClassification[] = ["private", "trusted-shared", "untrusted-shared", "kiosk-like"];
export const SESSION_POLICY: ConcurrentSessionPolicy = { inactivityTimeoutMs: 30 * 60 * 1000, absoluteTimeoutMs: 8 * 60 * 60 * 1000, rotationIntervalMs: 60 * 60 * 1000, elevatedAssuranceTimeoutMs: 10 * 60 * 1000, allowedAssuranceLevels: ["standard", "strong"], sharedDeviceRestrictions: { classification: "trusted-shared", shorterInactivityMs: 10 * 60 * 1000, durableSessionAllowed: false, ownerHistoryNarrationAllowed: false, technicalInformationAllowed: false }, concurrentSessionLimit: 3, protectedOperationAssurance: "strong", auditRequired: true, policyVersion: "policy-1" };
export function validateSessionPolicy(policy: ConcurrentSessionPolicy, expectedVersion: PolicyVersion = "policy-1"): { valid: boolean; technicalReason: string } {
  if (!policy || policy.policyVersion !== expectedVersion) return { valid: false, technicalReason: "STALE_OR_UNKNOWN_POLICY_VERSION" };
  const durations = [policy.inactivityTimeoutMs, policy.absoluteTimeoutMs, policy.rotationIntervalMs, policy.elevatedAssuranceTimeoutMs];
  if (durations.some((value) => !Number.isFinite(value) || value < 0)) return { valid: false, technicalReason: "INVALID_POLICY_DURATION" };
  if (policy.inactivityTimeoutMs === 0 || policy.absoluteTimeoutMs === 0 || policy.rotationIntervalMs === 0 || policy.elevatedAssuranceTimeoutMs === 0) return { valid: false, technicalReason: "PROHIBITED_ZERO_DURATION" };
  if (policy.inactivityTimeoutMs > policy.absoluteTimeoutMs || policy.elevatedAssuranceTimeoutMs > policy.inactivityTimeoutMs) return { valid: false, technicalReason: "INVALID_POLICY_LIMITS" };
  if (!policy.allowedAssuranceLevels.length || policy.allowedAssuranceLevels.some((level) => !assurances.includes(level))) return { valid: false, technicalReason: "UNKNOWN_ASSURANCE_LEVEL" };
  if (!Number.isInteger(policy.concurrentSessionLimit) || policy.concurrentSessionLimit < 1) return { valid: false, technicalReason: "INVALID_CONCURRENT_SESSION_LIMIT" };
  if (!devices.includes(policy.sharedDeviceRestrictions.classification) || policy.sharedDeviceRestrictions.classification === "unknown") return { valid: false, technicalReason: "UNSUPPORTED_SHARED_DEVICE_CONFIGURATION" };
  return { valid: true, technicalReason: "POLICY_VALID" };
}
