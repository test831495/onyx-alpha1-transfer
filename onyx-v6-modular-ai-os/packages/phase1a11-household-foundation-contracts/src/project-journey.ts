export type JourneyClassification =
  | "milestone"
  | "decision"
  | "implementation_episode"
  | "architectural_change"
  | "functional_capability"
  | "code_change_summary"
  | "design_decision"
  | "validation_result"
  | "known_limitation"
  | "recovery_checkpoint"
  | "lesson_learned"
  | "phase_summary"
  | "evidence_reference"
  | "roadmap_change"
  | "owner_approval";

export type JourneySource =
  | "architecture_document"
  | "architecture_decision_record"
  | "phase_report"
  | "wave_report"
  | "acceptance_registry"
  | "validation_evidence"
  | "recovery_document"
  | "known_limitations_record"
  | "git_commit"
  | "git_tag"
  | "pull_request_metadata"
  | "approved_issue_metadata"
  | "approved_implementation_summary"
  | "approved_design_summary";

export interface JourneyRetrievalInput {
  authenticatedAccountId: string;
  role: string;
  ownerHistoryPermission: boolean;
  sessionValid: boolean;
  policyCurrent: boolean;
  hasExplicitIntent: boolean;
  targetClassification: "detailed" | "basic" | "denied";
  auditAvailable: boolean;
}

export function canAccessDetailedJourney(input: JourneyRetrievalInput): boolean {
  return (
    input.authenticatedAccountId === "rahul" &&
    input.role === "primary_owner" &&
    input.ownerHistoryPermission === true &&
    input.sessionValid === true &&
    input.policyCurrent === true &&
    input.hasExplicitIntent === true &&
    input.targetClassification === "detailed" &&
    input.auditAvailable === true
  );
}

export type MissingContextValue = "NOT_RECORDED" | "NOT_VERIFIED";

const HIST016_MISSING_VALUES = new Set<MissingContextValue | string>([
  "NOT_RECORDED",
  "NOT_VERIFIED",
  "not_recorded",
  "not_verified",
]);

function isExplicitMissingValue(value: string | undefined): boolean {
  if (value === undefined || value === null) return true;
  const normalized = value.trim();
  return normalized.length === 0 || HIST016_MISSING_VALUES.has(normalized) || HIST016_MISSING_VALUES.has(normalized.toUpperCase());
}

export interface HIST016ContextInput {
  participant?: string;
  approver?: string;
  executor?: string;
  reviewer?: string;
  evidenceProducer?: string;
  recorder?: string;
  plannedWork?: string;
  changedWork?: string;
  decision?: string;
  validation?: string;
  release?: string;
  deferral?: string;
  recovery?: string;
  correction?: string;
  supersession?: string;
  sourceEventTime?: string;
  recordingTime?: string;
  ingestionTime?: string;
  summarizationTime?: string;
  correctionTime?: string;
  retrievalTime?: string;
  rationale?: string;
  alternatives?: string;
  constraints?: string;
  context?: string;
  decisionDrivers?: string;
  result?: string;
  evidenceSourceType?: string;
  sourceReference?: string;
  sourceVersion?: string;
  sourceHash?: string;
  classification?: string;
  accessPolicy?: string;
  provenance?: string;
  evidenceStatus?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateHIST016Context(input: HIST016ContextInput): ValidationResult {
  const errors: string[] = [];

  const requiredFields: Array<keyof HIST016ContextInput> = [
    "participant",
    "approver",
    "executor",
    "plannedWork",
    "changedWork",
    "rationale",
    "sourceEventTime",
    "result",
  ];

  for (const field of requiredFields) {
    const value = input[field];
    if (isExplicitMissingValue(value)) {
      errors.push(`${String(field)} is required and must use an explicit typed missing-value state when unavailable`);
      continue;
    }
  }

  if (input.sourceReference && /secret|token|key|credential|session/i.test(input.sourceReference)) {
    errors.push("sourceReference cannot contain secret-like content");
  }

  const evidenceFields: Array<keyof HIST016ContextInput> = [
    "evidenceSourceType",
    "sourceReference",
    "classification",
    "accessPolicy",
    "provenance",
    "evidenceStatus",
  ];

  const evidenceProvided = evidenceFields.some((field) => {
    const value = input[field];
    return value !== undefined && value !== null && value.trim().length > 0;
  });

  if (evidenceProvided) {
    for (const field of evidenceFields) {
      const value = input[field];
      if (value === undefined || value === null || value.trim().length === 0) {
        if (!isExplicitMissingValue(value)) {
          errors.push(`${String(field)} is required when evidence metadata is present`);
        }
      }
    }
  }

  if (input.recordingTime && input.sourceEventTime && input.recordingTime !== "NOT_RECORDED" && input.recordingTime !== "not_recorded" && input.recordingTime === input.sourceEventTime) {
    errors.push("recordingTime must remain distinct from sourceEventTime when both are recorded");
  }

  if (input.validation && !HIST016_MISSING_VALUES.has(input.validation) && !HIST016_MISSING_VALUES.has(input.validation.toUpperCase())) {
    if (input.validation.trim().length === 0) {
      errors.push("validation must not be blank");
    }
  }

  return { ok: errors.length === 0, errors };
}
