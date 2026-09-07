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
    const terminal = vi.fn();
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.getState()).toBe("WAITING_FOR_TTS");
    expect(session.beginListening(start, terminal)).toBe("STARTED");
    expect(start).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FOLLOW_UP_TIMEOUT_MS);
    expect(session.getState()).toBe("IDLE");
    expect(terminal).toHaveBeenCalledWith("TIMEOUT", 0);
    vi.useRealTimers();
  });

  it("closes at the automatic turn bound and never starts for ineligible results", () => {
    const session = new FollowUpListeningSession();
    expect(session.beginAfterSpeech(false)).toBe(false);
    expect(session.beginListening(() => true, vi.fn())).toBe("CLOSED");
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.beginListening(() => true, vi.fn())).toBe("STARTED");
    for (let index = 0; index < FOLLOW_UP_MAX_AUTOMATIC_TURNS; index += 1) session.recordTurn();
    expect(session.getState()).toBe("IDLE");
  });

  it("shows tap-to-continue when the browser rejects restart and closes on cancellation", () => {
    vi.useFakeTimers();
    const session = new FollowUpListeningSession();
    const terminal = vi.fn();
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.beginListening(() => { throw new Error("gesture required"); }, terminal)).toBe("TAP_TO_CONTINUE");
    vi.advanceTimersByTime(8000);
    expect(terminal).toHaveBeenCalledWith("TIMEOUT", 0);
    session.close("CANCELLED");
    expect(session.getState()).toBe("IDLE");
    vi.useRealTimers();
  });

  it("invalidates stale timeout generations when a new turn begins", () => {
    vi.useFakeTimers();
    const session = new FollowUpListeningSession();
    const terminal = vi.fn();
    session.beginAfterSpeech(true);
    session.beginListening(() => true, terminal);
    session.recordTurn();
    session.beginAfterSpeech(true);
    session.beginListening(() => true, terminal);
    vi.advanceTimersByTime(7999);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(terminal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});