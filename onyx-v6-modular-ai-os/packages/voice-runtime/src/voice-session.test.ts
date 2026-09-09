import { describe, expect, it } from "vitest";
import { createVoiceSession } from "./voice-session";

describe("baseline C1 voice session", () => {
  it("defers microphone use until tap to talk and prevents duplicate output", () => {
    const session = createVoiceSession({ language: "en-IN" });

    expect(session.state).toBe("IDLE");
    expect(session.microphoneRequested).toBe(false);
    expect(session.tapToTalk()).toBe("LISTENING");
    expect(session.microphoneRequested).toBe(true);
    expect(session.beginResponse("response-1")).toBe(true);
    expect(session.beginResponse("response-1")).toBe(false);
    expect(session.navigate("briefing-1")).toBe(true);
    expect(session.navigate("briefing-1")).toBe(false);
  });

  it("handles interruption, cancellation, bounded follow-up and reconnect without a provider", () => {
    const session = createVoiceSession({ language: "hi-IN", maxFollowUps: 1 });

    session.tapToTalk();
    expect(session.interrupt()).toBe("INTERRUPTED");
    expect(session.cancel("user-cancel").cancelled).toBe(true);
    expect(session.followUp()).toBe("LISTENING");
    expect(session.followUp()).toBe("OFFLINE");
    expect(session.reconnect()).toBe("LISTENING");
    expect(session.providerEnabled).toBe(false);
  });

  it("preserves owner-scoped transcript, end-of-turn and barge-in behavior without retaining microphone access", () => {
    const session = createVoiceSession({ language: "en-IN", accountId: "account-1", sessionId: "session-1" });

    expect(session.owns({ accountId: "account-1", sessionId: "session-1" })).toBe(true);
    expect(session.owns({ accountId: "account-2", sessionId: "session-1" })).toBe(false);
    session.tapToTalk();
    expect(session.understand("Hello Onyx")).toBe("UNDERSTANDING");
    expect(session.endTurn("Hello Onyx", "Hello Rahul")).toMatchObject({ transcript: "Hello Onyx", spokenResponse: "Hello Rahul", consistent: true });
    expect(session.bargeIn()).toBe("INTERRUPTED");
    expect(session.releaseMicrophone()).toBe("IDLE");
    expect(session.microphoneRequested).toBe(false);
  });
});