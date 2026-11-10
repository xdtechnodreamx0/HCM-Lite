import { createId } from "@/lib/ids";
import { collections } from "@/server/db/collections";

export async function notify(input: {
  companyId: string;
  recipientUserId: string;
  title: string;
  body: string;
  href?: string;
}) {
  const db = await collections();
  await db.notifications.insertOne({
    id: createId("ntf"),
    companyId: input.companyId,
    recipientUserId: input.recipientUserId,
    title: input.title,
    body: input.body,
    href: input.href,
    read: false,
    createdAt: new Date(),
  });
}

export async function notifyRole(input: {
  companyId: string;
  role: "ADMIN" | "HR";
  title: string;
  body: string;
  href?: string;
  excludeUserId?: string;
}) {
  const db = await collections();
  const filter: Record<string, unknown> = { companyId: input.companyId, role: input.role, active: true };
  if (input.excludeUserId) filter.id = { $ne: input.excludeUserId };
  const recipients = await db.users.find(filter, { projection: { _id: 0, id: 1 } }).toArray();
  if (!recipients.length) return;
  const now = new Date();
  await db.notifications.insertMany(recipients.map((user) => ({
    id: createId("ntf"),
    companyId: input.companyId,
    recipientUserId: String(user.id),
    title: input.title,
    body: input.body,
    href: input.href,
    read: false,
    createdAt: now,
  })));
}

export async function notifyEmployees(input: {
  companyId: string;
  employeeIds: string[];
  title: string;
  body: string;
  href?: string;
}) {
  if (!input.employeeIds.length) return;
  const db = await collections();
  const recipients = await db.users.find(
    { companyId: input.companyId, employeeId: { $in: input.employeeIds }, active: true },
    { projection: { _id: 0, id: 1 } },
  ).toArray();
  if (!recipients.length) return;
  const now = new Date();
  await db.notifications.insertMany(recipients.map((user) => ({
    id: createId("ntf"),
    companyId: input.companyId,
    recipientUserId: String(user.id),
    title: input.title,
    body: input.body,
    href: input.href,
    read: false,
    createdAt: now,
  })));
}

export async function listNotifications(companyId: string, userId: string) {
  const db = await collections();
  return db.notifications
    .find({ companyId, recipientUserId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}

export async function markRead(companyId: string, userId: string, notificationId: string) {
  const db = await collections();
  await db.notifications.updateOne(
    { companyId, recipientUserId: userId, id: notificationId },
    { $set: { read: true, readAt: new Date() } },
  );
}
