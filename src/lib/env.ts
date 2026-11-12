import { AppError } from "@/lib/errors";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(500, `Missing required environment variable ${name}.`);
  }
  return value;
}

function smtpPort() {
  const raw = process.env.SMTP_PORT?.trim();
  if (!raw) return 465;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(500, "SMTP_PORT must be a valid TCP port.");
  }
  return port;
}

export function getEnv() {
  const mongodbUri = required("MONGODB_URI");
  const mongodbDb = process.env.MONGODB_DB?.trim() || "hcm_lite";
  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new AppError(500, "SESSION_SECRET must be at least 32 characters.");
  }
  const port = smtpPort();
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  return {
    mongodbUri,
    mongodbDb,
    sessionSecret,
    appBaseUrl: resolveAppBaseUrl(),
    nodeEnv: process.env.NODE_ENV || "development",
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "",
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-flash-lite-latest",
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    emailFrom: process.env.EMAIL_FROM?.trim() || "",
    smtpHost: process.env.SMTP_HOST?.trim() || "",
    smtpPort: port,
    smtpSecure: secureSetting ? secureSetting === "true" : port === 465,
    smtpUser: process.env.SMTP_USER?.trim() || "",
    smtpPass: process.env.SMTP_PASS?.trim() || "",
    demoMode: process.env.DEMO_MODE === "true",
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

export type EmailProvider =
  | { kind: "resend"; apiKey: string; from: string; baseUrl: string }
  | { kind: "smtp"; host: string; port: number; secure: boolean; user: string; pass: string; from: string; baseUrl: string };

/**
 * Email can come from Resend or from any SMTP account. SMTP is preferred when
 * both are configured because it can send to arbitrary recipients without a
 * verified domain. Set EMAIL_PROVIDER=resend to force Resend after a domain is
 * verified there.
 */
export function getEmailProvider(): EmailProvider | null {
  const env = getEnv();
  const requested = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (requested && requested !== "resend" && requested !== "smtp") {
    throw new AppError(500, 'EMAIL_PROVIDER must be either "resend" or "smtp".');
  }
  const smtpConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.emailFrom);
  const smtpPartial = Boolean(env.smtpHost || env.smtpUser || env.smtpPass || process.env.SMTP_PORT || process.env.SMTP_SECURE);
  const resendConfigured = Boolean(env.resendApiKey && env.emailFrom);
  const resendPartial = Boolean(env.resendApiKey || env.emailFrom);

  if (requested === "smtp") {
    if (!smtpConfigured) {
      throw new AppError(500, "Configure SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM to enable SMTP email.");
    }
    return { kind: "smtp", host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure, user: env.smtpUser, pass: env.smtpPass, from: env.emailFrom, baseUrl: env.appBaseUrl };
  }
  if (requested === "resend") {
    if (!resendConfigured) {
      throw new AppError(500, "Configure RESEND_API_KEY and EMAIL_FROM to enable Resend email.");
    }
    return { kind: "resend", apiKey: env.resendApiKey, from: env.emailFrom, baseUrl: env.appBaseUrl };
  }
  if (smtpConfigured) {
    return { kind: "smtp", host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure, user: env.smtpUser, pass: env.smtpPass, from: env.emailFrom, baseUrl: env.appBaseUrl };
  }
  if (resendConfigured) {
    return { kind: "resend", apiKey: env.resendApiKey, from: env.emailFrom, baseUrl: env.appBaseUrl };
  }
  if (smtpPartial || resendPartial) {
    throw new AppError(500, "Email delivery is missing part of its configuration. Set either SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM, or RESEND_API_KEY and EMAIL_FROM.");
  }
  return null;
}

/** Safe for status flags: incomplete configuration reports as disabled instead of throwing. */
export function isEmailConfigured() {
  try {
    return Boolean(getEmailProvider());
  } catch {
    return false;
  }
}

export function isTestDatabaseName(name: string) {
  return /(^|_|-)test($|_)/i.test(name) || name.toLowerCase().endsWith("-test");
}
