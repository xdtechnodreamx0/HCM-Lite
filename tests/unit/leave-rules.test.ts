import { describe, expect, it } from "vitest";
import { canApply, countedLeaveDays, rangesOverlap, remainingBalance } from "@/lib/leave-rules";

const calendar = { timezone: "Asia/Karachi", weekendDays: [0, 6], holidays: ["2026-11-11"] };

describe("leave rules", () => {
  it("counts only configured working days", () => {
    expect(countedLeaveDays("2026-11-09", "2026-11-13", calendar)).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-12", "2026-11-13",
    ]);
    expect(countedLeaveDays("2026-11-14", "2026-11-15", calendar)).toEqual([]);
    expect(countedLeaveDays("2026-11-13", "2026-11-09", calendar)).toEqual([]);
  });

  it("rejects empty or reversed requests", () => {
    expect(canApply({ start: "2026-11-13", end: "2026-11-09", requestedDays: 0, unlimited: false, quota: 10, approvedDays: 0 }))
      .toEqual({ ok: false, reason: "Start date must be on or before end date." });
    expect(canApply({ start: "2026-11-14", end: "2026-11-15", requestedDays: 0, unlimited: false, quota: 10, approvedDays: 0 }))
      .toEqual({ ok: false, reason: "Leave must include at least one working day." });
  });

  it("enforces the remaining quota but allows unlimited leave types", () => {
    expect(canApply({ start: "2026-11-09", end: "2026-11-10", requestedDays: 2, unlimited: false, quota: 3, approvedDays: 2 }))
      .toEqual({ ok: false, reason: "Insufficient leave balance." });
    expect(canApply({ start: "2026-11-09", end: "2026-11-10", requestedDays: 2, unlimited: false, quota: 4, approvedDays: 2 }))
      .toEqual({ ok: true });
    expect(canApply({ start: "2026-11-09", end: "2026-11-10", requestedDays: 2, unlimited: true, quota: 0, approvedDays: 0 }))
      .toEqual({ ok: true });
  });

  it("reports remaining balance, including unlimited policies", () => {
    expect(remainingBalance({ quota: 14, approvedDays: 3, unlimited: false })).toBe(11);
    expect(remainingBalance({ quota: 0, approvedDays: 3, unlimited: true })).toBe(Number.POSITIVE_INFINITY);
  });

  it("detects overlapping date ranges at the edges", () => {
    expect(rangesOverlap("2026-11-09", "2026-11-11", "2026-11-11", "2026-11-13")).toBe(true);
    expect(rangesOverlap("2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12")).toBe(false);
    expect(rangesOverlap("2026-11-09", "2026-11-15", "2026-11-10", "2026-11-12")).toBe(true);
  });
});
