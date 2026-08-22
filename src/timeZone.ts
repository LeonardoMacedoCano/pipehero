export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export interface ResolvedTimeZone {
  timeZone: string;
  warning: string | null;
}

export function resolveConfiguredTimeZone(envValue: string | undefined | null): ResolvedTimeZone {
  const trimmed = envValue?.trim();
  if (!trimmed) return { timeZone: "UTC", warning: null };
  if (!isValidTimeZone(trimmed)) {
    return { timeZone: "UTC", warning: `TIME_ZONE="${trimmed}" is not a valid IANA time zone name — falling back to UTC.` };
  }
  return { timeZone: trimmed, warning: null };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function wallClockDateParts(instant: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    instant
  );
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(lookup.year), month: Number(lookup.month), day: Number(lookup.day) };
}

function sundayOf(parts: DateParts): DateParts {
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)).getUTCDay(); // 0=Sun..6=Sat
  const sunday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - weekday, 12));
  return { year: sunday.getUTCFullYear(), month: sunday.getUTCMonth() + 1, day: sunday.getUTCDate() };
}

export function dateStringInTimeZone(instant: Date, timeZone: string): string {
  const { year, month, day } = wallClockDateParts(instant, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function weekStartDateStringInTimeZone(instant: Date, timeZone: string): string {
  const sunday = sundayOf(wallClockDateParts(instant, timeZone));
  return `${sunday.year}-${pad2(sunday.month)}-${pad2(sunday.day)}`;
}

function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = lookup.hour === "24" ? 0 : Number(lookup.hour);
  const asUtcMs = Date.UTC(Number(lookup.year), Number(lookup.month) - 1, Number(lookup.day), hour, Number(lookup.minute));
  return Math.round((asUtcMs - instant.getTime()) / 60_000);
}

function zonedDateTimeToMs(parts: DateParts, hour: number, minute: number, timeZone: string): number {
  const naiveMs = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute);
  const offsetMinutes = timeZoneOffsetMinutes(new Date(naiveMs), timeZone);
  return naiveMs - offsetMinutes * 60_000;
}

export function nextDailyResetMs(instant: Date, timeZone: string): number {
  const today = wallClockDateParts(instant, timeZone);
  return zonedDateTimeToMs({ year: today.year, month: today.month, day: today.day + 1 }, 0, 0, timeZone);
}

export function nextWeeklyResetMs(instant: Date, timeZone: string): number {
  const sunday = sundayOf(wallClockDateParts(instant, timeZone));
  return zonedDateTimeToMs({ year: sunday.year, month: sunday.month, day: sunday.day + 7 }, 0, 0, timeZone);
}
