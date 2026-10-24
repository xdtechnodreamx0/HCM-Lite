import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { requireRole } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { writeAudit } from "@/server/services/audit.service";
import type { SessionUser } from "@/lib/types";

export async function listAnnouncements(actor: SessionUser) {
  const db = await collections();
  return db.announcements.find({ companyId: actor.companyId, active: true }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function createAnnouncement(actor: SessionUser, raw: unknown) {
  requireRole(actor, ["ADMIN", "HR"]);
  const input = z.object({ title: z.string().trim().min(3).max(100), body: z.string().trim().min(5).max(1200) }).parse(raw);
  const db = await collections();
  const id = createId("ann");
  const now = new Date();
  await db.announcements.insertOne({ id, companyId: actor.companyId, ...input, authorId: actor.id, authorName: actor.name, active: true, createdAt: now });
  const users = db.users.find({ companyId: actor.companyId, active: true }, { projection: { _id: 0, id: 1 } });
  let notificationBatch: Array<Record<string, unknown>> = [];
  for await (const user of users) {
    notificationBatch.push({
      id: createId("ntf"), companyId: actor.companyId, recipientUserId: user.id,
      title: input.title, body: input.body, href: "/announcements", read: false, createdAt: now,
    });
    if (notificationBatch.length === 500) {
      await db.notifications.insertMany(notificationBatch);
      notificationBatch = [];
    }
  }
  if (notificationBatch.length) await db.notifications.insertMany(notificationBatch);
  await writeAudit({ actor, companyId: actor.companyId, action: "announcement.create", entity: "announcement", entityId: id, after: input });
  return { id };
}

export async function listMyNotifications(actor: SessionUser) {
  const db = await collections();
  return db.notifications.find({ companyId: actor.companyId, recipientUserId: actor.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function setNotificationRead(actor: SessionUser, notificationId: string) {
  const db = await collections();
  const result = await db.notifications.updateOne(
    { companyId: actor.companyId, recipientUserId: actor.id, id: notificationId },
    { $set: { read: true, readAt: new Date() } },
  );
  if (result.matchedCount !== 1) throw new AppError(404, "Notification not found.");
  return { read: true };
}

export async function listAuditForAdmin(actor: SessionUser) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  return db.auditLogs.find({ companyId: actor.companyId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
}
