import { describe, expect, it, vi } from "vitest";
import { loadConnectedCalendarEvents, loadConnectedCalendarEventsWithDiagnostic } from "./calendarController";

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

it("forwards the selected range through the diagnostic read path", async () => {
  const loadEvents = vi.fn().mockResolvedValue({ events: [], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_EMPTY", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY" } });
  await expect(loadConnectedCalendarEventsWithDiagnostic("CURRENT_WEEK", loadEvents, "2026-09-10T12:00:00.000Z", "UTC", "en-IN")).resolves.toMatchObject({ events: [], diagnostic: { reasonCode: "CALENDAR_GRAPH_SUCCEEDED_EMPTY" } });
  expect(loadEvents).toHaveBeenCalledOnce();
});