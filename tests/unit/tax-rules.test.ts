import { describe, expect, it } from "vitest";
import { annualTaxPaisa, ILLUSTRATIVE_TAX_SLABS, monthlyTaxFromAnnualGross } from "@/lib/tax-rules";

describe("illustrative annual tax slabs", () => {
  it("applies zero tax at and below the exemption threshold", () => {
    expect(annualTaxPaisa(0)).toBe(0);
    expect(annualTaxPaisa(-1)).toBe(0);
    expect(annualTaxPaisa(60_000_000)).toBe(0);
  });

  it("applies each slab boundary exactly", () => {
    expect(annualTaxPaisa(120_000_000)).toBe(3_000_000);
    expect(annualTaxPaisa(240_000_000)).toBe(21_000_000);
    expect(annualTaxPaisa(360_000_000)).toBe(51_000_000);
    expect(annualTaxPaisa(400_000_000)).toBe(65_000_000);
  });

  it("adds only the excess amount above a slab base", () => {
    expect(annualTaxPaisa(61_000_000)).toBe(50_000);
    expect(annualTaxPaisa(61_000_000, ILLUSTRATIVE_TAX_SLABS)).toBe(50_000);
  });

  it("converts annual tax to a monthly payroll deduction", () => {
    expect(monthlyTaxFromAnnualGross(120_000_000)).toBe(250_000);
    expect(monthlyTaxFromAnnualGross(0)).toBe(0);
    expect(monthlyTaxFromAnnualGross(-500)).toBe(0);
  });
});
