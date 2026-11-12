import { z } from "zod";
import { createHash } from "node:crypto";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { DEFAULT_LEAVE_TYPES } from "@/lib/leave-rules";
import { getEmailProvider } from "@/lib/env";
import { hashPassword } from "@/server/auth/passwords";
import { collections } from "@/server/db/collections";
import { ensureIndexes } from "@/server/db/indexes";
import { rateLimit } from "@/server/security/rate-limit";
import { writeAudit } from "@/server/services/audit.service";
import { issueEmailVerification } from "@/server/services/email.service";
import { isInitialized } from "@/server/services/setup.service";

export const companySignupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(10).max(100),
}).strict();

/**
 * Creates an additional company workspace after the installation has already
 * been initialized. The first company still uses the one-time setup flow.
 *
 * Email delivery is mandatory here: the Admin cannot enter the portal until
 * the address is verified. If delivery fails, every record is rolled back so
 * the customer can retry without a half-created workspace.
 */
export async function signupCompany(raw: unknown, ip: string) {
  const input = companySignupSchema.parse(raw);
  const provider = getEmailProvider();
  if (!provider) {
    throw new AppError(
      503,
      "Company sign-up needs email delivery. Ask the installation owner to configure SMTP or Resend email, then try again.",
      "EMAIL_NOT_CONFIGURED",
    );
  }
  if (!(await isInitialized())) {
    throw new AppError(409, "Use the one-time first Admin setup to create the first company workspace.", "SETUP_REQUIRED");
  }

  const emailHash = createHashKey(input.email);
  const ipHash = createHashKey(ip || "unknown");
  await Promise.all([
    rateLimit(`company-signup:email:${emailHash}`, 3, 60 * 60 * 1000),
    rateLimit(`company-signup:ip:${ipHash}`, 10, 60 * 60 * 1000),
  ]);

  const db = await collections();
  if (await db.users.findOne({ email: input.email }, { projection: { _id: 1 } })) {
    throw new AppError(409, "An account with this email already exists. Sign in or use another email.", "EMAIL_IN_USE");
  }

  await ensureIndexes();
  const now = new Date();
  const companyId = createId("co");
  const userId = createId("usr");

  try {
    await db.companies.insertOne({
      id: companyId,
      setupKey: `tenant_${companyId}`,
      name: input.companyName,
      timezone: DEFAULT_TIMEZONE,
      officeStart: "09:00",
      graceMinutes: 15,
      weekendDays: [0, 6],
      officeLat: null,
      officeLng: null,
      geofenceRadiusMeters: 150,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(409, "This company workspace could not be created. Refresh and try again.", "COMPANY_SIGNUP_CONFLICT");
    }
    throw error;
  }

  try {
    await db.users.insertOne({
      id: userId,
      companyId,
      email: input.email,
      name: input.name,
      role: "ADMIN",
      passwordHash: await hashPassword(input.password),
      active: true,
      forcePasswordChange: false,
      sessionVersion: 1,
      emailVerificationRequired: true,
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
      action: "company.signup",
      entity: "company",
      entityId: companyId,
      after: { name: input.companyName, adminEmail: input.email, verificationRequired: true },
    });
    await issueEmailVerification({
      id: userId,
      companyId,
      email: input.email,
      name: input.name,
      company: input.companyName,
    });
  } catch (error) {
    await Promise.all([
      db.users.deleteMany({ companyId }),
      db.leaveTypes.deleteMany({ companyId }),
      db.auditLogs.deleteMany({ companyId }),
      db.companies.deleteOne({ id: companyId }),
    ]);
    throw error;
  }

  return { accepted: true, companyId, verificationRequired: true, emailConfigured: true };
}

function createHashKey(value: string) {
  // Kept local so the rate-limit key never stores a raw email address.
  return createHash("sha256").update(value).digest("hex");
}
