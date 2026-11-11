import { describe, expect, it } from "vitest";
import { GEMINI_FREE_TIER_MODELS, geminiModelCandidates, isModelUnavailableError } from "@/lib/ai-models";

describe("Gemini free-tier model selection", () => {
  it("uses the configured model first and keeps an ordered fallback list", () => {
    expect(geminiModelCandidates("gemini-2.5-flash-lite")).toEqual([
      "gemini-2.5-flash-lite",
      ...GEMINI_FREE_TIER_MODELS,
    ]);
  });

  it("does not duplicate a configured model that is already a default", () => {
    expect(geminiModelCandidates("gemini-2.0-flash")).toEqual([
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ]);
  });

  it("falls back to the free-tier list when no model is configured", () => {
    expect(geminiModelCandidates("  ")).toEqual([...GEMINI_FREE_TIER_MODELS]);
    expect(geminiModelCandidates(null)).toEqual([...GEMINI_FREE_TIER_MODELS]);
  });

  it("recognises retired or unavailable models but not transient failures", () => {
    expect(isModelUnavailableError(new Error("models/gemini-3.8-flash is not found for API version v1beta"))).toBe(true);
    expect(isModelUnavailableError(new Error("This model is no longer supported"))).toBe(true);
    expect(isModelUnavailableError(new Error("insufficient quota"))).toBe(false);
    expect(isModelUnavailableError(new Error("API key not valid"))).toBe(false);
  });
});
