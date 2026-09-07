import { describe, expect, it } from "vitest";
import { buildConversationPlan } from "./conversationPlan";
import { parseConversationalRequest } from "./conversationIntentGrammar";

describe("buildConversationPlan", () => {
  it.each(["Open Calendar", "Show Calendar", "Go to Calendar", "Take me to Calendar", "Please open Calendar"])("builds one navigation step for %s", (request) => {
    const plan = buildConversationPlan("navigation-plan", parseConversationalRequest(request));
    expect(plan?.steps).toEqual([{ stepId: "navigation-plan-1", kind: "NAVIGATE", appId: "calendar" }]);
  });

  it("builds an ordered two-step plan for the calendar + tomorrow example", () => {
    const envelope = parseConversationalRequest("Open calendar and tell me tomorrow's date.");
    const plan = buildConversationPlan("plan-1", envelope);
    expect(plan?.steps.map((step) => step.kind)).toEqual(["NAVIGATE", "ANSWER_DETERMINISTIC"]);
    expect(plan?.steps[0]?.appId).toBe("calendar");
    expect(plan?.steps[1]?.factKind).toBe("TOMORROW_DATE");
  });

  it("builds a single-step plan for a standalone date question", () => {
    const envelope = parseConversationalRequest("What is tomorrow's date?");
    const plan = buildConversationPlan("plan-2", envelope);
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0]?.kind).toBe("ANSWER_DETERMINISTIC");
  });

  it("builds a clarification step for an ambiguous follow-up", () => {
    const envelope = parseConversationalRequest("And what about someday?");
    const plan = buildConversationPlan("plan-3", envelope);
    expect(plan?.steps).toEqual([{ stepId: "plan-3-1", kind: "REQUEST_CLARIFICATION" }]);
  });

  it("returns null for unsupported requests instead of fabricating a plan", () => {
    const envelope = parseConversationalRequest("Summarize the news for me please");
    expect(buildConversationPlan("plan-4", envelope)).toBeNull();
  });

  it("returns null for a cancellation request (handled outside plan execution)", () => {
    const envelope = parseConversationalRequest("stop");
    expect(buildConversationPlan("plan-5", envelope)).toBeNull();
  });
});
