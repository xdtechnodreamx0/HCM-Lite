import { z } from "zod";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { createId, createTemporaryPassword } from "@/lib/ids";
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
import { getEmailProvider } from "@/lib/env";
import { issueEmailVerification, issuePasswordResetEmail } from "@/server/services/email.service";
import type { Role, SessionUser } from "@/lib/types";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(10).max(100),
}).strict();

export async function requestEmployeeSignup(raw: unknown, ip: string) {
  const input = signupSchema.parse(raw);
  const emailHash = createHash("sha256").update(input.email).digest("hex");
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  await Promise.all([
    rateLimit(`signup:email:${emailHash}`, 3, 60 * 60 * 1000),
    rateLimit(`signup:ip:${ipHash}`, 10, 60 * 60 * 1000),
  ]);
  const db = await collections();
  const company = await db.companies.findOne({ setupKey: "primary" });
  if (!company) throw new AppError(409, "The company workspace is not ready for employee sign-up yet.");
  if (await db.users.findOne({ email: input.email }, { projection: { _id: 1 } })) return { accepted: true };
  const user = {
    id: createId("usr"), companyId: String(company.id), email: input.email, name: input.name,
    role: "EMPLOYEE" as const, passwordHash: await hashPassword(input.password), active: false,
    signupPending: true, forcePasswordChange: false, sessionVersion: 1, createdAt: new Date(),
  };
  await db.users.insertOne(user);
  try {
    if (getEmailProvider()) {
      await issueEmailVerification({ id: user.id, companyId: user.companyId, email: user.email, name: user.name, company: String(company.name) });
    }
    await writeAudit({ companyId: user.companyId, action: "user.signup.request", entity: "user", entityId: user.id, after: { email: user.email, status: "pending_admin_link" } });
    return { accepted: true };
  } catch (error) {
    await db.users.deleteOne({ id: user.id, companyId: user.companyId });
    throw error;
  }
}

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
  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    throw new AppError(403, "Please verify your email before signing in. You can resend the verification link below.", "EMAIL_VERIFICATION_REQUIRED");
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
  const emailProvider = getEmailProvider();
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
    ...(emailProvider ? { emailVerificationRequired: true } : {}),
    createdAt: now,
  });
  try {
    if (emailProvider) {
      const company = await db.companies.findOne({ id: input.actor.companyId }, { projection: { name: 1 } });
      await issueEmailVerification({ id, companyId: input.actor.companyId, email: input.email.toLowerCase(), name: input.name, company: String(company?.name ?? "your company") });
    }
  } catch (error) {
    await db.users.deleteOne({ id, companyId: input.actor.companyId });
    throw error;
  }
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
  if (active && user.signupPending) throw new AppError(422, "Link this sign-up request to an employee profile before enabling access.");
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

export async function setUserRole(actor: SessionUser, userId: string, role: Role) {
  requireRole(actor, ["ADMIN"]);
  if (userId === actor.id) throw new AppError(403, "You cannot change your own account role.");
  const db = await collections();
  const user = await db.users.findOne({ id: userId, companyId: actor.companyId });
  if (!user) throw new AppError(404, "User not found.");
  if (user.role === role) return;
  if (user.role === "ADMIN" && role !== "ADMIN") {
    const activeAdmins = await db.users.countDocuments({ companyId: actor.companyId, role: "ADMIN", active: true });
    if (user.active && activeAdmins <= 1) throw new AppError(422, "Keep at least one active Admin account in the company.");
  }
  if (role === "EMPLOYEE") {
    if (!user.employeeId) throw new AppError(422, "Create or link this person’s employee profile before assigning Employee access.");
    const employee = await db.employees.findOne({ id: user.employeeId, companyId: actor.companyId, userId: user.id });
    if (!employee) throw new AppError(422, "This login is not linked to an employee profile.");
  }
  const result = await db.users.updateOne(
    { id: userId, companyId: actor.companyId, sessionVersion: user.sessionVersion },
    { $set: { role, sessionVersion: user.sessionVersion + 1, updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) throw new AppError(409, "This account changed. Refresh and try again.");
  await writeAudit({ actor, companyId: actor.companyId, action: "user.role.change", entity: "user", entityId: userId, before: { role: user.role }, after: { role } });
}

export async function resetUserPassword(actor: SessionUser, userId: string) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const user = await db.users.findOne({ id: userId, companyId: actor.companyId });
  if (!user) throw new AppError(404, "User not found.");
  if (!user.active || user.signupPending) throw new AppError(422, "Link and activate this employee account before sending a password reset.");
  const provider = getEmailProvider();
  if (!provider) throw new AppError(503, "Password reset email is not configured. Add RESEND_API_KEY and EMAIL_FROM to .env.local.");
  const company = await db.companies.findOne({ id: actor.companyId }, { projection: { name: 1 } });
  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    await issueEmailVerification({ id: user.id, companyId: actor.companyId, email: user.email, name: user.name, company: String(company?.name ?? "your company") });
    return { verificationSent: true };
  }
  await issuePasswordResetEmail({ id: user.id, companyId: actor.companyId, email: user.email, name: user.name, company: String(company?.name ?? "your company") });
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "user.reset_password",
    entity: "user",
    entityId: userId,
  });
  return { emailSent: true };
}

export async function listUsers(actor: SessionUser) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  return db.users
    .find(
      { companyId: actor.companyId },
      { projection: { _id: 0, id: 1, email: 1, name: 1, role: 1, employeeId: 1, active: 1, signupPending: 1, emailVerificationRequired: 1, emailVerifiedAt: 1, forcePasswordChange: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();
}
