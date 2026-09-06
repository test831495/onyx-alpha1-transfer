/**
 * Deterministic date facts for bounded voice/text date questions. All
 * functions are pure, use UTC-based date math (timezone-independent), and
 * take the trusted "now" explicitly; no function here reads ambient time.
 */

export const SUPPORTED_WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type SupportedWeekday = (typeof SUPPORTED_WEEKDAYS)[number];

export function isSupportedWeekday(value: string): value is SupportedWeekday {
  return (SUPPORTED_WEEKDAYS as readonly string[]).includes(value);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function tomorrowFrom(now: Date): Date {
  return addDays(now, 1);
}

/** Resolves the next strictly-future occurrence of the named weekday, using UTC day-of-week. */
export function resolveNamedWeekday(now: Date, weekday: SupportedWeekday): Date {
  const targetIndex = SUPPORTED_WEEKDAYS.indexOf(weekday);
  const currentIndex = now.getUTCDay();
  let delta = targetIndex - currentIndex;
  if (delta <= 0) delta += 7;
  return addDays(now, delta);
}

export function formatDateForSpeech(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
