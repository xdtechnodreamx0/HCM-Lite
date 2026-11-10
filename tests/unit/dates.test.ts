import { describe, expect, it } from "vitest";
import {
  addDays, currentYear, eachIsoDate, isHoliday, isWeekend, isWorkday, monthRange,
  parseHm, secondsSinceMidnight, toIsoDate, weekday, workdaysBetween, zonedParts,
} from "@/lib/dates";

const calendar = { timezone: "Asia/Karachi", weekendDays: [0, 6], holidays: ["2026-11-11"] };

describe("dates", () => {
  it("converts a UTC instant to the company-local ISO date", () => {
    expect(toIsoDate(new Date("2026-11-09T20:00:00.000Z"), "Asia/Karachi")).toBe("2026-11-10");
    expect(toIsoDate(new Date("2026-11-09T18:59:59.000Z"), "Asia/Karachi")).toBe("2026-11-09");
    expect(zonedParts(new Date("2026-11-09T20:15:30.000Z"), "Asia/Karachi")).toMatchObject({
      year: 2026, month: 11, day: 10, hour: 1, minute: 15, second: 30,
    });
  });

  it("finds the local weekday for an ISO date", () => {
    expect(weekday("2026-11-09", "Asia/Karachi")).toBe(1);
    expect(weekday("2026-11-15", "Asia/Karachi")).toBe(0);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(eachIsoDate("2026-11-09", "2026-11-11")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    expect(eachIsoDate("2026-11-11", "2026-11-09")).toEqual([]);
  });

  it("builds an accurate calendar month, including leap February", () => {
    expect(monthRange(2026, 11)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange(2024, 2)).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(monthRange(2025, 2)).toEqual({ start: "2025-02-01", end: "2025-02-28" });
  });

  it("excludes weekends and configured holidays from workdays", () => {
    expect(isWeekend("2026-11-14", calendar)).toBe(true);
    expect(isHoliday("2026-11-11", calendar)).toBe(true);
    expect(isWorkday("2026-11-11", calendar)).toBe(false);
    expect(isWorkday("2026-11-12", calendar)).toBe(true);
    expect(workdaysBetween("2026-11-09", "2026-11-15", calendar)).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-12", "2026-11-13",
    ]);
  });

  it("parses office hours and seconds since midnight", () => {
    expect(parseHm("09:15")).toEqual({ hour: 9, minute: 15 });
    expect(parseHm("00:00")).toEqual({ hour: 0, minute: 0 });
    expect(secondsSinceMidnight(9, 15, 0)).toBe(33_300);
    expect(secondsSinceMidnight(23, 59, 59)).toBe(86_399);
  });

  it("resolves the current year in company time at a year boundary", () => {
    expect(currentYear("Asia/Karachi", new Date("2025-12-31T20:00:00.000Z"))).toBe(2026);
    expect(currentYear("Asia/Karachi", new Date("2025-12-31T18:00:00.000Z"))).toBe(2025);
  });
});
