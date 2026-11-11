// Gemini model selection lives here so the free tier keeps working even when
// a configured model is retired or unavailable on a given API key.
export const GEMINI_FREE_TIER_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

/**
 * Ordered unique list of models to try: the configured model first, then the
 * current free-tier models as fallbacks.
 */
export function geminiModelCandidates(configured?: string | null): string[] {
  const models = [configured?.trim(), ...GEMINI_FREE_TIER_MODELS].filter(
    (model): model is string => Boolean(model),
  );
  return [...new Set(models)];
}

/**
 * True when a Gemini error means the model itself is unavailable for this key,
 * rather than a transient or input error.
 */
export function isModelUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /not found|unsupported|not supported|no longer supported|does not exist|invalid model|model.*(deprecated|retired)|404/i.test(message);
}
