export const DEFAULT_TIMEZONE = "Asia/Karachi";
export const DEFAULT_WEEKENDS = [0, 6] as const;

export type CalendarSettings = {
  timezone: string;
  weekendDays: number[];
  holidays: string[];
};

export function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function toIsoDate(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function weekday(isoDate: string, timeZone: string) {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function eachIsoDate(start: string, end: string) {
  if (start > end) return [];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function isWeekend(isoDate: string, settings: CalendarSettings) {
  return settings.weekendDays.includes(weekday(isoDate, settings.timezone));
}

export function isHoliday(isoDate: string, settings: CalendarSettings) {
  return settings.holidays.includes(isoDate);
}

export function isWorkday(isoDate: string, settings: CalendarSettings) {
  return !isWeekend(isoDate, settings) && !isHoliday(isoDate, settings);
}

export function workdaysBetween(start: string, end: string, settings: CalendarSettings) {
  return eachIsoDate(start, end).filter((date) => isWorkday(date, settings));
}

export function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { hour: h, minute: m };
}

export function secondsSinceMidnight(hour: number, minute: number, second: number) {
  return hour * 3600 + minute * 60 + second;
}

export function currentYear(timeZone: string, date = new Date()) {
  return zonedParts(date, timeZone).year;
}
