import { roundPaisa } from "@/lib/currency";

export type TaxSlab = {
  upToPaisa: number | null;
  basePaisa: number;
  ratePercent: number;
  excessOverPaisa: number;
};

export const ILLUSTRATIVE_TAX_SLABS: TaxSlab[] = [
  { upToPaisa: 60_000_000, basePaisa: 0, ratePercent: 0, excessOverPaisa: 0 },
  { upToPaisa: 120_000_000, basePaisa: 0, ratePercent: 5, excessOverPaisa: 60_000_000 },
  { upToPaisa: 240_000_000, basePaisa: 3_000_000, ratePercent: 15, excessOverPaisa: 120_000_000 },
  { upToPaisa: 360_000_000, basePaisa: 21_000_000, ratePercent: 25, excessOverPaisa: 240_000_000 },
  { upToPaisa: null, basePaisa: 51_000_000, ratePercent: 35, excessOverPaisa: 360_000_000 },
];

export function annualTaxPaisa(annualGrossPaisa: number, slabs = ILLUSTRATIVE_TAX_SLABS) {
  const income = Math.max(0, annualGrossPaisa);
  for (const slab of slabs) {
    if (slab.upToPaisa === null || income <= slab.upToPaisa) {
      const excess = Math.max(0, income - slab.excessOverPaisa);
      return roundPaisa(slab.basePaisa + (excess * slab.ratePercent) / 100);
    }
  }
  return 0;
}

export function monthlyTaxFromAnnualGross(annualGrossPaisa: number) {
  return roundPaisa(annualTaxPaisa(annualGrossPaisa) / 12);
}
