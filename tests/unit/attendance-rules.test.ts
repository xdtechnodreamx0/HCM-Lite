import { describe, expect, it } from "vitest";
import {
  classifyAttendance, HALF_DAY_SECONDS, isHalfDay, isLate, presenceEquivalent,
  workedSeconds, type AttendancePolicy,
} from "@/lib/attendance-rules";

const policy: AttendancePolicy = {
  timezone: "Asia/Karachi", weekendDays: [0, 6], holidays: [],
  officeStart: "09:00", graceMinutes: 15,
};

// Karachi is UTC+5. 09:16 local is 04:16 UTC.
const localTime = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);

describe("attendance rules", () => {
  it("honours the 15-minute grace period exactly", () => {
    expect(isLate(localTime("04:15"), policy)).toBe(false);
    expect(isLate(localTime("04:16"), policy)).toBe(true);
    expect(isLate(localTime("03:55"), policy)).toBe(false);
  });

  it("marks a missing checkout without pretending the day is complete", () => {
    const result = classifyAttendance({ checkInAt: localTime("04:00"), checkOutAt: null, policy });
    expect(result).toMatchObject({ status: "missing_checkout", late: false, halfDay: false, missingCheckout: true, workedSeconds: 0 });
    const lateResult = classifyAttendance({ checkInAt: localTime("04:30"), checkOutAt: null, policy });
    expect(lateResult).toMatchObject({ status: "late", late: true, missingCheckout: true });
  });

  it("classifies full, late, and half days from recorded hours", () => {
    const full = classifyAttendance({ checkInAt: localTime("04:00"), checkOutAt: localTime("09:00"), policy });
    expect(full.status).toBe("present");
    expect(full.workedSeconds).toBe(HALF_DAY_SECONDS);

    const late = classifyAttendance({ checkInAt: localTime("04:30"), checkOutAt: localTime("10:00"), policy });
    expect(late).toMatchObject({ status: "late", late: true, halfDay: false });

    const half = classifyAttendance({ checkInAt: localTime("04:00"), checkOutAt: localTime("08:59"), policy });
    expect(half).toMatchObject({ status: "half_day", late: false, halfDay: true });
  });

  it("never reports negative worked time", () => {
    expect(workedSeconds(localTime("10:00"), localTime("09:00"))).toBe(0);
    expect(isHalfDay(HALF_DAY_SECONDS - 1)).toBe(true);
    expect(isHalfDay(HALF_DAY_SECONDS)).toBe(false);
  });

  it("maps statuses to presence equivalents used by the dashboard", () => {
    expect(presenceEquivalent("present")).toBe(1);
    expect(presenceEquivalent("late")).toBe(1);
    expect(presenceEquivalent("missing_checkout")).toBe(1);
    expect(presenceEquivalent("half_day")).toBe(0.5);
    expect(presenceEquivalent("absent")).toBe(0);
    expect(presenceEquivalent("on_leave")).toBe(0);
  });
});
