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
    vi.advanceTimersByTime(14999);
    expect(terminal).not.toHaveBeenCalled();
    session.markListeningActive();
    vi.advanceTimersByTime(14999);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(session.getState()).toBe("IDLE");
    expect(terminal).toHaveBeenCalledWith("TIMEOUT", 0);
    vi.useRealTimers();
  });

  it("keeps the third through tenth accepted turns eligible and closes after the configured bound", () => {
    const session = new FollowUpListeningSession();
    for (let index = 0; index < 10; index += 1) {
      expect(session.beginAfterSpeech(true)).toBe(true);
      expect(session.beginListening(() => true, vi.fn())).toBe("STARTED");
      session.recordTurn();
      if (index < 9) expect(session.getState()).toBe("IDLE");
    }
    expect(session.getState()).toBe("IDLE");
    expect(FOLLOW_UP_MAX_AUTOMATIC_TURNS).toBe(10);
    expect(session.beginAfterSpeech(true)).toBe(false);
  });

  it("shows tap-to-continue when the browser rejects restart and closes on cancellation", () => {
    vi.useFakeTimers();
    const session = new FollowUpListeningSession();
    const terminal = vi.fn();
    expect(session.beginAfterSpeech(true)).toBe(true);
    expect(session.beginListening(() => { throw new Error("gesture required"); }, terminal)).toBe("TAP_TO_CONTINUE");
    vi.advanceTimersByTime(FOLLOW_UP_TIMEOUT_MS);
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
    session.markListeningActive();
    session.recordTurn();
    session.beginAfterSpeech(true);
    session.beginListening(() => true, terminal);
    session.markListeningActive();
    vi.advanceTimersByTime(FOLLOW_UP_TIMEOUT_MS - 1);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(terminal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("closes an explicit session at the configured foreground duration", () => {
    vi.useFakeTimers();
    const session = new FollowUpListeningSession();
    const terminal = vi.fn();
    session.beginExplicitSession();
    session.beginAfterSpeech(true);
    session.beginListening(() => true, terminal);
    vi.advanceTimersByTime(299999);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(terminal).toHaveBeenCalledWith("TIMEOUT", 1);
    expect(session.getState()).toBe("IDLE");
    vi.useRealTimers();
  });

  it("does not leave the original timeout active after an early-end fallback", () => {
    vi.useFakeTimers();
    const setTimer = vi.fn((callback: () => void, delayMs: number) =>
      setTimeout(callback, delayMs));
    const clearTimer = vi.fn((handle: ReturnType<typeof setTimeout>) =>
      clearTimeout(handle));
    const session = new FollowUpListeningSession({ setTimer, clearTimer });
    const terminal = vi.fn();

    session.beginAfterSpeech(true);
    session.beginListening(() => true, terminal);
    session.markListeningActive();
    const clearsBeforeFallback = clearTimer.mock.calls.length;
    expect(session.handleEarlyEnd(() => false)).toBe("TAP_TO_CONTINUE");
    vi.advanceTimersByTime(FOLLOW_UP_TIMEOUT_MS);

    expect(clearTimer.mock.calls.length).toBeGreaterThan(clearsBeforeFallback);
    expect(terminal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("uses the supplied policy recognition restart limit", () => {
    const session = new FollowUpListeningSession({
      policy: {
        maxAcceptedTurns: 10,
        followUpSilenceTimeoutMs: 15000,
        foregroundSessionMaxMs: 300000,
        recognitionRestartLimit: 0,
      },
    });
    session.beginAfterSpeech(true);
    session.beginListening(() => true, vi.fn());
    expect(session.handleEarlyEnd(() => true)).toBe("TAP_TO_CONTINUE");
  });
});