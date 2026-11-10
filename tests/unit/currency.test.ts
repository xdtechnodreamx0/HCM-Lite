import { describe, expect, it } from "vitest";
import { fromPaisa, percentOfPaisa, roundPaisa, toPaisa } from "@/lib/currency";

describe("PKR money helpers", () => {
  it("converts rupees to paisa and back", () => {
    expect(toPaisa(1_250.5)).toBe(125_050);
    expect(fromPaisa(125_050)).toBe(1_250.5);
    expect(toPaisa(10.005)).toBe(1_001);
  });

  it("rejects non-finite money amounts", () => {
    expect(() => toPaisa(Number.POSITIVE_INFINITY)).toThrow("Invalid money amount");
    expect(() => toPaisa(Number.NaN)).toThrow("Invalid money amount");
  });

  it("calculates percentages and rounds paisa", () => {
    expect(percentOfPaisa(10_000_000, 40)).toBe(4_000_000);
    expect(percentOfPaisa(10_000_001, 10)).toBe(1_000_000);
    expect(roundPaisa(10.5)).toBe(11);
    expect(roundPaisa(10.49)).toBe(10);
  });
});
