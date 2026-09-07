import { describe, expect, it, vi } from "vitest";
import {
  FOLLOW_UP_MAX_AUTOMATIC_TURNS,
  FOLLOW_UP_TIMEOUT_MS,
  FollowUpListeningSession,
} from "./followUpListeningSession";

describe("FollowUpListeningSession", () => {
  it("starts only after eligible speech completion and uses the frozen bounds", () => {
    vi.useFakeTimers();
    const session = new FollowUpListeningSession();
    const start = vi.fn(() => true);
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.getState()).toBe("WAITING_FOR_TTS");
    expect(session.beginListening(start)).toBe("STARTED");
    expect(start).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FOLLOW_UP_TIMEOUT_MS);
    expect(session.getState()).toBe("IDLE");
    vi.useRealTimers();
  });

  it("closes at the automatic turn bound and never starts for ineligible results", () => {
    const session = new FollowUpListeningSession();
    expect(session.beginAfterSpeech(false)).toBe(false);
    expect(session.beginListening(() => true)).toBe("CLOSED");
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.beginListening(() => true)).toBe("STARTED");
    for (let index = 0; index < FOLLOW_UP_MAX_AUTOMATIC_TURNS; index += 1) session.recordTurn();
    expect(session.getState()).toBe("IDLE");
  });

  it("shows tap-to-continue when the browser rejects restart and closes on cancellation", () => {
    const session = new FollowUpListeningSession();
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.beginListening(() => { throw new Error("gesture required"); })).toBe("TAP_TO_CONTINUE");
    session.close("CANCELLED");
    expect(session.getState()).toBe("IDLE");
  });
});