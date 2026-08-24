import { BUDGET_POLICY_VERSION, CAPABILITY_POLICY_VERSION, MODE_CAPABILITY_MATRIX, MODE_POLICY_VERSION, MODE_NAMES, validateModeBudget, validateModeName } from "./mode-policy";

export interface ModeTransitionRequest {
  requestId: string;
  currentMode: string;
  requestedMode: string;
  account: string;
  session: string;
  assurance: string;
  purpose: string;
  reason: string;
  effectiveTime: string;
  expiry: string;
  modePolicyVersion: string;
  capabilityPolicyVersion: string;
  budgetPolicyVersion: string;
  auditRequirement: boolean;
  rollbackMode: string;
  evidenceReference: string;
}

export interface ModeTransitionResult {
  allowed: boolean;
  previousMode: string;
  effectiveMode: string;
  status: string;
  preservedStateManifest: string[];
  reducedCapabilityManifest: string[];
  suspendedCapabilityManifest: string[];
  reactivationValidationManifest: string[];
  rollbackProjection: string[];
  friendlyExplanation: string;
  safeNextAction: string;
  technicalReasons: string[];
  auditEvent: string;
  evidenceReference: string;
}

const SUPPORTED_ASSURANCE = ["standard", "strong", "step-up"];

export function evaluateModeTransition(request: Partial<ModeTransitionRequest>, auditAvailable: boolean): ModeTransitionResult {
  const validation = validateModeTransitionRequest(request);
  if (!validation.valid) {
    return result(false, request.currentMode ?? "unknown", request.requestedMode ?? "unknown", "denied", ["request-invalid"], ["request-invalid"], ["request-invalid"], ["request-invalid"], "The mode transition request is incomplete or invalid.", "Provide a complete current transition request.", [validation.reason], auditAvailable ? "mode-audit-created" : "mode-audit-unavailable", request.evidenceReference ?? "evidence-missing");
  }
  const validatedRequest = request as ModeTransitionRequest;
  if (!auditAvailable) {
    return result(false, validatedRequest.currentMode, validatedRequest.requestedMode, "denied", ["audit"], ["audit"], ["audit"], ["audit"], "Audit is unavailable, so the transition is denied.", "Restore audit and retry the transition.", ["AUDIT_UNAVAILABLE"], "mode-audit-unavailable", validatedRequest.evidenceReference);
  }
  if (validatedRequest.currentMode === validatedRequest.requestedMode) {
    return result(true, validatedRequest.currentMode, validatedRequest.requestedMode, "unchanged", ["canonical-data-preserved"], [], [], ["session-revalidated"], "The mode remains the same and no capability change is applied.", "Continue under the current mode with validation.", ["MODE_UNCHANGED"], "mode-audit-created", validatedRequest.evidenceReference);
  }
  return result(true, validatedRequest.currentMode, validatedRequest.requestedMode, "effective", ["canonical-data-preserved", "sessions-revalidated", "connectors-preserved", "audit-evidence-preserved"], ["reduced-capabilities-in-effect"], ["suspended-capabilities-in-effect"], ["session-authority-revalidated"], "Mode transition was accepted and preserves canonical state.", "Continue under the new mode with regular revalidation checks.", ["MODE_TRANSITION_ACCEPTED"], "mode-audit-created", validatedRequest.evidenceReference);
}

export function result(
  allowed: boolean,
  previousMode: string,
  effectiveMode: string,
  status: string,
  preservedStateManifest: string[],
  reducedCapabilityManifest: string[],
  suspendedCapabilityManifest: string[],
  reactivationValidationManifest: string[],
  friendlyExplanation: string,
  safeNextAction: string,
  technicalReasons: string[],
  auditEvent: string,
  evidenceReference: string
): ModeTransitionResult {
  return {
    allowed,
    previousMode,
    effectiveMode,
    status,
    preservedStateManifest,
    reducedCapabilityManifest,
    suspendedCapabilityManifest,
    reactivationValidationManifest,
    rollbackProjection: ["rollback-projection-only", "canonical-state-preserved"],
    friendlyExplanation,
    safeNextAction,
    technicalReasons,
    auditEvent,
    evidenceReference
  };
}

export function validateModeTransitionRequest(request: Partial<ModeTransitionRequest>): { valid: boolean; reason: string } {
  if (!request.requestId || !request.currentMode || !request.requestedMode) return { valid: false, reason: "MODE_REQUEST_INCOMPLETE" };
  if (!validateModeName(String(request.currentMode))) return { valid: false, reason: "CURRENT_MODE_INVALID" };
  if (!validateModeName(String(request.requestedMode))) return { valid: false, reason: "REQUESTED_MODE_INVALID" };
  if (!request.account) return { valid: false, reason: "REQUESTING_ACCOUNT_MISSING" };
  if (!request.session) return { valid: false, reason: "SESSION_REFERENCE_MISSING" };
  if (!request.assurance || !SUPPORTED_ASSURANCE.includes(String(request.assurance))) return { valid: false, reason: "ASSURANCE_UNSUPPORTED" };
  if (!request.purpose) return { valid: false, reason: "PURPOSE_MISSING" };
  if (!request.reason) return { valid: false, reason: "REASON_MISSING" };
  if (!request.effectiveTime || Number.isNaN(new Date(request.effectiveTime).getTime())) return { valid: false, reason: "INVALID_EFFECTIVE_TIME" };
  if (!request.expiry || Number.isNaN(new Date(request.expiry).getTime())) return { valid: false, reason: "INVALID_EXPIRY" };
  if (new Date(request.expiry).getTime() <= new Date(request.effectiveTime).getTime()) return { valid: false, reason: "EXPIRY_NOT_AFTER_EFFECTIVE_TIME" };
  if (request.modePolicyVersion !== MODE_POLICY_VERSION) return { valid: false, reason: "MODE_POLICY_VERSION_MISMATCH" };
  if (request.capabilityPolicyVersion !== CAPABILITY_POLICY_VERSION) return { valid: false, reason: "CAPABILITY_POLICY_VERSION_MISMATCH" };
  if (request.budgetPolicyVersion !== BUDGET_POLICY_VERSION) return { valid: false, reason: "BUDGET_POLICY_VERSION_MISMATCH" };
  if (typeof request.auditRequirement !== "boolean") return { valid: false, reason: "AUDIT_REQUIREMENT_INVALID" };
  if (!request.rollbackMode || !validateModeName(String(request.rollbackMode))) return { valid: false, reason: "ROLLBACK_MODE_INVALID" };
  if (!request.evidenceReference) return { valid: false, reason: "EVIDENCE_REFERENCE_MISSING" };
  return { valid: true, reason: "MODE_TRANSITION_REQUEST_VALID" };
}

export function validateBudgetEnvelope(bundle: Record<string, any>): { valid: boolean; reason: string } {
  if (!bundle || typeof bundle !== "object") return { valid: false, reason: "BUDGET_BUNDLE_MISSING" };
  const ok = validateModeBudget(bundle);
  return ok ? { valid: true, reason: "BUDGET_ENVIRONMENT_VALID" } : { valid: false, reason: "BUDGET_ENVIRONMENT_INVALID" };
}

export function getModeCapabilities(mode: string): Record<string, string> {
  if (!validateModeName(mode)) return { unknown: "unknown" };
  return MODE_CAPABILITY_MATRIX[mode as keyof typeof MODE_CAPABILITY_MATRIX];
}
