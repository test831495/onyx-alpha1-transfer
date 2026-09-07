import { describe, expect, it, vi } from "vitest";
import { VoiceConversationOrchestrator, type OrchestratorHandlers } from "./voiceConversationOrchestrator";
import type { ConversationPlan } from "./conversationPlan";

function makeHandlers(overrides: Partial<OrchestratorHandlers> = {}): OrchestratorHandlers {
  return {
    navigate: vi.fn(),
    resolveTomorrowDate: vi.fn(() => "Tomorrow is Monday."),
    resolveWeekdayDate: vi.fn(() => "That Monday is September 7th."),
    describeVisibleUi: vi.fn(() => "The calendar card is open."),
    requestClarification: vi.fn(),
    speak: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("VoiceConversationOrchestrator", () => {
  it("executes an ordered two-step plan exactly once, calling only registered handlers", async () => {
    const plan: ConversationPlan = {
      planId: "plan-1",
      steps: [
        { stepId: "plan-1-1", kind: "NAVIGATE", appId: "calendar" },
        { stepId: "plan-1-2", kind: "ANSWER_DETERMINISTIC", factKind: "TOMORROW_DATE" },
      ],
    };
    const handlers = makeHandlers();
    const orchestrator = new VoiceConversationOrchestrator();
    const outcomes = await orchestrator.executePlan(plan, handlers);

    expect(handlers.navigate).toHaveBeenCalledTimes(1);
    expect(handlers.navigate).toHaveBeenCalledWith("calendar");
    expect(handlers.speak).toHaveBeenCalledTimes(1);
    expect(handlers.speak).toHaveBeenCalledWith("Tomorrow is Monday.");
    expect(outcomes.map((outcome) => outcome.result)).toEqual(["COMPLETED", "COMPLETED"]);
  });

  it("rejects a second plan while one is active", async () => {
    const orchestrator = new VoiceConversationOrchestrator();
    const slowHandlers = makeHandlers({
      speak: () => new Promise((resolve) => setTimeout(resolve, 20)),
    });
    const plan: ConversationPlan = {
      planId: "plan-a",
      steps: [{ stepId: "plan-a-1", kind: "ANSWER_DETERMINISTIC", factKind: "TOMORROW_DATE" }],
    };
    const firstRun = orchestrator.executePlan(plan, slowHandlers);
    expect(orchestrator.hasActivePlan()).toBe(true);

    const secondOutcomes = await orchestrator.executePlan(
      { planId: "plan-b", steps: [{ stepId: "plan-b-1", kind: "NAVIGATE", appId: "calendar" }] },
      slowHandlers,
    );
    expect(secondOutcomes).toEqual([{ stepId: "plan-b-1", result: "FAILED_SAFE" }]);

    await firstRun;
    expect(orchestrator.hasActivePlan()).toBe(false);
  });

  it("cancels pending steps and does not execute them", async () => {
    const orchestrator = new VoiceConversationOrchestrator();
    const handlers = makeHandlers({
      navigate: vi.fn(() => orchestrator.cancel()),
    });
    const plan: ConversationPlan = {
      planId: "plan-2",
      steps: [
        { stepId: "plan-2-1", kind: "NAVIGATE", appId: "calendar" },
        { stepId: "plan-2-2", kind: "ANSWER_DETERMINISTIC", factKind: "TOMORROW_DATE" },
      ],
    };

    const outcomes = await orchestrator.executePlan(plan, handlers);
    expect(outcomes).toEqual([
      { stepId: "plan-2-1", result: "COMPLETED" },
      { stepId: "plan-2-2", result: "CANCELLED" },
    ]);
    expect(handlers.navigate).toHaveBeenCalledTimes(1);
    expect(handlers.speak).not.toHaveBeenCalled();
  });

  it("resolves a clarification step without executing further unsupported steps", async () => {
    const orchestrator = new VoiceConversationOrchestrator();
    const handlers = makeHandlers();
    const plan: ConversationPlan = {
      planId: "plan-3",
      steps: [{ stepId: "plan-3-1", kind: "REQUEST_CLARIFICATION" }],
    };
    const outcomes = await orchestrator.executePlan(plan, handlers);
    expect(outcomes).toEqual([{ stepId: "plan-3-1", result: "WAITING_FOR_CLARIFICATION" }]);
    expect(handlers.requestClarification).toHaveBeenCalledTimes(1);
    expect(handlers.requestClarification).toHaveBeenCalledWith("Which day did you mean?");
  });

  it("fails safe for a step missing its required target", async () => {
    const orchestrator = new VoiceConversationOrchestrator();
    const handlers = makeHandlers();
    const plan: ConversationPlan = {
      planId: "plan-4",
      steps: [{ stepId: "plan-4-1", kind: "NAVIGATE" }],
    };
    const outcomes = await orchestrator.executePlan(plan, handlers);
    expect(outcomes).toEqual([{ stepId: "plan-4-1", result: "FAILED_SAFE" }]);
  });
});
