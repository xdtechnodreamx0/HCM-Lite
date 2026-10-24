import { z } from "zod";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { DEFAULT_LEAVE_TYPES } from "@/lib/leave-rules";
import { hashPassword } from "@/server/auth/passwords";
import { setSessionCookie } from "@/server/auth/sessions";
import { collections } from "@/server/db/collections";
import { ensureIndexes } from "@/server/db/indexes";
import { writeAudit } from "@/server/services/audit.service";
import { getEmailProvider } from "@/lib/env";
import { issueEmailVerification } from "@/server/services/email.service";

const timezoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}, "Choose a valid IANA time zone.");
const officeStartSchema = z.string().regex(/^\d{2}:\d{2}$/).refine((value) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59;
}, "Choose a valid 24-hour time.");

export const setupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  adminName: z.string().trim().min(2).max(80),
  adminEmail: z.email().trim(),
  adminPassword: z.string().min(10).max(100),
  timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
  officeStart: officeStartSchema.default("09:00"),
  graceMinutes: z.number().int().min(0).max(180).default(15),
  weekendDays: z.array(z.number().int().min(0).max(6)).refine((days) => new Set(days).size === days.length, "Weekend days must be unique.").default([0, 6]),
  officeLat: z.number().min(-90).max(90).optional(),
  officeLng: z.number().min(-180).max(180).optional(),
  geofenceRadiusMeters: z.number().min(10).max(5000).default(150),
}).strict();

export async function isInitialized() {
  const db = await collections();
  const company = await db.companies.findOne({ setupKey: "primary" });
  return Boolean(company);
}

export async function setupCompany(input: z.infer<typeof setupSchema>) {
  await ensureIndexes();
  if (await isInitialized()) {
    throw new AppError(409, "This installation is already initialized.");
  }
  const data = setupSchema.parse(input);
  const db = await collections();
  const now = new Date();
  const companyId = createId("co");
  const userId = createId("usr");
  const emailProvider = getEmailProvider();
  try {
    await db.companies.insertOne({
      id: companyId,
      setupKey: "primary",
      name: data.companyName,
      timezone: data.timezone,
      officeStart: data.officeStart,
      graceMinutes: data.graceMinutes,
      weekendDays: data.weekendDays,
      officeLat: data.officeLat ?? null,
      officeLng: data.officeLng ?? null,
      geofenceRadiusMeters: data.geofenceRadiusMeters,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 11000) {
      throw new AppError(409, "This installation is already initialized.");
    }
    throw error;
  }
  try {
    await db.users.insertOne({
      id: userId,
      companyId,
      email: data.adminEmail.toLowerCase(),
      name: data.adminName,
      role: "ADMIN",
      passwordHash: await hashPassword(data.adminPassword),
      active: true,
      forcePasswordChange: false,
      sessionVersion: 1,
      ...(emailProvider ? { emailVerificationRequired: true } : {}),
      createdAt: now,
    });
    await db.leaveTypes.insertMany(
      DEFAULT_LEAVE_TYPES.map((type) => ({
        id: createId("lt"),
        companyId,
        ...type,
        active: true,
        createdAt: now,
      })),
    );
    await writeAudit({
      companyId,
      action: "setup.initialize",
      entity: "company",
      entityId: companyId,
      after: { name: data.companyName, adminEmail: data.adminEmail.toLowerCase() },
    });
    if (emailProvider) {
      await issueEmailVerification({ id: userId, companyId, email: data.adminEmail.toLowerCase(), name: data.adminName, company: data.companyName });
    }
  } catch (error) {
    await Promise.all([
      db.users.deleteMany({ companyId }),
      db.leaveTypes.deleteMany({ companyId }),
      db.auditLogs.deleteMany({ companyId, action: "setup.initialize" }),
      db.companies.deleteOne({ id: companyId, setupKey: "primary" }),
    ]);
    throw error;
  }
  if (!emailProvider) await setSessionCookie({
    id: userId,
    companyId,
    email: data.adminEmail.toLowerCase(),
    role: "ADMIN",
    name: data.adminName,
    forcePasswordChange: false,
    sessionVersion: 1,
  });
  return { companyId, userId, verificationRequired: Boolean(emailProvider) };
}
