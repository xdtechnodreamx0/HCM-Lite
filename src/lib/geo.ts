export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function isInsideGeofence(input: {
  office: { lat: number; lng: number };
  point: { lat: number; lng: number };
  radiusMeters: number;
  accuracyMeters?: number;
}) {
  if (input.accuracyMeters !== undefined && input.accuracyMeters > 100) {
    return { ok: false, reason: "GPS accuracy is worse than 100 metres." };
  }
  const distance = haversineMeters(input.office, input.point);
  if (distance > input.radiusMeters) {
    return { ok: false, reason: "Outside the office geofence.", distance };
  }
  return { ok: true, distance };
}
