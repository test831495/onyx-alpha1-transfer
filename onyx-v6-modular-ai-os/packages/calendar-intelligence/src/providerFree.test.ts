import { describe, expect, it } from "vitest";
import {
  createProviderFreeAgenda,
  createTemporalContext,
  selectCalendarRange,
} from "./index";

describe("provider-free calendar intelligence", () => {
  const context = createTemporalContext({
    instant: "2026-12-31T20:30:00.000Z",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    weekStartsOn: 1,
  });

  it("projects tomorrow and week boundaries from supplied local facts", () => {
    expect(selectCalendarRange(context, "TOMORROW").start).toBe("2027-01-02");
    expect(selectCalendarRange(context, "CURRENT_WEEK").start).toBe("2026-12-28");
    expect(selectCalendarRange(context, "NEXT_WEEK").start).toBe("2027-01-04");
  });

  it("reports an unconfigured source as unavailable, not an empty calendar", () => {
    const agenda = createProviderFreeAgenda(context, "TODAY");
    expect(agenda.connectionState).toBe("NOT_CONFIGURED");
    expect(agenda.events).toEqual([]);
    expect(agenda.eventCount).toBe("UNKNOWN");
    expect(agenda.speech).toContain("No connected calendar event data is available.");
    expect(agenda.speech).not.toContain("no meetings");
  });

  it("does not infer location, weather, or free time from local facts", () => {
    const agenda = createProviderFreeAgenda(context, "TODAY");
    expect(agenda.limitations).toEqual(
      expect.arrayContaining([
        "Real meetings, availability, location, weather, and travel time are unavailable without an approved connector.",
      ]),
    );
  });

  it("fails closed for malformed instants, timezones, and locales", () => {
    expect(() => createTemporalContext({ instant: "not-a-date", timeZone: "UTC", locale: "en-IN" })).toThrow();
    expect(() => createTemporalContext({ instant: "2026-01-01T00:00:00Z", timeZone: "Mars/Olympus", locale: "en-IN" })).toThrow();
    expect(() => createTemporalContext({ instant: "2026-01-01T00:00:00Z", timeZone: "UTC", locale: "invalid_locale" })).toThrow();
  });

  it("handles leap day, midnight, and DST-observing local dates", () => {
    const leap = createTemporalContext({ instant: "2024-02-29T23:30:00Z", timeZone: "UTC", locale: "en-US" });
    expect(selectCalendarRange(leap, "TOMORROW").start).toBe("2024-03-01");
    const midnight = createTemporalContext({ instant: "2026-12-31T23:59:00Z", timeZone: "UTC", locale: "en-US" });
    expect(selectCalendarRange(midnight, "TOMORROW").start).toBe("2027-01-01");
    const dst = createTemporalContext({ instant: "2026-03-08T07:30:00Z", timeZone: "America/New_York", locale: "en-US" });
    expect(selectCalendarRange(dst, "TODAY").start).toBe("2026-03-08");
  });
});