import { z } from "zod";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { createTemporaryPassword } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/server/auth/passwords";
import { requireRole } from "@/server/auth/authorization";
import {
  clearSessionCookie,
  requireUser,
  setSessionCookie,
} from "@/server/auth/sessions";
import { collections } from "@/server/db/collections";
import { rateLimit } from "@/server/security/rate-limit";
import { writeAudit } from "@/server/services/audit.service";
import type { Role, SessionUser } from "@/lib/types";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function login(input: z.infer<typeof loginSchema>, ip: string) {
  const data = loginSchema.parse(input);
  const windowMs = 15 * 60 * 1000;
  const emailKey = createHash("sha256").update(data.email.trim().toLowerCase()).digest("hex");
  const ipKey = createHash("sha256").update(ip || "unknown").digest("hex");
  await Promise.all([
    rateLimit(`login:email:${emailKey}`, 10, windowMs),
    rateLimit(`login:ip:${ipKey}`, 30, windowMs),
  ]);
  const db = await collections();
  const user = await db.users.findOne({ email: data.email.toLowerCase() });
  const ok = user ? await verifyPassword(data.password, user.passwordHash) : false;
  if (!user || !ok || !user.active) {
    throw new AppError(401, "Invalid email or password.");
  }
  const session: SessionUser = {
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    name: user.name,
    forcePasswordChange: Boolean(user.forcePasswordChange),
    sessionVersion: user.sessionVersion,
  };
  await setSessionCookie(session);
  return session;
}

export async function logout() {
  await clearSessionCookie();
}

export async function changePassword(current: string, next: string) {
  const actor = await requireUser();
  if (next.length < 10) throw new AppError(422, "New password must be at least 10 characters.");
  const db = await collections();
  const user = await db.users.findOne({ id: actor.id, companyId: actor.companyId });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    throw new AppError(401, "Current password is incorrect.");
  }
  await db.users.updateOne(
    { id: actor.id, companyId: actor.companyId },
    {
      $set: {
        passwordHash: await hashPassword(next),
        forcePasswordChange: false,
        sessionVersion: actor.sessionVersion + 1,
      },
    },
  );
  await writeAudit({ actor, companyId: actor.companyId, action: "user.password.change", entity: "user", entityId: actor.id });
  await setSessionCookie({
    ...actor,
    forcePasswordChange: false,
    sessionVersion: actor.sessionVersion + 1,
  });
}

export async function createLogin(input: {
  actor: SessionUser;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
}) {
  requireRole(input.actor, ["ADMIN", "HR"]);
  if (input.role === "ADMIN") requireRole(input.actor, ["ADMIN"]);
  if (input.role === "HR") requireRole(input.actor, ["ADMIN"]);
  const db = await collections();
  const existing = await db.users.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new AppError(409, "A login with this email already exists.");
  const temporaryPassword = createTemporaryPassword();
  const now = new Date();
  const id = (await import("@/lib/ids")).createId("usr");
  await db.users.insertOne({
    id,
    companyId: input.actor.companyId,
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role,
    employeeId: input.employeeId,
    passwordHash: await hashPassword(temporaryPassword),
    active: true,
    forcePasswordChange: true,
    sessionVersion: 1,
    createdAt: now,
  });
  await writeAudit({
    actor: input.actor,
    companyId: input.actor.companyId,
    action: "user.create",
    entity: "user",
    entityId: id,
    after: { email: input.email.toLowerCase(), role: input.role },
  });
  return { id, temporaryPassword };
}

export async function setUserActive(actor: SessionUser, userId: string, active: boolean) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const user = await db.users.findOne({ id: userId, companyId: actor.companyId });
  if (!user) throw new AppError(404, "User not found.");
  if (user.role === "ADMIN") throw new AppError(403, "Admin accounts cannot be deactivated here.");
  await db.users.updateOne(
    { id: userId, companyId: actor.companyId },
    { $set: { active, sessionVersion: user.sessionVersion + 1 } },
  );
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: active ? "user.activate" : "user.deactivate",
    entity: "user",
    entityId: userId,
  });
}

export async function resetUserPassword(actor: SessionUser, userId: string) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const user = await db.users.findOne({ id: userId, companyId: actor.companyId });
  if (!user) throw new AppError(404, "User not found.");
  const temporaryPassword = createTemporaryPassword();
  await db.users.updateOne(
    { id: userId, companyId: actor.companyId },
    {
      $set: {
        passwordHash: await hashPassword(temporaryPassword),
        forcePasswordChange: true,
        sessionVersion: user.sessionVersion + 1,
      },
    },
  );
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "user.reset_password",
    entity: "user",
    entityId: userId,
  });
  return { temporaryPassword };
}

export async function listUsers(actor: SessionUser) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  return db.users
    .find(
      { companyId: actor.companyId },
      { projection: { _id: 0, id: 1, email: 1, name: 1, role: 1, employeeId: 1, active: 1, forcePasswordChange: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();
}
