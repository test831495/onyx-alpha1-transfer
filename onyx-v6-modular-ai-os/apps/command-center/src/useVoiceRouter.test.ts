import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { DiagnosticResetTimer, parseVoice } from "./useVoiceRouter";

describe("parseVoice vocal command parsing", () => {
  it("recognizes NOVA mode with greeting", () => {
    const result = parseVoice("hey nova do something");
    expect(result.mode).toBe("nova");
    expect(result.command).toBe("do something");
  });

  it("recognizes ONYX mode without greeting", () => {
    const result = parseVoice("onyx execute this");
    expect(result.mode).toBe("onyx");
    expect(result.command).toBe("execute this");
  });

  it("returns null mode when no assistant name is detected", () => {
    const result = parseVoice("just a regular command");
    expect(result.mode).toBeNull();
    expect(result.command).toBe("just a regular command");
  });

  it("normalizes input by removing special characters", () => {
    const result = parseVoice("ONYX: execute @action #task");
    expect(result.mode).toBe("onyx");
    expect(result.command).toBe("execute action task");
  });

  it("handles multiple spaces and punctuation", () => {
    const result = parseVoice("  nova   ...   do   something   ");
    expect(result.mode).toBe("nova");
    expect(result.command).toBe("do something");
  });

  it("recognizes variant spellings (nover, onix, onics)", () => {
    const nover = parseVoice("nover hello");
    expect(nover.mode).toBe("nova");

    const onix = parseVoice("onix hello");
    expect(onix.mode).toBe("onyx");

    const onics = parseVoice("onics hello");
    expect(onics.mode).toBe("onyx");
  });
});

describe("DiagnosticResetTimer timer lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules a diagnostic-reset timeout after recognition", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);

    expect(timer.isPending()).toBe(true);
    expect(timer.getHandle()).not.toBeNull();

    vi.advanceTimersByTime(1500);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timer.isPending()).toBe(false);
  });

  it("retains the timeout handle when scheduled", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);
    const handle = timer.getHandle();

    expect(handle).not.toBeNull();
    expect(handle).toBeDefined();
  });

  it("clears the outstanding timeout when stop is called", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);
    expect(timer.isPending()).toBe(true);

    timer.clear();
    expect(timer.isPending()).toBe(false);
    expect(timer.getHandle()).toBeNull();

    vi.advanceTimersByTime(1500);
    expect(callback).not.toHaveBeenCalled();
  });

  it("clears outstanding timeout on component cleanup", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);
    timer.clear();

    vi.advanceTimersByTime(1500);
    expect(callback).not.toHaveBeenCalled();
  });

  it("replaces existing timeout when scheduling multiple results", () => {
    const timer = new DiagnosticResetTimer();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Schedule first timeout
    timer.schedule(callback1, 1500);
    const firstHandle = timer.getHandle();

    // Schedule second timeout (should clear first)
    vi.advanceTimersByTime(100);
    timer.schedule(callback2, 1500);
    const secondHandle = timer.getHandle();

    expect(firstHandle).not.toBe(secondHandle);

    // Advance past first timeout - callback1 should not fire
    vi.advanceTimersByTime(1500);
    expect(callback1).not.toHaveBeenCalled();

    // Advance to second timeout - callback2 should fire
    vi.advanceTimersByTime(100);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("does not perform delayed update after stoppage when timers are advanced", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);
    timer.clear();

    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("performs normal behavior when timer is allowed to complete", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    timer.schedule(callback, 1500);

    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timer.isPending()).toBe(false);
  });

  it("handles rapid scheduling without memory leaks", () => {
    const timer = new DiagnosticResetTimer();
    const callback = vi.fn();

    // Simulate rapid recognition results
    for (let i = 0; i < 10; i++) {
      timer.schedule(callback, 1500);
      vi.advanceTimersByTime(100);
    }

    vi.advanceTimersByTime(1500);

    // Only the last scheduled callback should fire
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("allows multiple independent timer instances", () => {
    const timer1 = new DiagnosticResetTimer();
    const timer2 = new DiagnosticResetTimer();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    timer1.schedule(callback1, 1000);
    timer2.schedule(callback2, 2000);

    vi.advanceTimersByTime(1000);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
