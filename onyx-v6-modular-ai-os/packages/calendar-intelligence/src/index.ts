export interface CalendarEventRecord {
  id: string;
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isCancelled: boolean;
  showAs?: string;
  location?: string;
  organizer?: string;
  isOnlineMeeting: boolean;
  joinUrl?: string;
  sensitivity?: string;
}

export interface CalendarConflict {
  firstId: string;
  secondId: string;
  start: string;
  end: string;
}

export interface CalendarSummary {
  rangeLabel: string;
  timeZone: string;
  events: CalendarEventRecord[];
  next?: CalendarEventRecord;
  busyMinutes: number;
  freeMinutes: number;
  largestFreeBlock?: {
    start: string;
    end: string;
    minutes: number;
  };
  conflicts: CalendarConflict[];
  load: "light" | "normal" | "busy" | "heavily-booked";
  generatedAt: number;
}

export type CalendarRangeKind =
  | "TODAY"
  | "TOMORROW"
  | "CURRENT_WEEK"
  | "NEXT_WEEK";

export type CalendarConnectionState = "NOT_CONFIGURED" | "CONNECTOR_UNAVAILABLE";

export interface CalendarTemporalContext {
  instant: string;
  timeZone: string;
  locale: string;
  weekStartsOn: 0 | 1;
  freshness: string;
}

export interface CalendarRange {
  kind: CalendarRangeKind;
  start: string;
  end: string;
  displayLabel: string;
  timeZone: string;
}

export interface CalendarAgendaProjection {
  requestedRange: CalendarRange;
  currentDateTime: string;
  connectionState: CalendarConnectionState;
  eventCount: "UNKNOWN";
  events: CalendarEventRecord[];
  limitations: string[];
  nextAvailableAction: "REFRESH_LOCAL_TEMPORAL_CONTEXT";
  privacyStatus: "LOCAL_FACTS_ONLY";
  speech: string;
}

function localParts(instant: string, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function localDate(context: CalendarTemporalContext): Date {
  const parts = localParts(context.instant, context.timeZone);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addLocalDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function createTemporalContext(input: {
  instant: string;
  timeZone: string;
  locale: string;
  weekStartsOn?: 0 | 1;
}): CalendarTemporalContext {
  if (Number.isNaN(new Date(input.instant).getTime())) throw new Error("Calendar instant is invalid.");
  try {
    new Intl.DateTimeFormat(input.locale, { timeZone: input.timeZone }).format(new Date(input.instant));
  } catch {
    throw new Error("Calendar timezone or locale is invalid.");
  }
  return {
    instant: new Date(input.instant).toISOString(),
    timeZone: input.timeZone,
    locale: input.locale,
    weekStartsOn: input.weekStartsOn ?? 1,
    freshness: new Date(input.instant).toISOString(),
  };
}

export function selectCalendarRange(
  context: CalendarTemporalContext,
  kind: CalendarRangeKind,
): CalendarRange {
  const today = localDate(context);
  let start = today;
  let end = addLocalDays(today, 1);
  let displayLabel = "Today";
  if (kind === "TOMORROW") {
    start = addLocalDays(today, 1);
    end = addLocalDays(today, 2);
    displayLabel = "Tomorrow";
  } else if (kind === "CURRENT_WEEK" || kind === "NEXT_WEEK") {
    const offset = (today.getUTCDay() - context.weekStartsOn + 7) % 7;
    start = addLocalDays(today, -offset + (kind === "NEXT_WEEK" ? 7 : 0));
    end = addLocalDays(start, 7);
    displayLabel = kind === "CURRENT_WEEK" ? "Current week" : "Next week";
  }
  return { kind, start: isoDate(start), end: isoDate(end), displayLabel, timeZone: context.timeZone };
}

export function createProviderFreeAgenda(
  context: CalendarTemporalContext,
  kind: CalendarRangeKind = "TODAY",
): CalendarAgendaProjection {
  const requestedRange = selectCalendarRange(context, kind);
  const currentDateTime = new Intl.DateTimeFormat(context.locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: context.timeZone,
  }).format(new Date(context.instant));
  const limitation = "Real meetings, availability, location, weather, and travel time are unavailable without an approved connector.";
  return {
    requestedRange,
    currentDateTime,
    connectionState: "NOT_CONFIGURED",
    eventCount: "UNKNOWN",
    events: [],
    limitations: [limitation],
    nextAvailableAction: "REFRESH_LOCAL_TEMPORAL_CONTEXT",
    privacyStatus: "LOCAL_FACTS_ONLY",
    speech: `It is ${currentDateTime}. Selected range: ${requestedRange.displayLabel}, ${requestedRange.start} through ${isoDate(addLocalDays(new Date(`${requestedRange.end}T00:00:00Z`), -1))}. No connected calendar event data is available.`,
  };
}

const dateValue = (value: string) => new Date(value).getTime();

export function analyzeCalendar(
  events: CalendarEventRecord[],
  rangeLabel: string,
  timeZone: string,
  windowStart: Date,
  windowEnd: Date,
  now = new Date(),
): CalendarSummary {
  const valid = events
    .filter((event) => !event.isCancelled && event.showAs !== "free")
    .sort((first, second) => dateValue(first.start) - dateValue(second.start));

  const conflicts: CalendarConflict[] = [];

  for (let i = 0; i < valid.length; i += 1) {
    const first = valid[i];
    if (!first) continue;

    for (let j = i + 1; j < valid.length; j += 1) {
      const second = valid[j];
      if (!second) continue;

      if (dateValue(second.start) >= dateValue(first.end)) break;

      if (dateValue(first.start) < dateValue(second.end)) {
        conflicts.push({
          firstId: first.id,
          secondId: second.id,
          start: second.start,
          end: new Date(
            Math.min(dateValue(first.end), dateValue(second.end)),
          ).toISOString(),
        });
      }
    }
  }

  const intervals = valid
    .filter((event) => !event.isAllDay)
    .map(
      (event) =>
        [
          Math.max(dateValue(event.start), windowStart.getTime()),
          Math.min(dateValue(event.end), windowEnd.getTime()),
        ] as [number, number],
    )
    .filter(([start, end]) => end > start)
    .sort((first, second) => first[0] - second[0]);

  const merged: [number, number][] = [];

  for (const interval of intervals) {
    const previous = merged.at(-1);

    if (!previous || interval[0] > previous[1]) {
      merged.push([...interval]);
    } else {
      previous[1] = Math.max(previous[1], interval[1]);
    }
  }

  const busyMinutes = Math.round(
    merged.reduce((total, [start, end]) => total + end - start, 0) / 60000,
  );

  const effectiveStart = Math.max(windowStart.getTime(), now.getTime());
  let cursor = effectiveStart;
  const gaps: { start: string; end: string; minutes: number }[] = [];

  for (const [start, end] of merged) {
    if (end <= effectiveStart) continue;

    if (start > cursor) {
      gaps.push({
        start: new Date(cursor).toISOString(),
        end: new Date(start).toISOString(),
        minutes: Math.round((start - cursor) / 60000),
      });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < windowEnd.getTime()) {
    gaps.push({
      start: new Date(cursor).toISOString(),
      end: windowEnd.toISOString(),
      minutes: Math.round((windowEnd.getTime() - cursor) / 60000),
    });
  }

  const freeMinutes = gaps.reduce((total, gap) => total + gap.minutes, 0);
  const largestFreeBlock = [...gaps].sort(
    (first, second) => second.minutes - first.minutes,
  )[0];
  const next = valid.find((event) => dateValue(event.end) > now.getTime());
  const workingMinutes = Math.max(
    1,
    Math.round((windowEnd.getTime() - windowStart.getTime()) / 60000),
  );
  const busyRatio = busyMinutes / workingMinutes;
  const load =
    busyRatio < 0.25
      ? "light"
      : busyRatio < 0.5
        ? "normal"
        : busyRatio < 0.75
          ? "busy"
          : "heavily-booked";

  return {
    rangeLabel,
    timeZone,
    events: valid,
    next,
    busyMinutes,
    freeMinutes,
    largestFreeBlock,
    conflicts,
    load,
    generatedAt: Date.now(),
  };
}

export function composeCalendarSpeech(
  summary: CalendarSummary,
  detail: "brief" | "standard" | "detailed" = "standard",
): string {
  if (!summary.events.length) {
    return `You have no meetings for ${summary.rangeLabel}.`;
  }

  const count = `You have ${summary.events.length} meeting${
    summary.events.length === 1 ? "" : "s"
  } for ${summary.rangeLabel}.`;

  if (!summary.next) return count;

  const nextTime = new Date(summary.next.start).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (detail === "brief") {
    return `Your next meeting is ${summary.next.subject} at ${nextTime}.`;
  }

  const conflictMessage = summary.conflicts.length
    ? ` You have ${summary.conflicts.length} calendar conflict${
        summary.conflicts.length === 1 ? "" : "s"
      }.`
    : "";
  const freeTimeMessage =
    detail === "detailed"
      ? ` You have about ${Math.round((summary.freeMinutes / 60) * 10) / 10} free hours remaining.`
      : "";

  return `${count} Your next meeting is ${summary.next.subject} at ${nextTime}.${conflictMessage}${freeTimeMessage}`;
}
