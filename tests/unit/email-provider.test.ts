import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEmailProvider } from "@/lib/env";

const KEYS = [
  "MONGODB_URI", "SESSION_SECRET", "MONGODB_DB", "APP_BASE_URL",
  "EMAIL_PROVIDER", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS",
  "RESEND_API_KEY", "EMAIL_FROM",
] as const;
const original = new Map(KEYS.map((key) => [key, process.env[key]]));

function resetEnv() {
  for (const key of KEYS) delete process.env[key];
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
}

function configureSmtp() {
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_USER = "owner@gmail.com";
  process.env.SMTP_PASS = "app-password";
  process.env.EMAIL_FROM = "HCM Lite <owner@gmail.com>";
}

function configureResend() {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "HCM Lite <team@example.com>";
}

describe("email provider selection", () => {
  beforeEach(resetEnv);

  afterEach(() => {
    for (const key of KEYS) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("reports no provider when email is not configured", () => {
    expect(getEmailProvider()).toBeNull();
  });

  it("uses Resend when only Resend is configured", () => {
    configureResend();
    expect(getEmailProvider()).toMatchObject({ kind: "resend", apiKey: "re_test_key", from: "HCM Lite <team@example.com>" });
  });

  it("prefers SMTP when both providers are configured", () => {
    configureSmtp();
    configureResend();
    expect(getEmailProvider()).toMatchObject({
      kind: "smtp", host: "smtp.gmail.com", port: 465, secure: true, user: "owner@gmail.com",
    });
  });

  it("lets EMAIL_PROVIDER force Resend", () => {
    configureSmtp();
    configureResend();
    process.env.EMAIL_PROVIDER = "resend";
    expect(getEmailProvider()).toMatchObject({ kind: "resend" });
  });

  it("rejects an incomplete email configuration instead of silently disabling it", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    expect(() => getEmailProvider()).toThrow(/missing part of its configuration/i);
  });

  it("rejects an unknown provider name", () => {
    configureSmtp();
    process.env.EMAIL_PROVIDER = "carrier-pigeon";
    expect(() => getEmailProvider()).toThrow(/EMAIL_PROVIDER/);
  });
});
