import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { requireRole } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { writeAudit } from "@/server/services/audit.service";
import type { SessionUser } from "@/lib/types";

const timezoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}, "Choose a valid IANA time zone.");
const officeStartSchema = z.string().regex(/^\d{2}:\d{2}$/).refine((value) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59;
}, "Choose a valid 24-hour time.");

export async function getCompany(companyId: string) {
  const db = await collections();
  const company = await db.companies.findOne({ id: companyId });
  if (!company) throw new AppError(404, "Company not found.");
  return company;
}

export async function getCalendar(companyId: string) {
  const company = await getCompany(companyId);
  const db = await collections();
  const holidays = await db.holidays.find({ companyId }).toArray();
  return {
    timezone: company.timezone as string,
    weekendDays: company.weekendDays as number[],
    holidays: holidays.map((h) => h.date as string),
    officeStart: company.officeStart as string,
    graceMinutes: company.graceMinutes as number,
    officeLat: company.officeLat as number | null,
    officeLng: company.officeLng as number | null,
    geofenceRadiusMeters: company.geofenceRadiusMeters as number,
    name: company.name as string,
  };
}

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timezone: timezoneSchema.optional(),
  officeStart: officeStartSchema.optional(),
  graceMinutes: z.number().int().min(0).max(180).optional(),
  weekendDays: z.array(z.number().int().min(0).max(6)).refine((days) => new Set(days).size === days.length, "Weekend days must be unique.").optional(),
  officeLat: z.number().min(-90).max(90).nullable().optional(),
  officeLng: z.number().min(-180).max(180).nullable().optional(),
  geofenceRadiusMeters: z.number().min(10).max(5000).optional(),
}).strict();

export async function updateSettings(actor: SessionUser, patch: unknown) {
  requireRole(actor, ["ADMIN"]);
  const data = settingsSchema.parse(patch);
  const db = await collections();
  const before = await getCompany(actor.companyId);
  const officeLat = "officeLat" in data ? data.officeLat : before.officeLat;
  const officeLng = "officeLng" in data ? data.officeLng : before.officeLng;
  if ((officeLat == null) !== (officeLng == null)) {
    throw new AppError(422, "Office latitude and longitude must both be set or both be empty.");
  }
  await db.companies.updateOne(
    { id: actor.companyId },
    { $set: { ...data, updatedAt: new Date() } },
  );
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "settings.update",
    entity: "company",
    entityId: actor.companyId,
    before,
    after: data,
  });
}

export async function listDepartments(companyId: string) {
  const db = await collections();
  return db.departments.find({ companyId }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
}

export async function createDepartment(actor: SessionUser, name: string) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const id = createId("dept");
  try {
    await db.departments.insertOne({
      id,
      companyId: actor.companyId,
      name: name.trim(),
      createdAt: new Date(),
    });
  } catch {
    throw new AppError(409, "A department with this name already exists.");
  }
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "department.create",
    entity: "department",
    entityId: id,
    after: { name },
  });
  return { id };
}

export async function renameDepartment(actor: SessionUser, departmentId: string, rawName: unknown) {
  requireRole(actor, ["ADMIN"]);
  const name = z.string().trim().min(2).max(80).parse(rawName);
  const db = await collections();
  const before = await db.departments.findOne({ companyId: actor.companyId, id: departmentId });
  if (!before) throw new AppError(404, "Department not found.");
  try {
    await db.departments.updateOne({ companyId: actor.companyId, id: departmentId }, { $set: { name, updatedAt: new Date() } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, "A department with this name already exists.");
    throw error;
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "department.rename", entity: "department", entityId: departmentId, before: { name: before.name }, after: { name } });
  return { updated: true };
}

export async function listDesignations(companyId: string) {
  const db = await collections();
  return db.designations.find({ companyId }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
}

export async function createDesignation(actor: SessionUser, name: string) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const id = createId("des");
  try {
    await db.designations.insertOne({
      id,
      companyId: actor.companyId,
      name: name.trim(),
      createdAt: new Date(),
    });
  } catch {
    throw new AppError(409, "A designation with this name already exists.");
  }
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "designation.create",
    entity: "designation",
    entityId: id,
    after: { name },
  });
  return { id };
}

export async function renameDesignation(actor: SessionUser, designationId: string, rawName: unknown) {
  requireRole(actor, ["ADMIN"]);
  const name = z.string().trim().min(2).max(80).parse(rawName);
  const db = await collections();
  const before = await db.designations.findOne({ companyId: actor.companyId, id: designationId });
  if (!before) throw new AppError(404, "Designation not found.");
  try {
    await db.designations.updateOne({ companyId: actor.companyId, id: designationId }, { $set: { name, updatedAt: new Date() } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, "A designation with this name already exists.");
    throw error;
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "designation.rename", entity: "designation", entityId: designationId, before: { name: before.name }, after: { name } });
  return { updated: true };
}

export async function listLeaveTypes(companyId: string) {
  const db = await collections();
  return db.leaveTypes.find({ companyId }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
}

export async function listHolidays(companyId: string) {
  const db = await collections();
  return db.holidays.find({ companyId }, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
}

export async function createLeaveType(actor: SessionUser, raw: unknown) {
  requireRole(actor, ["ADMIN"]);
  const input = z.object({
    code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,39}$/),
    name: z.string().trim().min(2).max(80),
    yearlyQuota: z.number().int().min(0).max(366),
    unlimited: z.boolean().default(false),
  }).parse(raw);
  if (!input.unlimited && input.yearlyQuota < 1) throw new AppError(422, "Finite leave types need a quota greater than zero.");
  const db = await collections();
  const id = createId("lt");
  try {
    await db.leaveTypes.insertOne({ id, companyId: actor.companyId, ...input, active: true, createdAt: new Date() });
  } catch {
    throw new AppError(409, "A leave type with this code already exists.");
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "leave_type.create", entity: "leaveType", entityId: id, after: input });
  return { id };
}

export async function updateLeaveType(actor: SessionUser, leaveTypeId: string, raw: unknown) {
  requireRole(actor, ["ADMIN"]);
  const patch = z.object({ name: z.string().trim().min(2).max(80).optional(), yearlyQuota: z.number().int().min(1).max(366).optional(), active: z.boolean().optional() }).strict().parse(raw);
  const db = await collections();
  const before = await db.leaveTypes.findOne({ companyId: actor.companyId, id: leaveTypeId });
  if (!before) throw new AppError(404, "Leave type not found.");
  await db.leaveTypes.updateOne({ companyId: actor.companyId, id: leaveTypeId }, { $set: { ...patch, updatedAt: new Date() } });
  await writeAudit({ actor, companyId: actor.companyId, action: "leave_type.update", entity: "leaveType", entityId: leaveTypeId, before: { name: before.name, yearlyQuota: before.yearlyQuota, active: before.active }, after: patch });
  return { updated: true };
}

export async function createHoliday(actor: SessionUser, date: string, name: string) {
  requireRole(actor, ["ADMIN"]);
  const db = await collections();
  const id = createId("hol");
  try {
    await db.holidays.insertOne({
      id,
      companyId: actor.companyId,
      date,
      name,
      createdAt: new Date(),
    });
  } catch {
    throw new AppError(409, "A holiday already exists on this date.");
  }
  await writeAudit({
    actor,
    companyId: actor.companyId,
    action: "holiday.create",
    entity: "holiday",
    entityId: id,
    after: { date, name },
  });
  return { id };
}

export async function updateHoliday(actor: SessionUser, holidayId: string, raw: unknown) {
  requireRole(actor, ["ADMIN"]);
  const patch = z.object({ date: z.iso.date().optional(), name: z.string().trim().min(2).max(100).optional() }).strict().refine((value) => Object.keys(value).length > 0, "Provide a date or name to update.").parse(raw);
  const db = await collections();
  const before = await db.holidays.findOne({ companyId: actor.companyId, id: holidayId });
  if (!before) throw new AppError(404, "Holiday not found.");
  try {
    await db.holidays.updateOne({ companyId: actor.companyId, id: holidayId }, { $set: { ...patch, updatedAt: new Date() } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, "A holiday already exists on that date.");
    throw error;
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "holiday.update", entity: "holiday", entityId: holidayId, before: { date: before.date, name: before.name }, after: patch });
  return { updated: true };
}
