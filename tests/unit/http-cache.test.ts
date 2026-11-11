import { describe, expect, it } from "vitest";
import { json } from "@/server/http";

describe("API JSON response headers", () => {
  it("prevents browsers and shared caches from storing account-specific data", async () => {
    const response = json({ initialized: true, user: null });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ initialized: true, user: null });
  });

  it("keeps the no-store policy on error responses", async () => {
    const response = json({ error: "Please sign in." }, 401);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
