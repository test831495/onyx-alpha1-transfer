import type { ShellAppId } from "./shellState";
import type { ClarificationReason, ConversationFactKind, ConversationIntentEnvelope } from "./conversationIntentGrammar";
import type { SupportedWeekday } from "./conversationDateFacts";

export type PlanStepKind = "NAVIGATE" | "PRESENTATION" | "ANSWER_DETERMINISTIC" | "REQUEST_CLARIFICATION";

export interface PlanStep {
  readonly stepId: string;
  readonly kind: PlanStepKind;
  readonly appId?: ShellAppId;
  readonly operation?: "OPEN" | "CLOSE";
  readonly clarificationReason?: ClarificationReason;
  readonly clarificationPrompt?: string;
  readonly factKind?: ConversationFactKind;
  readonly weekday?: SupportedWeekday;
}

export interface ConversationPlan {
  readonly planId: string;
  readonly steps: readonly PlanStep[];
}

const MAX_PLAN_STEPS = 5;

/**
 * Builds a bounded, deterministic plan for a supported conversational
 * intent. Returns null for anything unsupported/ambiguous so callers never
 * fabricate steps for requests outside scope.
 */
export function buildConversationPlan(
  planId: string,
  envelope: ConversationIntentEnvelope,
): ConversationPlan | null {
  const steps: PlanStep[] = [];

  if (envelope.clarificationRequired) {
    steps.push({ stepId: `${planId}-1`, kind: "REQUEST_CLARIFICATION", clarificationReason: envelope.clarificationReason, clarificationPrompt: clarificationPromptFor(envelope.clarificationReason) });
  } else if (envelope.kind === "NAVIGATION" && envelope.navigateAppId) {
    steps.push({
      stepId: `${planId}-1`,
      kind: envelope.operation === "CLOSE" ? "PRESENTATION" : "NAVIGATE",
      appId: envelope.navigateAppId,
      ...(envelope.operation === "CLOSE" ? { operation: "CLOSE" as const } : {}),
    });
  } else if (envelope.kind === "COMPOSITE_NAVIGATE_AND_FACT" && envelope.navigateAppId && envelope.factKind) {
    steps.push({ stepId: `${planId}-1`, kind: "NAVIGATE", appId: envelope.navigateAppId });
    steps.push({ stepId: `${planId}-2`, kind: "ANSWER_DETERMINISTIC", factKind: envelope.factKind });
  } else if ((envelope.kind === "DATE_QUESTION" || envelope.kind === "TIME_QUERY") && envelope.factKind) {
    steps.push({ stepId: `${planId}-1`, kind: "ANSWER_DETERMINISTIC", factKind: envelope.factKind, weekday: envelope.weekday });
  } else if (envelope.kind === "UI_VISIBLE_QUESTION" && envelope.factKind) {
    steps.push({ stepId: `${planId}-1`, kind: "ANSWER_DETERMINISTIC", factKind: envelope.factKind });
  } else if (envelope.kind === "FOLLOW_UP_DATE_QUESTION") {
    if (!envelope.weekday) {
      steps.push({ stepId: `${planId}-1`, kind: "REQUEST_CLARIFICATION", clarificationPrompt: "Which day did you mean?" });
    } else {
      steps.push({
        stepId: `${planId}-1`,
        kind: "ANSWER_DETERMINISTIC",
        factKind: "WEEKDAY_DATE",
        weekday: envelope.weekday,
      });
    }
  } else {
    return null;
  }

  if (steps.length === 0 || steps.length > MAX_PLAN_STEPS) return null;
  return { planId, steps };
}

function clarificationPromptFor(reason: ClarificationReason | undefined): string {
  switch (reason) {
    case "TASK_RECORD_OR_TASKS_APP": return "Do you mean the Tasks app or a task record?";
    case "CLOSE_TARGET_REQUIRED": return "Which application would you like me to close?";
    case "AMBIGUOUS_APPLICATION_TARGET": return "Which application did you mean?";
    case "UNKNOWN_APPLICATION_TARGET": return "I couldn't find that application. Which application would you like to use?";
    default: return "Could you clarify which application you mean?";
  }
}
