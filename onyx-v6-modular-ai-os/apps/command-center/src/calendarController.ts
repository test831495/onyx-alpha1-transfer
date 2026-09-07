import {
  createProviderFreeAgenda,
  createTemporalContext,
  type CalendarAgendaProjection,
  type CalendarRangeKind,
} from "@onyx/calendar-intelligence";

export function loadCalendar(
  range: CalendarRangeKind = "TODAY",
  instant = new Date().toISOString(),
): CalendarAgendaProjection {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = navigator.language || "en-IN";
  return createProviderFreeAgenda(createTemporalContext({ instant, timeZone, locale }), range);
}

export function composeCalendarSpeech(summary: CalendarAgendaProjection): string {
  return summary.speech;
}