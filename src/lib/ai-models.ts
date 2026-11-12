// Gemini model selection lives here so the free tier keeps working even when
// a configured model is retired, overloaded, or out of daily quota. Free-tier
// quotas apply per model, so a sibling model can still answer.
export const GEMINI_FREE_TIER_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
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

/**
 * True when a model is temporarily overloaded, so another model may answer.
 * Auth and input errors are deliberately excluded.
 */
export function isModelOverloadedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /\b503\b|UNAVAILABLE|high demand|overloaded|temporarily unavailable/i.test(message);
}

/**
 * True when this model has exhausted its rate limit. Gemini applies free-tier
 * quotas per model, so a sibling model may still have capacity today.
 */
export function isModelRateLimitedError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (Number(status) === 429) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /RESOURCE_EXHAUSTED|quota exceeded|rate limit|too many requests/i.test(message);
}

/**
 * True when a single model call hit the client timeout. Another model can be
 * tried instead of failing the whole request.
 */
export function isModelTimeoutError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (Number(status) === 408 || Number(status) === 504) return true;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /timeout|timed out|ETIMEDOUT|aborted/i.test(`${name} ${message}`);
}
