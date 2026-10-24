import { percentOfPaisa, roundPaisa } from "@/lib/currency";
import { monthlyTaxFromAnnualGross } from "@/lib/tax-rules";

export function salaryComposition(basicPaisa: number) {
  const hraPaisa = percentOfPaisa(basicPaisa, 40);
  const medicalPaisa = percentOfPaisa(basicPaisa, 10);
  const grossPaisa = basicPaisa + hraPaisa + medicalPaisa;
  return { basicPaisa, hraPaisa, medicalPaisa, grossPaisa };
}

export type DeductionInputs = {
  absentDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
};

export function deductibleDays(input: DeductionInputs) {
  return input.absentDays + input.unpaidLeaveDays + input.halfDays * 0.5;
}

export function perDayGross(grossPaisa: number, workingDays: number) {
  if (workingDays <= 0) return 0;
  return roundPaisa(grossPaisa / workingDays);
}

export function calculatePayslip(input: {
  basicPaisa: number;
  workingDays: number;
  payableDays: number;
  deductions: DeductionInputs;
}) {
  const composition = salaryComposition(input.basicPaisa);
  const dayRate = perDayGross(composition.grossPaisa, input.workingDays);
  const deductedDays = deductibleDays(input.deductions);
  const paidDays = Math.max(0, input.payableDays - deductedDays);
  const grossPayablePaisa = roundPaisa(dayRate * paidDays);
  const annualGrossPaisa = composition.grossPaisa * 12;
  const taxPaisa = monthlyTaxFromAnnualGross(annualGrossPaisa);
  const netPaisa = Math.max(0, grossPayablePaisa - taxPaisa);
  return {
    ...composition,
    workingDays: input.workingDays,
    payableDays: input.payableDays,
    deductedDays,
    paidDays,
    perDayPaisa: dayRate,
    grossPayablePaisa,
    annualGrossPaisa,
    taxPaisa,
    netPaisa,
    formulaVersion: "hcm-lite-brief-v1",
  };
}
