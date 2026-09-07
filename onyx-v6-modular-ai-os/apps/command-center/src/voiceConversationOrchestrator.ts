import type { ConversationPlan, PlanStep } from "./conversationPlan";
import type { ShellAppId } from "./shellState";

export type PlanStepResult =
  | "COMPLETED"
  | "SKIPPED_UNSUPPORTED"
  | "WAITING_FOR_CLARIFICATION"
  | "CANCELLED"
  | "FAILED_SAFE";

export interface StepOutcome {
  readonly stepId: string;
  readonly result: PlanStepResult;
}

/**
 * Handlers are the only way the orchestrator can produce a side effect.
 * Each one must be backed by an already-registered local action; the
 * orchestrator itself never touches the DOM, network, providers, or tools.
 */
export interface OrchestratorHandlers {
  navigate(appId: ShellAppId): void;
  close?(appId: ShellAppId): void;
  resolveTomorrowDate(): string;
  resolveWeekdayDate(weekday: string): string;
  resolveCurrentTime(): string;
  describeVisibleUi(): string;
  requestClarification(message: string): Promise<void> | void;
  speak(text: string): Promise<void> | void;
}

/**
 * Pure, non-authorizing coordinator over a typed plan and injected
 * handlers. Bounded to one active plan at a time; cancellable; executes
 * each step exactly once in order and stops issuing new steps once
 * cancelled.
 */
export class VoiceConversationOrchestrator {
  private activePlanId: string | null = null;
  private cancelled = false;

  hasActivePlan(): boolean {
    return this.activePlanId !== null;
  }

  cancel(): void {
    if (this.activePlanId) this.cancelled = true;
  }

  async executePlan(plan: ConversationPlan, handlers: OrchestratorHandlers): Promise<StepOutcome[]> {
    if (this.activePlanId) {
      return plan.steps.map((step) => ({ stepId: step.stepId, result: "FAILED_SAFE" }));
    }

    this.activePlanId = plan.planId;
    this.cancelled = false;
    const outcomes: StepOutcome[] = [];

    try {
      for (const step of plan.steps) {
        if (this.cancelled) {
          outcomes.push({ stepId: step.stepId, result: "CANCELLED" });
          continue;
        }
        outcomes.push(await this.executeStep(step, handlers));
      }
    } finally {
      this.activePlanId = null;
      this.cancelled = false;
    }

    return outcomes;
  }

  private async executeStep(step: PlanStep, handlers: OrchestratorHandlers): Promise<StepOutcome> {
    switch (step.kind) {
      case "NAVIGATE": {
        if (!step.appId) return { stepId: step.stepId, result: "FAILED_SAFE" };
        handlers.navigate(step.appId);
        return { stepId: step.stepId, result: "COMPLETED" };
      }
      case "PRESENTATION": {
        if (!step.appId || !handlers.close) return { stepId: step.stepId, result: "FAILED_SAFE" };
        handlers.close(step.appId);
        return { stepId: step.stepId, result: "COMPLETED" };
      }
      case "ANSWER_DETERMINISTIC": {
        const text = this.resolveFact(step, handlers);
        if (text === null) return { stepId: step.stepId, result: "SKIPPED_UNSUPPORTED" };
        await handlers.speak(text);
        return { stepId: step.stepId, result: "COMPLETED" };
      }
      case "REQUEST_CLARIFICATION": {
        await handlers.requestClarification(step.clarificationPrompt ?? "Which day did you mean?");
        return { stepId: step.stepId, result: "WAITING_FOR_CLARIFICATION" };
      }
      default:
        return { stepId: step.stepId, result: "FAILED_SAFE" };
    }
  }

  private resolveFact(step: PlanStep, handlers: OrchestratorHandlers): string | null {
    if (step.factKind === "TOMORROW_DATE") return handlers.resolveTomorrowDate();
    if (step.factKind === "WEEKDAY_DATE" && step.weekday) return handlers.resolveWeekdayDate(step.weekday);
    if (step.factKind === "CURRENT_TIME") return handlers.resolveCurrentTime();
    if (step.factKind === "UI_VISIBLE") return handlers.describeVisibleUi();
    return null;
  }
}
