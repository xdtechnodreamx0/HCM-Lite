import { describe, expect, it } from "vitest";
import { GEMINI_FREE_TIER_MODELS, geminiModelCandidates, isModelOverloadedError, isModelRateLimitedError, isModelTimeoutError, isModelUnavailableError } from "@/lib/ai-models";

describe("Gemini free-tier model selection", () => {
  it("uses the configured model first and keeps an ordered fallback list", () => {
    expect(geminiModelCandidates("gemini-3.6-flash")).toEqual([
      "gemini-3.6-flash",
      ...GEMINI_FREE_TIER_MODELS,
    ]);
  });

  it("does not duplicate a configured model that is already a default", () => {
    expect(geminiModelCandidates("gemini-3.5-flash")).toEqual([
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
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

  it("retries another model when one is temporarily overloaded", () => {
    expect(isModelOverloadedError(new Error("This model is currently experiencing high demand"))).toBe(true);
    expect(isModelOverloadedError(new Error("503 UNAVAILABLE"))).toBe(true);
    expect(isModelOverloadedError(new Error("API key not valid"))).toBe(false);
    expect(isModelOverloadedError(new Error("insufficient quota"))).toBe(false);
  });

  it("retries another model when one has exhausted its per-model quota", () => {
    const apiError = Object.assign(new Error("Quota exceeded for metric: generate_content_free_tier_requests"), { status: 429 });
    expect(isModelRateLimitedError(apiError)).toBe(true);
    expect(isModelRateLimitedError(new Error("RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isModelRateLimitedError(new Error("API key not valid"))).toBe(false);
  });

  it("retries another model after a bounded per-model timeout", () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    expect(isModelTimeoutError(timeout)).toBe(true);
    expect(isModelTimeoutError(new Error("Request timed out"))).toBe(true);
    expect(isModelTimeoutError(new Error("API key not valid"))).toBe(false);
  });
});
