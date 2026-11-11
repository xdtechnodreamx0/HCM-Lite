import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertSameOrigin, getRequestOrigin } from "@/server/auth/csrf";

const originalEnv = { ...process.env };

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function request(origin: string | null, init?: { method?: string; headers?: Record<string, string> }) {
  return new Request("http://internal:3000/api/setup", {
    method: init?.method ?? "POST",
    headers: {
      ...(origin ? { origin } : {}),
      ...init?.headers,
    },
  });
}

describe("same-origin request validation", () => {
  beforeEach(() => {
    setNodeEnv("production");
    process.env.APP_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("derives the public origin from Vercel forwarding headers", () => {
    const req = request("https://hcmlite-beta.vercel.app", {
      headers: { "x-forwarded-host": "hcmlite-beta.vercel.app", "x-forwarded-proto": "https" },
    });
    expect(getRequestOrigin(req)).toBe("https://hcmlite-beta.vercel.app");
  });

  it("accepts the deployment's real host even when APP_BASE_URL is localhost", () => {
    const req = request("https://hcmlite-beta.vercel.app", {
      headers: { "x-forwarded-host": "hcmlite-beta.vercel.app", "x-forwarded-proto": "https" },
    });
    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("accepts the configured public base URL", () => {
    process.env.APP_BASE_URL = "https://hcm.example.com";
    expect(() => assertSameOrigin(request("https://hcm.example.com"))).not.toThrow();
  });

  it("rejects a foreign origin in production", () => {
    expect(() =>
      assertSameOrigin(
        request("https://attacker.example", {
          headers: { "x-forwarded-host": "hcmlite-beta.vercel.app", "x-forwarded-proto": "https" },
        }),
      ),
    ).toThrowError("Invalid request origin.");
  });

  it("rejects a missing origin in production", () => {
    expect(() => assertSameOrigin(request(null))).toThrowError("Request origin is required.");
  });

  it("rejects a malformed origin", () => {
    expect(() => assertSameOrigin(request("null"))).toThrowError("Invalid request origin.");
  });

  it("always allows read-only requests", () => {
    const foreign = request("https://attacker.example", { method: "GET" });
    expect(() => assertSameOrigin(foreign)).not.toThrow();
  });

  it("keeps local development tolerant of host aliases", () => {
    setNodeEnv("development");
    expect(() => assertSameOrigin(request("http://127.0.0.1:3000"))).not.toThrow();
  });
});
