import { describe, expect, it } from "vitest";
import { calculatePayslip, deductibleDays, perDayGross, salaryComposition } from "@/lib/payroll-rules";

describe("payroll rules", () => {
  it("builds gross pay from basic, 40% HRA, and 10% medical", () => {
    expect(salaryComposition(10_000_000)).toEqual({
      basicPaisa: 10_000_000,
      hraPaisa: 4_000_000,
      medicalPaisa: 1_000_000,
      grossPaisa: 15_000_000,
    });
  });

  it("counts half days as half a deducted day", () => {
    expect(deductibleDays({ absentDays: 1, unpaidLeaveDays: 2, halfDays: 3 })).toBe(4.5);
  });

  it("calculates a clean full-month payslip", () => {
    const payslip = calculatePayslip({
      basicPaisa: 10_000_000,
      workingDays: 22,
      payableDays: 22,
      deductions: { absentDays: 0, unpaidLeaveDays: 0, halfDays: 0 },
    });
    expect(payslip.grossPaisa).toBe(15_000_000);
    expect(payslip.annualGrossPaisa).toBe(180_000_000);
    expect(payslip.perDayPaisa).toBe(681_818);
    expect(payslip.paidDays).toBe(22);
    expect(payslip.grossPayablePaisa).toBe(14_999_996);
    expect(payslip.taxPaisa).toBe(1_000_000);
    expect(payslip.netPaisa).toBe(13_999_996);
    expect(payslip.formulaVersion).toBe("hcm-lite-brief-v1");
  });

  it("deducts absences, unpaid leave, and half days from payable days", () => {
    const payslip = calculatePayslip({
      basicPaisa: 10_000_000,
      workingDays: 22,
      payableDays: 22,
      deductions: { absentDays: 2, unpaidLeaveDays: 1, halfDays: 2 },
    });
    expect(payslip.deductedDays).toBe(4);
    expect(payslip.paidDays).toBe(18);
    expect(payslip.grossPayablePaisa).toBe(12_272_724);
  });

  it("never produces negative paid days, gross pay, or net pay", () => {
    const payslip = calculatePayslip({
      basicPaisa: 10_000_000,
      workingDays: 22,
      payableDays: 1,
      deductions: { absentDays: 5, unpaidLeaveDays: 1, halfDays: 0 },
    });
    expect(payslip.paidDays).toBe(0);
    expect(payslip.grossPayablePaisa).toBe(0);
    expect(payslip.netPaisa).toBe(0);
    expect(perDayGross(15_000_000, 0)).toBe(0);
  });
});
