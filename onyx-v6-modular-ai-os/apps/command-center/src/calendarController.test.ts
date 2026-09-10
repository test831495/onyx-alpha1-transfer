import { describe, expect, it, vi } from "vitest";
import { loadConnectedCalendarEvents } from "./calendarController";

describe("loadConnectedCalendarEvents", () => {
  it("derives the selected local date range and delegates the read to the connector", async () => {
    const loadEvents = vi.fn().mockResolvedValue([]);

    await expect(
      loadConnectedCalendarEvents("TOMORROW", loadEvents, "2026-09-10T12:00:00.000Z", "UTC", "en-IN"),
    ).resolves.toEqual([]);

    expect(loadEvents).toHaveBeenCalledWith({
      start: "2026-09-11T00:00:00.000Z",
      end: "2026-09-12T00:00:00.000Z",
      timeZone: "UTC",
    });
  });
});