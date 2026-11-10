import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("CSV handling", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv('name,note\r\nAyesha,"Lahore, PK"\r\nBilal,"Says ""hello"""\r\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Ayesha", "Lahore, PK"],
      ["Bilal", 'Says "hello"'],
    ]);
  });

  it("skips blank rows and keeps a final unpunctuated row", () => {
    expect(parseCsv("\nname,email\n\nAyesha,ayesha@example.com")).toEqual([
      ["name", "email"],
      ["Ayesha", "ayesha@example.com"],
    ]);
  });

  it("escapes commas, quotes, and spreadsheet formula starts", () => {
    const csv = toCsv([
      { name: "Ayesha", note: 'Lahore, "PK"' },
      { name: "=SUM(A1:A2)", note: "+92 300" },
    ]);
    expect(csv).toContain('"Lahore, ""PK"""');
    expect(csv).toContain(`"'=SUM(A1:A2)"`);
    expect(csv).toContain(`"'+92 300"`);
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
