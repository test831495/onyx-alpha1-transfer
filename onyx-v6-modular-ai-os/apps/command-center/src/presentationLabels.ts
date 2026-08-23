const DIRECT_LABELS: Record<string, string> = {
  E5_DASHBOARD_SERVICE: "Automation Center",
  DRAFT_PR_CREATED: "Draft Ready for Review",
  WORKFLOW_CREATED: "Workflow Created",
  WAITING_FOR_APPROVAL: "Waiting for Approval",
  READY: "Ready to Begin",
  RUNNING_ISSUE_STEP: "Preparing Work Item",
  RUNNING_BRANCH_STEP: "Creating Work Branch",
  RUNNING_PUSH_STEP: "Publishing Work Branch",
  VALIDATION_RUNNING: "Running Validation",
  EVIDENCE_READY: "Validation Evidence Ready",
  DRAFT_PR_COMPLETED: "Draft Pull Request Completed",
  PAUSED: "Paused Safely",
  FAILED_SAFE: "Stopped Safely",
  RECONCILIATION_REQUIRED: "Reconciliation Required",
  ROLLBACK_REQUIRED: "Rollback Required",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ONYX_INITIATED: "ONYX Started",
  NOVA_INITIATED: "NOVA Started",
  COUNCIL_INITIATED: "Council Review Started",
  UNASSIGNED_AGENT: "No Agent Assigned",
  CREATE_GITHUB_ISSUE: "Create GitHub Work Item",
  CREATE_ISOLATED_BRANCH: "Create a Safe Work Branch",
  PUSH_ISOLATED_BRANCH: "Publish Work Branch",
  RUN_VALIDATION: "Run Validation Checks",
  GENERATE_EVIDENCE: "Prepare Validation Evidence",
  CREATE_DRAFT_PR: "Create Draft Pull Request",
  "git diff --check passed": "File and Formatting Check Passed",
  "tsc --noEmit passed": "Application Code Check Passed",
  "Whitespace and boundary check": "File and Formatting Check",
  "Command Center typecheck": "Application Code Check",
  ENGINEERING_EVIDENCE_PACKAGE: "Validation Evidence",
  "Issue-to-Draft-PR control surface": "Safely plan, validate, and prepare changes for review",
  "Issue-to-Draft-PR control surface · merge and production unavailable": "Safely plan, validate, and prepare changes for review",
  "E.7B Limited Live Issue-to-Draft-PR Smoke Test": "Limited Workflow Validation",
  "Merging and production deployment are unavailable in this workspace.": "Merging and production deployment are unavailable in this workspace.",
  "Governed runtime scenario": "Preview Workflow Stage",
  "First incomplete capability": "Next Incomplete Step",
  "p17-fixture-checkpoint-2": "Checkpoint 2",
  "#1 · CREATE_ISOLATED_BRANCH": "Step 1 · Create a Safe Work Branch",
  "PHASE 1A.7 · EVIDENCE TIMELINE, READ-ONLY": "Evidence Timeline",
  "PHASE 1A.7 · RUNTIME RECOVERY, READ-ONLY, NO REMOTE REPAIR": "Recovery Information",
  "D.4.1 visual acceptance remains pending": "Visual review remains pending",
  "#5 · E.7B Limited Live Issue-to-Draft-PR Smoke Test": "Limited Workflow Validation",
  BRANCH_STEP_IN_PROGRESS: "Work Branch Creation in Progress",
  DETERMINISTIC_SUCCESS: "Validated Successfully",
  S0_SINGLE: "Single-Task Safety Mode",
  NOT_APPLICABLE: "Not Required",
  "provider-neutral-standard": "Standard AI Routing",
  SYSTEM: "System Managed",
  PROJECTED: "Read-Only Status",
  NO: "No",
  PASS: "Verified",
  RECOVERY_AVAILABLE: "Recovery Option Available",
  "RECONCILIATION REQUIRED": "Reconciliation Required",
  "NO RECONCILIATION REQUIRED": "No Reconciliation Required",
  "SCHEDULER STATUS UNKNOWN": "Scheduler Status Not Available",
  "Tasks Ready": "Tasks Ready to Schedule",
  "test831495/onyx-alpha1-transfer": "ONYX/NOVA Project",
  "phase1a2e7b-live-smoke": "Limited Workflow Validation",
  "live-smoke-evidence-issue-5": "Documentation Validation Scope",
  "automation/issue-8-e7b-live-smoke-test": "Isolated Work Branch",
  "f5f5ff8": "Base Version Reference",
  "Approval Required": "Approval Required",
  "Fresh Approval Required": "Fresh Approval Required",
  Blocked: "Blocked",
  "Stopped Safely": "Stopped Safely",
  "Prohibited": "Prohibited",
  "Security Validation Failed": "Security Validation Failed",
  "Evidence Incomplete": "Evidence Incomplete",
  "Merge Not Allowed": "Merge Not Allowed",
  "Production Deployment Not Allowed": "Production Deployment Not Allowed",
  "Force Push Not Allowed": "Force Push Not Allowed",
  "Branch Deletion Not Allowed": "Branch Deletion Not Allowed",
  // History event language replacements
  "Issue read": "Work Item Reviewed",
  "Issue #5 accepted into the controlled live workflow": "Work Item 5 entered the governed workflow",
  "Branch ready": "Work Branch Prepared",
  "Isolated automation branch created": "A safe isolated work branch was prepared",
  "Validation complete": "Validation Successful",
  "Documentation boundary and TypeScript validation passed": "Documentation and application checks passed",
  "Draft PR created": "Draft Review Ready",
  "Draft PR #6 verified open and draft-only": "Draft Pull Request 6 is open and ready for review",
  "No E.8B decision has been recorded for this issue.": "No approval decision has been recorded for this work item.",
  // Presence mode values
  ONYX: "ONYX",
  NOVA: "NOVA",
  COUNCIL: "Council",
  UNASSIGNED: "Unassigned",
  // Active agent display values
  "Unassigned": "No Active Agent",
  // Assigned agents display values
  "None": "No Assigned Agents",
};

function normalizeKey(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[-_]+/g, "_")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function formatReadableLabel(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";

  const readable = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return readable
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const lowered = part.toLowerCase();
      if (["id", "and", "of", "to", "in", "on", "a", "an", "for", "as", "by", "at"].includes(lowered)) {
        return lowered;
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function getDirectLabel(value: string): string | undefined {
  const input = String(value ?? "").trim();
  if (!input) return undefined;

  const exact = DIRECT_LABELS[input];
  if (exact) return exact;

  const key = normalizeKey(input);
  const fromNormalized = DIRECT_LABELS[key];
  if (fromNormalized) return fromNormalized;

  const lowerKey = input.toLowerCase();
  const fromLower = DIRECT_LABELS[lowerKey];
  if (fromLower) return fromLower;

  return undefined;
}

export function getSourceDisplayName(value: string): string {
  return getDirectLabel(value) ?? "Automation Center";
}

export function getRuntimeScenarioDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getWorkflowStateDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getCapabilityDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getLaneStageDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getDecisionDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getBudgetStatusDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getModelRoutingDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getEvidenceStatusDisplayName(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function getCheckpointDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown Checkpoint";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  const match = raw.match(/(?:^|[-_\s])(?:checkpoint|cp)[-_\s]*?(\d+)(?:$|[-_\s])/i);
  if (match?.[1]) return `Checkpoint ${match[1]}`;

  return formatReadableLabel(raw);
}

export function getScopeDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown Scope";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  if (/scope[-_ ]?hash|scope/i.test(raw)) return "Validated Work Scope";
  return formatReadableLabel(raw);
}

export function getReferenceDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Current Reference";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  if (/^wf[-_]/i.test(raw) || /^workflow[-_]/i.test(raw) || /workflow/i.test(raw)) return "Current Governed Workflow";
  if (/^p16rt[-_]/i.test(raw) || /runtime/i.test(raw)) return "Current Runtime";
  if (/^p16sess[-_]/i.test(raw) || /session/i.test(raw)) return "Current Runtime Session";
  if (/^p17[-_].*checkpoint/i.test(raw)) return "Checkpoint";
  return "Current Reference";
}

export function getGenericReferenceLabel(value: string): string {
  return getReferenceDisplayName(value);
}

export function getRepositoryDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Current Repository";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return "Current Repository";
}

export function getBranchDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Current Branch";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return "Current Branch";
}

export function getPlanDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Current Plan";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return "Current Plan";
}

export function getPhaseCaptionDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Current Phase";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return formatReadableLabel(raw);
}

export function getKnownLimitationDisplayName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Known limitation";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return formatReadableLabel(raw);
}

export function formatTimestampDisplay(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown time";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

export function formatTechnicalIdentifier(value: string | null | undefined): string {
  if (value === null || value === undefined) return "Unknown";
  return String(value);
}

export function formatHistoryEventLanguage(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Event Recorded";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  return raw;
}

export function formatPresenceMode(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";

  const direct = getDirectLabel(raw);
  if (direct) return direct;

  // Handle specific presence mode enum values
  if (raw === "ONYX") return "ONYX";
  if (raw === "NOVA") return "NOVA";
  if (raw === "COUNCIL") return "Council";
  if (raw === "ONYX_NOVA_COUNCIL") return "Multi-Channel";
  if (raw === "SYSTEM") return "System Managed";
  if (raw === "UNASSIGNED") return "Unassigned";

  return formatReadableLabel(raw);
}

export function formatRuntimeReference(value: string | null | undefined): string {
  return getReferenceDisplayName(String(value ?? ""));
}

export function formatRuntimeStatus(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";

  // Extract status from fixture identifiers like "p16rt-fixture-PAUSED" -> "Paused"
  const fixtureMatch = raw.match(/fixture[_-]([A-Z_]+)$/i);
  if (fixtureMatch && fixtureMatch[1]) {
    return formatReadableLabel(fixtureMatch[1]);
  }

  // For non-fixture IDs, use reference display name
  return getReferenceDisplayName(raw);
}

export function formatHistoryTimestamp(isoTimestamp: string | null | undefined): { canonical: string; readable: string } {
  const raw = String(isoTimestamp ?? "").trim();
  if (!raw) return { canonical: "", readable: "Unknown time" };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { canonical: raw, readable: raw };
  }

  const readable = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);

  return { canonical: raw, readable };
}

export function formatValidationLabel(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}

export function formatValidationDetail(value: string): string {
  return getDirectLabel(value) ?? formatReadableLabel(value);
}
