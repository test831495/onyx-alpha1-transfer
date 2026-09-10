import {
  createProviderFreeAgenda,
  createTemporalContext,
  selectCalendarRange,
  type CalendarEventRecord,
  type CalendarAgendaProjection,
  type CalendarRangeKind,
} from "@onyx/calendar-intelligence";
import { loadMicrosoftCalendarEvents } from "./workspaceController";

export function loadCalendar(
  range: CalendarRangeKind = "TODAY",
  instant = new Date().toISOString(),
): CalendarAgendaProjection {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = typeof navigator === "undefined" ? "en-IN" : navigator.language || "en-IN";
  return createProviderFreeAgenda(createTemporalContext({ instant, timeZone, locale }), range);
}

export function composeCalendarSpeech(summary: CalendarAgendaProjection): string {
  return summary.speech;
}

export async function loadConnectedCalendarEvents(
  range: CalendarRangeKind = "TODAY",
  loadEvents: (request: { start: string; end: string; timeZone: string }) => Promise<readonly CalendarEventRecord[]> = loadMicrosoftCalendarEvents,
  instant = new Date().toISOString(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  locale = typeof navigator === "undefined" ? "en-IN" : navigator.language || "en-IN",
): Promise<readonly CalendarEventRecord[]> {
  const context = createTemporalContext({ instant, timeZone, locale });
  const selected = selectCalendarRange(context, range);
  return loadEvents({
    start: new Date(`${selected.start}T00:00:00.000Z`).toISOString(),
    end: new Date(`${selected.end}T00:00:00.000Z`).toISOString(),
    timeZone: selected.timeZone,
  });
}