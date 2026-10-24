import { presenceEquivalent } from "@/lib/attendance-rules";

export function safeRatio(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function attendanceRate(input: {
  present: number;
  late: number;
  missingCheckout: number;
  halfDay: number;
  workingDayRecords: number;
  onLeave: number;
}) {
  const presence =
    input.present + input.late + input.missingCheckout + 0.5 * input.halfDay;
  return safeRatio(presence, input.workingDayRecords - input.onLeave);
}

export function latePercent(late: number, present: number) {
  return safeRatio(late, present + late);
}

export function absenteeism(absentDays: number, expectedWorkingDays: number) {
  return safeRatio(absentDays, expectedWorkingDays);
}

export function leaveUtilization(approvedDays: number, quota: number) {
  return safeRatio(approvedDays, quota);
}

export function attrition(exits: number, startHeadcount: number, endHeadcount: number) {
  const average = (startHeadcount + endHeadcount) / 2;
  const ratio = safeRatio(exits, average);
  return ratio === null ? null : ratio * 100;
}

export function formatMetric(value: number | null, asPercent = false) {
  if (value === null || Number.isNaN(value)) return "N/A";
  if (asPercent) return `${(value * (asPercent && value <= 1 ? 100 : 1)).toFixed(1)}%`;
  return value.toFixed(2);
}

export { presenceEquivalent };
