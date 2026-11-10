import { describe, expect, it } from "vitest";
import {
  absenteeism, attendanceRate, attrition, formatMetric, latePercent,
  leaveUtilization, safeRatio,
} from "@/lib/dashboard-metrics";

describe("dashboard metrics", () => {
  it("returns null instead of dividing by zero", () => {
    expect(safeRatio(1, 0)).toBeNull();
    expect(attendanceRate({ present: 0, late: 0, missingCheckout: 0, halfDay: 0, workingDayRecords: 0, onLeave: 0 })).toBeNull();
  });

  it("weights half days and excludes approved leave from the denominator", () => {
    expect(attendanceRate({
      present: 10, late: 2, missingCheckout: 1, halfDay: 2, workingDayRecords: 20, onLeave: 2,
    })).toBeCloseTo(14 / 18, 5);
  });

  it("calculates late percentage, absenteeism, and leave utilization", () => {
    expect(latePercent(3, 17)).toBeCloseTo(0.15, 5);
    expect(absenteeism(2, 40)).toBeCloseTo(0.05, 5);
    expect(leaveUtilization(7, 14)).toBeCloseTo(0.5, 5);
  });

  it("calculates attrition against average headcount", () => {
    expect(attrition(3, 100, 80)).toBeCloseTo((3 / 90) * 100, 5);
    expect(attrition(0, 0, 0)).toBeNull();
  });

  it("formats metrics honestly and consistently", () => {
    expect(formatMetric(null)).toBe("N/A");
    expect(formatMetric(Number.NaN)).toBe("N/A");
    expect(formatMetric(2)).toBe("2.00");
    expect(formatMetric(0.5, true)).toBe("50.0%");
  });
});
