import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateForSpeech,
  formatTimeForSpeech,
  isSupportedWeekday,
  resolveNamedWeekday,
  tomorrowFrom,
} from "./conversationDateFacts";

describe("conversationDateFacts", () => {
  it("computes tomorrow from a supplied date", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(tomorrowFrom(now).toISOString().slice(0, 10)).toBe("2026-09-07");
  });

  it("handles the midnight/month boundary using supplied time", () => {
    const now = new Date("2026-09-30T23:59:00Z");
    expect(tomorrowFrom(now).toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("resolves the next strictly-future named weekday", () => {
    // 2026-09-06 is a Sunday.
    const now = new Date("2026-09-06T12:00:00Z");
    const monday = resolveNamedWeekday(now, "monday");
    expect(monday.toISOString().slice(0, 10)).toBe("2026-09-07");
    const sunday = resolveNamedWeekday(now, "sunday");
    expect(sunday.toISOString().slice(0, 10)).toBe("2026-09-13");
  });

  it("validates supported weekday names", () => {
    expect(isSupportedWeekday("monday")).toBe(true);
    expect(isSupportedWeekday("funday")).toBe(false);
  });

  it("adds days without mutating the input", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    const next = addDays(now, 3);
    expect(now.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(next.toISOString().slice(0, 10)).toBe("2026-09-09");
  });

  it("formats a date for speech", () => {
    const formatted = formatDateForSpeech(new Date("2026-09-07T12:00:00Z"));
    expect(formatted).toContain("2026");
    expect(formatted).toContain("September");
  });

  it("formats supplied trusted time in Asia/Kolkata using en-IN", () => {
    expect(formatTimeForSpeech(new Date("2026-09-07T12:34:00Z"))).toContain("6:04 pm");
  });
});
