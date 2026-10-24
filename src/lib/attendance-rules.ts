import {
  type CalendarSettings,
  parseHm,
  secondsSinceMidnight,
  zonedParts,
} from "@/lib/dates";

export const DEFAULT_OFFICE_START = "09:00";
export const DEFAULT_GRACE_MINUTES = 15;
export const HALF_DAY_SECONDS = 5 * 60 * 60;

export type AttendancePolicy = CalendarSettings & {
  officeStart: string;
  graceMinutes: number;
};

export function isLate(checkIn: Date, policy: AttendancePolicy) {
  const local = zonedParts(checkIn, policy.timezone);
  const start = parseHm(policy.officeStart);
  const graceEnd = start.hour * 3600 + (start.minute + policy.graceMinutes) * 60;
  const arrived = secondsSinceMidnight(local.hour, local.minute, local.second);
  return arrived > graceEnd;
}

export function workedSeconds(checkIn: Date, checkOut: Date) {
  const seconds = Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000);
  return Math.max(0, seconds);
}

export function isHalfDay(seconds: number) {
  return seconds < HALF_DAY_SECONDS;
}

export function classifyAttendance(input: {
  checkInAt: Date;
  checkOutAt?: Date | null;
  policy: AttendancePolicy;
}) {
  const late = isLate(input.checkInAt, input.policy);
  if (!input.checkOutAt) {
    return {
      status: late ? ("late" as const) : ("missing_checkout" as const),
      late,
      halfDay: false,
      workedSeconds: 0,
      missingCheckout: true,
    };
  }
  const seconds = workedSeconds(input.checkInAt, input.checkOutAt);
  const halfDay = isHalfDay(seconds);
  const status = halfDay ? "half_day" : late ? "late" : "present";
  return {
    status: status as "present" | "late" | "half_day",
    late,
    halfDay,
    workedSeconds: seconds,
    missingCheckout: false,
  };
}

export function presenceEquivalent(status: string) {
  if (status === "half_day") return 0.5;
  if (status === "present" || status === "late" || status === "missing_checkout") return 1;
  return 0;
}
