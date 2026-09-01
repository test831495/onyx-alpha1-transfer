import { describe, expect, it } from "vitest";
import { projectFailure, projectRecovery, projectTransition, runLifecycle } from "../src/index";

describe("Presence lifecycle", () => {
  it("PPT-010 baseline lifecycle flow", () => {
    const states = runLifecycle("UNINITIALIZED", ["INITIALIZE", "STABILIZE", "BEGIN_INPUT", "INPUT_COMPLETE", "BEGIN_REASONING", "BEGIN_RESPONSE", "COMPLETE_RESPONSE"]);
    expect(states).toEqual(["READY", "IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "IDLE"]);
    expect(states.every((state) => projectTransition(state, "STOP").authorizing === false)).toBe(true);
  });

  it("PPT-011 invalid transitions reject", () => {
    expect(() => projectTransition("IDLE", "BEGIN_RESPONSE")).toThrow();
    expect(() => projectTransition("UNKNOWN" as never, "STOP")).toThrow();
  });

  it("PPT-012 STOPPED terminal behavior", () => {
    expect(projectTransition("IDLE", "STOP").state).toBe("STOPPED");
    expect(() => projectTransition("STOPPED", "RECOVER")).toThrow();
  });

  it("PPT-013 cancellation", () => {
    expect(projectFailure("THINKING", "CANCELLED")).toMatchObject({ state: "INTERRUPTED", responseSuppressed: true, toolProjectionSuppressed: true });
  });

  it("PPT-014 interruption", () => {
    expect(projectFailure("SPEAKING", "INTERRUPTED")).toMatchObject({ state: "INTERRUPTED", presentationSuppressed: true });
    expect(projectTransition("INTERRUPTED", "RECOVER").state).toBe("RECOVERING");
  });

  it("PPT-015 timeout recovery", () => {
    expect(projectFailure("UNDERSTANDING", "TIMEOUT").state).toBe("RECOVERING");
  });

  it("PPT-016 model failure recovery", () => {
    expect(projectFailure("THINKING", "MODEL_UNAVAILABLE")).toMatchObject({ state: "RECOVERING", fallback: "SAFE_TEXT" });
  });

  it("PPT-017 tool failure recovery", () => {
    expect(projectFailure("THINKING", "TOOL_UNAVAILABLE")).toMatchObject({ state: "RECOVERING", assessability: "NOT_ASSESSABLE" });
  });

  it("PPT-018 renderer/TV failure recovery", () => {
    expect(projectFailure("SPEAKING", "RENDERER_UNAVAILABLE")).toMatchObject({ state: "RECOVERING", fallback: "SAFE_TEXT" });
    expect(projectFailure("SPEAKING", "TV_UNAVAILABLE")).toMatchObject({ state: "RECOVERING", fallback: "SAFE_TEXT" });
  });

  it("PPT-019 privacy failure flow", () => {
    expect(projectFailure("IDLE", "PRIVACY_UNESTABLISHED").state).toBe("PRIVACY_RESTRICTED");
    expect(projectTransition("PRIVACY_RESTRICTED", "RECOVER").state).toBe("RECOVERING");
    expect(projectTransition("PRIVACY_RESTRICTED", "STOP").state).toBe("STOPPED");
    expect(projectRecovery("RECOVERING", { dependency: "privacy", health: "RECOVERED", freshness: "CURRENT", interactionId: "interaction-001", correlationId: "correlation-001", validated: true }).state).toBe("IDLE");
    expect(projectRecovery("RECOVERING", { dependency: "privacy", health: "FAILED", freshness: "CURRENT", interactionId: "interaction-001", correlationId: "correlation-001", validated: false }).state).toBe("RECOVERING");
    expect(projectRecovery("RECOVERING", { dependency: "privacy", health: "RECOVERED", freshness: "STALE", interactionId: "interaction-001", correlationId: "correlation-001", validated: true }).state).toBe("RECOVERING");
  });
});