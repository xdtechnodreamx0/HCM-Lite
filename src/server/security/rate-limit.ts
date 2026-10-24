import { AppError } from "@/lib/errors";
import { collections } from "@/server/db/collections";

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const db = await collections();
  const now = Date.now();
  const nextWindow = now + windowMs;
  const expired = { $lte: [{ $ifNull: ["$resetAt", 0] }, now] };
  const resetAt = { $cond: [expired, nextWindow, "$resetAt"] };
  const update = [{ $set: {
    key,
    count: { $cond: [expired, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
    resetAt,
    expiresAt: { $toDate: resetAt },
  } }];
  let updated;
  try {
    updated = await db.rateLimits.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: "after", includeResultMetadata: false });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    updated = await db.rateLimits.findOneAndUpdate({ key }, update, { returnDocument: "after", includeResultMetadata: false });
  }
  if (Number(updated?.count ?? 0) > limit) {
    throw new AppError(429, "Too many requests. Please try again later.", "RATE_LIMIT");
  }
}
