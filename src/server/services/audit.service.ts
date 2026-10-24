import { createId } from "@/lib/ids";
import type { SessionUser } from "@/lib/types";
import { collections } from "@/server/db/collections";

export async function writeAudit(input: {
  actor?: SessionUser | null;
  companyId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  const db = await collections();
  await db.auditLogs.insertOne({
    id: createId("aud"),
    companyId: input.companyId,
    actorUserId: input.actor?.id ?? "system",
    actorEmail: input.actor?.email ?? "system",
    actorRole: input.actor?.role ?? "SYSTEM",
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    createdAt: new Date(),
  });
}

export async function listAudit(companyId: string, limit = 100) {
  const db = await collections();
  return db.auditLogs
    .find({ companyId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
