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
