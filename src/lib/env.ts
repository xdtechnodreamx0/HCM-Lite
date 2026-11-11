import { AppError } from "@/lib/errors";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(500, `Missing required environment variable ${name}.`);
  }
  return value;
}

export function getEnv() {
  const mongodbUri = required("MONGODB_URI");
  const mongodbDb = process.env.MONGODB_DB?.trim() || "hcm_lite";
  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new AppError(500, "SESSION_SECRET must be at least 32 characters.");
  }
  return {
    mongodbUri,
    mongodbDb,
    sessionSecret,
    appBaseUrl: resolveAppBaseUrl(),
    nodeEnv: process.env.NODE_ENV || "development",
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "",
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    emailFrom: process.env.EMAIL_FROM?.trim() || "",
  };
}

/**
 * Email links must never point at localhost from a hosted deployment. Vercel
 * exposes the stable production URL; prefer it when APP_BASE_URL is missing or
 * still holds a local development address.
 */
function resolveAppBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const configuredIsLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(configured);
  if (vercelHost && configuredIsLocal) return `https://${vercelHost.replace(/^https?:\/\//, "")}`;
  return configured || "http://localhost:3000";
}

export function getEmailProvider() {
  const env = getEnv();
  if (Boolean(env.resendApiKey) !== Boolean(env.emailFrom)) {
    throw new AppError(500, "Configure both RESEND_API_KEY and EMAIL_FROM to enable email verification.");
  }
  return env.resendApiKey && env.emailFrom
    ? { apiKey: env.resendApiKey, from: env.emailFrom, baseUrl: env.appBaseUrl }
    : null;
}

export function isTestDatabaseName(name: string) {
  return /(^|_|-)test($|_)/i.test(name) || name.toLowerCase().endsWith("-test");
}
