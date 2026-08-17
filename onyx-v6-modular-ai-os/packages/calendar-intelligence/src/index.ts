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
