import { describe, expect, it } from "vitest";
import { haversineMeters, isInsideGeofence } from "@/lib/geo";

const office = { lat: 24.8607, lng: 67.0011 };

describe("geofenced attendance", () => {
  it("returns zero distance for the same point", () => {
    expect(haversineMeters(office, office)).toBe(0);
  });

  it("measures a short northward offset accurately", () => {
    const distance = haversineMeters(office, { lat: office.lat + 0.009, lng: office.lng });
    expect(distance).toBeGreaterThan(990);
    expect(distance).toBeLessThan(1_010);
  });

  it("accepts a point inside the office radius", () => {
    const result = isInsideGeofence({
      office,
      point: { lat: office.lat + 0.0004, lng: office.lng },
      radiusMeters: 150,
      accuracyMeters: 20,
    });
    expect(result.ok).toBe(true);
    expect(result.distance).toBeLessThan(150);
  });

  it("rejects a point outside the office radius", () => {
    const result = isInsideGeofence({
      office,
      point: { lat: office.lat + 0.01, lng: office.lng },
      radiusMeters: 150,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/outside/i);
  });

  it("rejects an imprecise GPS reading even if it is nearby", () => {
    const result = isInsideGeofence({
      office,
      point: office,
      radiusMeters: 500,
      accuracyMeters: 101,
    });
    expect(result).toEqual({ ok: false, reason: "GPS accuracy is worse than 100 metres." });
  });
});
