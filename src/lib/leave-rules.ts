import { workdaysBetween, type CalendarSettings } from "@/lib/dates";

export const DEFAULT_LEAVE_TYPES = [
  { code: "annual", name: "Annual leave", yearlyQuota: 14, unlimited: false },
  { code: "sick", name: "Sick leave", yearlyQuota: 8, unlimited: false },
  { code: "casual", name: "Casual leave", yearlyQuota: 10, unlimited: false },
  { code: "unpaid", name: "Unpaid leave", yearlyQuota: 0, unlimited: true },
] as const;

export function countedLeaveDays(start: string, end: string, calendar: CalendarSettings) {
  return workdaysBetween(start, end, calendar);
}

export function remainingBalance(input: {
  quota: number;
  unlimited: boolean;
  approvedDays: number;
}) {
  if (input.unlimited) return Number.POSITIVE_INFINITY;
  return input.quota - input.approvedDays;
}

export function canApply(input: {
  start: string;
  end: string;
  unlimited: boolean;
  quota: number;
  approvedDays: number;
  requestedDays: number;
}) {
  if (input.start > input.end) return { ok: false, reason: "Start date must be on or before end date." };
  if (input.requestedDays <= 0) {
    return { ok: false, reason: "Leave must include at least one working day." };
  }
  if (!input.unlimited && input.approvedDays + input.requestedDays > input.quota) {
    return { ok: false, reason: "Insufficient leave balance." };
  }
  return { ok: true };
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}
