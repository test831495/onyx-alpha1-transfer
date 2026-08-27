import { cloneFreeze, isSafeRecord } from "./factory-constitution";
import { isFactoryStage } from "./factory-stage";
export const FACTORY_MODES = ["DISABLED", "GOVERNANCE_ONLY", "READ_ONLY_INSPECTION", "READ_ONLY_EVIDENCE_COLLECTION", "READ_ONLY_VALIDATION_PLANNING", "READ_ONLY_DECISION_PACKAGE", "QUARANTINED", "EXPIRED"] as const;
export type FactoryOperatingMode = (typeof FACTORY_MODES)[number];
export const RESTRICTIVE_TRANSITION_REASONS = ["EXPIRY", "BUDGET_EXHAUSTED", "INTEGRITY_FAILURE", "UNKNOWN_POLICY", "POLICY_UNAVAILABLE", "AUDIT_UNAVAILABLE", "KILL_SWITCH", "PROHIBITED_CONTENT", "CONFLICTING_EVIDENCE"] as const;
export type RestrictiveTransitionReason = (typeof RESTRICTIVE_TRANSITION_REASONS)[number];
export type ModeTransition = { readonly from: FactoryOperatingMode; readonly to: FactoryOperatingMode; readonly reason: RestrictiveTransitionReason | "OWNER_PROMOTION" | "OWNER_DISABLE" };
export type ModeTransitionFacts = Readonly<{ currentMode: FactoryOperatingMode; requestedMode: FactoryOperatingMode; currentStage: string; actorAuthorityClassification: string; now: string; expiresAt: string; remainingBudget: number; integrityStatus: "VALID" | "FAILED"; policyStatus: "AVAILABLE" | "UNKNOWN" | "UNAVAILABLE"; auditStatus: "AVAILABLE" | "UNAVAILABLE"; killSwitch: boolean; evidenceConflict: boolean; prohibitedContent: boolean }>; 
export const TRANSITION_REASON_CODES = ["KILL_SWITCH_ACTIVE", "PROHIBITED_CONTENT", "INTEGRITY_FAILURE", "POLICY_UNKNOWN", "POLICY_UNAVAILABLE", "AUDIT_UNAVAILABLE", "EVIDENCE_CONFLICT", "TASK_EXPIRED", "BUDGET_EXHAUSTED", "ACTOR_AUTHORITY_INSUFFICIENT", "TRANSITION_ALLOWED_READ_ONLY", "INVALID_CURRENT_MODE", "INVALID_REQUESTED_MODE", "INVALID_FACTORY_STAGE", "INVALID_CURRENT_TIME", "INVALID_EXPIRY", "INVALID_BUDGET", "UNKNOWN_TRANSITION_FIELD", "OWNER_OR_GOVERNANCE_AUTHORITY_REQUIRED"] as const;
export type ModeTransitionAssessmentOutcome = "ALLOWED" | "RESTRICTED" | "REJECTED";
export type ModeTransitionAssessment = Readonly<{ outcome: ModeTransitionAssessmentOutcome; currentMode: FactoryOperatingMode; requestedMode: FactoryOperatingMode; effectiveMode: FactoryOperatingMode; reasonCodes: readonly string[]; subject: string; policyVersion: string; schemaVersion: string; createsAuthority: false; executesActions: false; mutatesState: false; authorityStatus: "NON_AUTHORIZING"; }>; 
const MODES = FACTORY_MODES as readonly string[];
const ALLOWED_ACTORS = new Set(["OWNER", "GOVERNANCE"]);
const hasAllFields = (input: Record<string, unknown>, fields: readonly string[]): boolean => fields.every((field) => Object.prototype.hasOwnProperty.call(input, field));
const parseTime = (value: unknown): number => (typeof value === "string" ? Date.parse(value) : Number.NaN);
const orderReasons = (reasons: readonly string[]): readonly string[] => [...reasons].sort((left, right) => TRANSITION_REASON_CODES.indexOf(left as never) - TRANSITION_REASON_CODES.indexOf(right as never));
export const isFactoryMode = (value: unknown): value is FactoryOperatingMode => typeof value === "string" && MODES.includes(value);
export const assessModeTransition = (input: unknown): ModeTransitionAssessment => {
  if (!isSafeRecord(input)) return cloneFreeze({ outcome: "REJECTED", currentMode: "GOVERNANCE_ONLY", requestedMode: "GOVERNANCE_ONLY", effectiveMode: "GOVERNANCE_ONLY", reasonCodes: ["UNKNOWN_TRANSITION_FIELD"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  const record = input as Record<string, unknown>;
  const aliasKey = "requestedMode" in record ? "requestedMode" : "proposedMode";
  const fields = ["currentMode", "currentStage", "actorAuthorityClassification", "now", "expiresAt", "remainingBudget", "integrityStatus", "policyStatus", "auditStatus", "killSwitch", "evidenceConflict", "prohibitedContent", aliasKey];
  if (Object.keys(record).some((key) => !fields.includes(key)) || !hasAllFields(record, fields)) {
    return cloneFreeze({ outcome: "REJECTED", currentMode: isFactoryMode(record.currentMode) ? (record.currentMode as FactoryOperatingMode) : "GOVERNANCE_ONLY", requestedMode: isFactoryMode(record.requestedMode ?? record.proposedMode) ? (record.requestedMode ?? record.proposedMode) as FactoryOperatingMode : "GOVERNANCE_ONLY", effectiveMode: "GOVERNANCE_ONLY", reasonCodes: ["UNKNOWN_TRANSITION_FIELD"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  }
  const currentMode = record.currentMode as FactoryOperatingMode; const requestedMode = (record[aliasKey] ?? record.requestedMode ?? record.proposedMode) as FactoryOperatingMode; const currentStage = String(record.currentStage ?? ""); const actorAuthorityClassification = String(record.actorAuthorityClassification ?? ""); const nowRaw = record.now; const expiresAtRaw = record.expiresAt; const remainingBudget = record.remainingBudget; const integrityStatus = String(record.integrityStatus ?? ""); const policyStatus = String(record.policyStatus ?? ""); const auditStatus = String(record.auditStatus ?? ""); const killSwitch = record.killSwitch === true; const evidenceConflict = record.evidenceConflict === true; const prohibitedContent = record.prohibitedContent === true;
  if (!isFactoryMode(currentMode)) return cloneFreeze({ outcome: "REJECTED", currentMode: "GOVERNANCE_ONLY", requestedMode: "GOVERNANCE_ONLY", effectiveMode: "GOVERNANCE_ONLY", reasonCodes: ["INVALID_CURRENT_MODE"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  if (!isFactoryMode(requestedMode)) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode: "GOVERNANCE_ONLY", effectiveMode: currentMode, reasonCodes: ["INVALID_REQUESTED_MODE"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  if (!isFactoryStage(currentStage)) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["INVALID_FACTORY_STAGE"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  const now = parseTime(nowRaw); const expiresAt = parseTime(expiresAtRaw);
  if (!Number.isFinite(now)) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["INVALID_CURRENT_TIME"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  if (!Number.isFinite(expiresAt)) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["INVALID_EXPIRY"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  if (typeof remainingBudget !== "number" || !Number.isFinite(remainingBudget) || remainingBudget < 0) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["INVALID_BUDGET"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  const actorAuthority = String(actorAuthorityClassification);
  const validAuthority = ["OWNER", "GOVERNANCE", "COLLABORATOR", "PLANNER", "EVIDENCE_COLLECTOR"].includes(actorAuthority);
  if (!validAuthority) return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["OWNER_OR_GOVERNANCE_AUTHORITY_REQUIRED"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  if (!["VALID", "FAILED"].includes(integrityStatus) || !["AVAILABLE", "UNKNOWN", "UNAVAILABLE"].includes(policyStatus) || !["AVAILABLE", "UNAVAILABLE"].includes(auditStatus) || typeof record.killSwitch !== "boolean" || typeof record.evidenceConflict !== "boolean" || typeof record.prohibitedContent !== "boolean") return cloneFreeze({ outcome: "REJECTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["UNKNOWN_TRANSITION_FIELD"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  const reasons: string[] = [];
  if (killSwitch) reasons.push("KILL_SWITCH_ACTIVE");
  if (prohibitedContent) reasons.push("PROHIBITED_CONTENT");
  if (integrityStatus === "FAILED") reasons.push("INTEGRITY_FAILURE");
  if (policyStatus === "UNKNOWN") reasons.push("POLICY_UNKNOWN");
  if (policyStatus === "UNAVAILABLE") reasons.push("POLICY_UNAVAILABLE");
  if (auditStatus === "UNAVAILABLE") reasons.push("AUDIT_UNAVAILABLE");
  if (evidenceConflict) reasons.push("EVIDENCE_CONFLICT");
  if (now >= expiresAt) reasons.push("TASK_EXPIRED");
  if (remainingBudget === 0) reasons.push("BUDGET_EXHAUSTED");
  if (!ALLOWED_ACTORS.has(actorAuthority)) reasons.push("ACTOR_AUTHORITY_INSUFFICIENT");
  const orderedReasons = orderReasons(reasons);
  if (orderedReasons.length > 0) {
    const effectiveMode = orderedReasons.includes("KILL_SWITCH_ACTIVE") ? "DISABLED" : orderedReasons.includes("PROHIBITED_CONTENT") ? "QUARANTINED" : orderedReasons.includes("INTEGRITY_FAILURE") ? "QUARANTINED" : orderedReasons.includes("POLICY_UNKNOWN") || orderedReasons.includes("POLICY_UNAVAILABLE") || orderedReasons.includes("AUDIT_UNAVAILABLE") || orderedReasons.includes("EVIDENCE_CONFLICT") ? "QUARANTINED" : orderedReasons.includes("TASK_EXPIRED") || orderedReasons.includes("BUDGET_EXHAUSTED") ? "EXPIRED" : currentMode;
    return cloneFreeze({ outcome: "RESTRICTED", currentMode, requestedMode, effectiveMode, reasonCodes: orderedReasons, subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  }
  const allowed = ALLOWED_ACTORS.has(actorAuthority) && (requestedMode === "READ_ONLY_INSPECTION" || requestedMode === "READ_ONLY_EVIDENCE_COLLECTION" || requestedMode === "READ_ONLY_VALIDATION_PLANNING" || requestedMode === "READ_ONLY_DECISION_PACKAGE");
  if (!allowed) {
    return cloneFreeze({ outcome: "RESTRICTED", currentMode, requestedMode, effectiveMode: currentMode, reasonCodes: ["ACTOR_AUTHORITY_INSUFFICIENT"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
  }
  return cloneFreeze({ outcome: "ALLOWED", currentMode, requestedMode, effectiveMode: requestedMode, reasonCodes: ["TRANSITION_ALLOWED_READ_ONLY"], subject: "mode-transition", policyVersion: "1.0.0", schemaVersion: "1.0.0", createsAuthority: false, executesActions: false, mutatesState: false, authorityStatus: "NON_AUTHORIZING" } as const);
};
export const validateModeTransition = (input: unknown): boolean => {
  if (!isSafeRecord(input)) return false;
  const transition = input as Partial<ModeTransition> & Partial<ModeTransitionFacts> & { proposedMode?: FactoryOperatingMode };
  if ("currentMode" in transition || "proposedMode" in transition) {
    const legacyTransition = "proposedMode" in transition;
    const { proposedMode: _proposedMode, ...withoutLegacyAlias } = transition;
    const normalized = { ...withoutLegacyAlias, requestedMode: transition.requestedMode ?? transition.proposedMode };
    const assessment = assessModeTransition(normalized);
    return assessment.outcome === "ALLOWED" || (legacyTransition && assessment.outcome === "RESTRICTED" && !assessment.reasonCodes.includes("ACTOR_AUTHORITY_INSUFFICIENT"));
  }
  if (Object.keys(transition).length !== 3 || Object.keys(transition).some((key) => !["from", "to", "reason"].includes(key)) || !isFactoryMode(transition.from) || !isFactoryMode(transition.to) || typeof transition.reason !== "string") return false;
  if (["EXPIRY", "BUDGET_EXHAUSTED", "INTEGRITY_FAILURE", "UNKNOWN_POLICY", "POLICY_UNAVAILABLE", "AUDIT_UNAVAILABLE", "KILL_SWITCH", "PROHIBITED_CONTENT", "CONFLICTING_EVIDENCE"].includes(transition.reason)) return ["EXPIRED", "QUARANTINED", "DISABLED"].includes(transition.to);
  return transition.reason === "OWNER_DISABLE" ? transition.to === "DISABLED" : transition.reason === "OWNER_PROMOTION" && transition.from === "GOVERNANCE_ONLY" && ["READ_ONLY_INSPECTION", "READ_ONLY_EVIDENCE_COLLECTION", "READ_ONLY_VALIDATION_PLANNING", "READ_ONLY_DECISION_PACKAGE"].includes(transition.to);
};
