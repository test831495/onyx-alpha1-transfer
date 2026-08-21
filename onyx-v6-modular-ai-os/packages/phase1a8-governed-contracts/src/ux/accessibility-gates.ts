import { ACCESSIBILITY_GATE_CONTRACT_VERSION } from "../shared/versions";

export const ACCESSIBILITY_GATE_IDS = [
  "KEYBOARD_NAVIGATION",
  "SCREEN_READER_SEMANTICS",
  "FOCUS_MANAGEMENT",
  "RESPONSIVE_REFLOW",
  "WCAG_AA_CONTRAST",
  "REDUCED_MOTION",
  "CLEAR_ERROR_IDENTIFICATION",
  "STATUS_ANNOUNCEMENTS",
  "ACCESSIBLE_APPROVAL_RISK",
  "ACCESSIBLE_RECOVERY_CONTROLS",
] as const;
export type AccessibilityGateId = (typeof ACCESSIBILITY_GATE_IDS)[number];

export const ACCESSIBILITY_GATE_RESULTS = ["PASS", "FAIL", "NOT_EVALUATED", "NOT_APPLICABLE", "BLOCKED", "REQUIRES_REMEDIATION"] as const;
export type AccessibilityGateResult = (typeof ACCESSIBILITY_GATE_RESULTS)[number];

export interface AccessibilityGateContract {
  gateId: AccessibilityGateId;
  screenId: string;
  requirement: string;
  evaluationMethod: string;
  result: AccessibilityGateResult;
  failureDetails: string[];
  evidenceReferences: string[];
  evaluatedAt: string;
  justification?: string;
  contractVersion: string;
}

export function createAccessibilityGate(input: Partial<AccessibilityGateContract> & { gateId?: AccessibilityGateId; screenId?: string; requirement?: string; evaluationMethod?: string; result?: AccessibilityGateResult; failureDetails?: string[]; evidenceReferences?: string[]; evaluatedAt?: string; justification?: string; contractVersion?: string }): AccessibilityGateContract {
  const gateId = input.gateId ?? "KEYBOARD_NAVIGATION";
  if (!(ACCESSIBILITY_GATE_IDS as readonly string[]).includes(gateId)) {
    throw new Error(`Unknown accessibility gate ID: ${gateId}`);
  }
  if (input.result === "NOT_APPLICABLE" && !(input.justification && input.justification.trim().length > 0)) {
    throw new Error("NOT_APPLICABLE requires explicit justification.");
  }
  return {
    gateId,
    screenId: input.screenId ?? "DASHBOARD",
    requirement: input.requirement ?? "Keyboard access",
    evaluationMethod: input.evaluationMethod ?? "manual-review",
    result: input.result ?? "PASS",
    failureDetails: input.failureDetails ?? [],
    evidenceReferences: input.evidenceReferences ?? ["evidence-1"],
    evaluatedAt: input.evaluatedAt ?? "2026-01-01T00:00:00.000Z",
    justification: input.justification,
    contractVersion: input.contractVersion ?? ACCESSIBILITY_GATE_CONTRACT_VERSION,
  };
}

export function makeAccessibilityGate(gateId: AccessibilityGateId, screenId: string, result: AccessibilityGateResult, justification?: string): AccessibilityGateContract {
  return createAccessibilityGate({ gateId, screenId, requirement: gateId, evaluationMethod: "deterministic-contract", result, failureDetails: result === "FAIL" ? ["failure"] : [], evidenceReferences: ["evidence-1"], evaluatedAt: "2026-01-01T00:00:00.000Z", justification, contractVersion: ACCESSIBILITY_GATE_CONTRACT_VERSION });
}

export function assertMandatoryAccessibilityGate(screenId: string, gateId: AccessibilityGateId): void {
  if (!screenId || !gateId) {
    throw new Error("Mandatory accessibility gate requires screen and gate IDs.");
  }
}

export interface ReleaseGateEvaluation {
  evaluationId: string;
  screenIds: string[];
  gateIds: string[];
  passedGateIds: string[];
  failedGateIds: string[];
  notEvaluatedGateIds: string[];
  blockedGateIds: string[];
  remediationGateIds: string[];
  notApplicableGateIds: string[];
  releaseAllowed: boolean;
  decisionReasons: string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateReleaseGates(
  gates: readonly AccessibilityGateContract[],
  screenIds: readonly string[],
  requiredScreenIds: readonly string[],
  requiredGateIds: readonly string[],
): ReleaseGateEvaluation {
  const passedGateIds = gates.filter((gate) => gate.result === "PASS").map((gate) => gate.gateId);
  const failedGateIds = gates.filter((gate) => gate.result === "FAIL").map((gate) => gate.gateId);
  const notEvaluatedGateIds = gates.filter((gate) => gate.result === "NOT_EVALUATED").map((gate) => gate.gateId);
  const blockedGateIds = gates.filter((gate) => gate.result === "BLOCKED").map((gate) => gate.gateId);
  const remediationGateIds = gates.filter((gate) => gate.result === "REQUIRES_REMEDIATION").map((gate) => gate.gateId);
  const notApplicableGateIds = gates.filter((gate) => gate.result === "NOT_APPLICABLE").map((gate) => gate.gateId);

  const missingScreens = requiredScreenIds.filter((screenId) => !screenIds.includes(screenId));
  const missingGates = requiredGateIds.filter((gateId) => !gates.some((gate) => gate.gateId === gateId));
  const badNotApplicable = gates.filter((gate) => gate.result === "NOT_APPLICABLE" && (!gate.justification || gate.justification.trim().length === 0));
  const reasons: string[] = [];
  if (missingScreens.length > 0) reasons.push(`Missing mandatory screens: ${missingScreens.join(", ")}`);
  if (missingGates.length > 0) reasons.push(`Missing mandatory gates: ${missingGates.join(", ")}`);
  if (failedGateIds.length > 0) reasons.push(`Failed gates: ${failedGateIds.join(", ")}`);
  if (notEvaluatedGateIds.length > 0) reasons.push(`Not evaluated: ${notEvaluatedGateIds.join(", ")}`);
  if (blockedGateIds.length > 0) reasons.push(`Blocked gates: ${blockedGateIds.join(", ")}`);
  if (remediationGateIds.length > 0) reasons.push(`Requires remediation: ${remediationGateIds.join(", ")}`);
  if (badNotApplicable.length > 0) reasons.push("NOT_APPLICABLE results require justification.");

  const releaseAllowed = missingScreens.length === 0 && missingGates.length === 0 && failedGateIds.length === 0 && notEvaluatedGateIds.length === 0 && blockedGateIds.length === 0 && remediationGateIds.length === 0 && badNotApplicable.length === 0;
  return {
    evaluationId: "release-eval-1",
    screenIds: [...screenIds],
    gateIds: [...requiredGateIds],
    passedGateIds,
    failedGateIds,
    notEvaluatedGateIds,
    blockedGateIds,
    remediationGateIds,
    notApplicableGateIds,
    releaseAllowed,
    decisionReasons: reasons,
    evaluatedAt: "2026-01-01T00:00:00.000Z",
    contractVersion: ACCESSIBILITY_GATE_CONTRACT_VERSION,
  };
}

export function assertAccessibilityReleaseEvaluation(evaluation: ReleaseGateEvaluation): void {
  if (!evaluation.releaseAllowed) {
    throw new Error(`Release denied: ${evaluation.decisionReasons.join("; ") || "unknown accessiblity blocking condition"}`);
  }
}
