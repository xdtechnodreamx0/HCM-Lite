import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { toIsoDate, isWorkday } from "@/lib/dates";
import { classifyAttendance } from "@/lib/attendance-rules";
import { requireRole, requireSelfOrStaff } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { getCalendar } from "@/server/services/organization.service";
import { writeAudit } from "@/server/services/audit.service";
import type { SessionUser } from "@/lib/types";

function todayFor(timeZone: string) {
  return toIsoDate(new Date(), timeZone);
}

export async function checkIn(actor: SessionUser) {
  requireRole(actor, ["EMPLOYEE"]);
  if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
  const calendar = await getCalendar(actor.companyId);
  const now = new Date();
  const workDate = todayFor(calendar.timezone);
  if (!isWorkday(workDate, calendar)) throw new AppError(422, "Today is not a configured workday.");
  const db = await collections();
  const employee = await db.employees.findOne({ id: actor.employeeId, companyId: actor.companyId, status: { $in: ["active", "probation"] } });
  if (!employee) throw new AppError(403, "Your employee account is not active.");
  const late = classifyAttendance({ checkInAt: now, policy: calendar }).late;
  const id = createId("att");
  try {
    await db.attendance.insertOne({
      id, companyId: actor.companyId, employeeId: actor.employeeId, workDate,
      checkInAt: now, checkOutAt: null, workedSeconds: 0, status: late ? "late" : "missing_checkout",
      late, halfDay: false, missingCheckout: true,
      policySnapshot: { timezone: calendar.timezone, officeStart: calendar.officeStart, graceMinutes: calendar.graceMinutes },
      createdAt: now, updatedAt: now,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError(409, "You already checked in today.");
    throw error;
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "attendance.check_in", entity: "attendance", entityId: id, after: { workDate, checkInAt: now, late } });
  return { id, workDate, checkInAt: now.toISOString(), late };
}

export async function checkOut(actor: SessionUser) {
  requireRole(actor, ["EMPLOYEE"]);
  if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
  const calendar = await getCalendar(actor.companyId);
  const workDate = todayFor(calendar.timezone);
  const db = await collections();
  const record = await db.attendance.findOne({ companyId: actor.companyId, employeeId: actor.employeeId, workDate });
  if (!record) throw new AppError(409, "Check in before checking out.");
  if (record.checkOutAt) throw new AppError(409, "You already checked out today.");
  const checkOutAt = new Date();
  const result = classifyAttendance({ checkInAt: new Date(record.checkInAt as string | Date), checkOutAt, policy: calendar });
  const updated = await db.attendance.updateOne(
    { id: record.id, companyId: actor.companyId, employeeId: actor.employeeId, checkOutAt: null },
    { $set: { checkOutAt, status: result.status, workedSeconds: result.workedSeconds, halfDay: result.halfDay, late: result.late, missingCheckout: false, updatedAt: checkOutAt } },
  );
  if (updated.modifiedCount !== 1) throw new AppError(409, "Attendance was already checked out.");
  await writeAudit({ actor, companyId: actor.companyId, action: "attendance.check_out", entity: "attendance", entityId: String(record.id), before: { checkOutAt: null, status: record.status }, after: { checkOutAt, status: result.status, workedSeconds: result.workedSeconds } });
  return { workDate, checkOutAt: checkOutAt.toISOString(), ...result };
}

export async function attendanceHistory(actor: SessionUser, employeeId?: string) {
  const targetId = actor.role === "EMPLOYEE" ? actor.employeeId : employeeId;
  if (!targetId) throw new AppError(422, "Select an employee.");
  requireSelfOrStaff(actor, targetId);
  if (actor.role !== "EMPLOYEE") requireRole(actor, ["ADMIN", "HR"]);
  const db = await collections();
  const rows = await db.attendance.find({ companyId: actor.companyId, employeeId: targetId }, { projection: { _id: 0 } })
    .sort({ workDate: -1 }).limit(120).toArray();
  return rows;
}

export async function attendanceBoard(actor: SessionUser, workDate?: string, departmentId?: string) {
  requireRole(actor, ["ADMIN", "HR"]);
  const calendar = await getCalendar(actor.companyId);
  const date = z.iso.date().parse(workDate ?? todayFor(calendar.timezone));
  const db = await collections();
  const employeeFilter: Record<string, unknown> = { companyId: actor.companyId, status: { $in: ["active", "probation"] } };
  if (departmentId) employeeFilter.departmentId = departmentId;
  const [employees, records, leaves] = await Promise.all([
    db.employees.find(employeeFilter, { projection: { _id: 0 } }).sort({ name: 1 }).toArray(),
    db.attendance.find({ companyId: actor.companyId, workDate: date }, { projection: { _id: 0 } }).toArray(),
    db.leaveRequests.find({ companyId: actor.companyId, status: "approved", startDate: { $lte: date }, endDate: { $gte: date } }, { projection: { _id: 0 } }).toArray(),
  ]);
  const attendanceByEmployee = new Map(records.map((record) => [String(record.employeeId), record]));
  const leaveByEmployee = new Map(leaves
    .filter((leave) => {
      const dates = Array.isArray(leave.dates) ? leave.dates.map(String) : [];
      return dates.length ? dates.includes(date) : String(leave.startDate) <= date && String(leave.endDate) >= date;
    })
    .map((leave) => [String(leave.employeeId), leave]));
  return employees.map((employee) => {
    const attendance = attendanceByEmployee.get(String(employee.id));
    const leave = leaveByEmployee.get(String(employee.id));
    return {
      employeeId: String(employee.id), name: String(employee.name), employeeCode: String(employee.employeeCode),
      departmentId: String(employee.departmentId), departmentName: String(employee.departmentName),
      id: attendance ? String(attendance.id) : null,
      checkInAt: attendance?.checkInAt ?? null, checkOutAt: attendance?.checkOutAt ?? null,
      workedSeconds: Number(attendance?.workedSeconds ?? 0), late: Boolean(attendance?.late),
      status: attendance?.status ?? (isWorkday(date, calendar) ? leave ? "on_leave" : "absent" : "non_workday"),
      leaveTypeName: leave?.leaveTypeName ?? null,
    };
  });
}

const correctionSchema = z.object({
  workDate: z.iso.date(),
  checkInAt: z.iso.datetime().optional(),
  checkOutAt: z.iso.datetime().optional(),
  reason: z.string().trim().min(8).max(500),
});

export async function requestCorrection(actor: SessionUser, raw: unknown) {
  requireRole(actor, ["EMPLOYEE"]);
  if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
  const data = correctionSchema.parse(raw);
  const db = await collections();
  const attendance = await db.attendance.findOne({ companyId: actor.companyId, employeeId: actor.employeeId, workDate: data.workDate });
  if (!attendance) throw new AppError(404, "Attendance record not found for that date.");
  const pending = await db.attendanceCorrections.findOne({ companyId: actor.companyId, employeeId: actor.employeeId, workDate: data.workDate, status: "pending" });
  if (pending) throw new AppError(409, "A correction request is already pending for that date.");
  const id = createId("cor");
  const after = {
    checkInAt: data.checkInAt ? new Date(data.checkInAt) : attendance.checkInAt,
    checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : attendance.checkOutAt,
  };
  await db.attendanceCorrections.insertOne({
    id, companyId: actor.companyId, employeeId: actor.employeeId, attendanceId: attendance.id,
    workDate: data.workDate, before: { checkInAt: attendance.checkInAt, checkOutAt: attendance.checkOutAt },
    after, reason: data.reason, status: "pending", requestedBy: actor.id, createdAt: new Date(),
  });
  await writeAudit({ actor, companyId: actor.companyId, action: "attendance.correction.request", entity: "attendanceCorrection", entityId: id, after: { workDate: data.workDate, reason: data.reason } });
  return { id };
}

export async function listCorrections(actor: SessionUser) {
  const db = await collections();
  const filter = actor.role === "EMPLOYEE"
    ? { companyId: actor.companyId, employeeId: actor.employeeId }
    : { companyId: actor.companyId };
  if (actor.role !== "EMPLOYEE") requireRole(actor, ["ADMIN", "HR"]);
  return db.attendanceCorrections.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function decideCorrection(actor: SessionUser, correctionId: string, raw: unknown) {
  requireRole(actor, ["HR"]);
  const input = z.object({ decision: z.enum(["approved", "rejected"]), comment: z.string().trim().min(2).max(500) }).parse(raw);
  const db = await collections();
  const correction = await db.attendanceCorrections.findOne({ id: correctionId, companyId: actor.companyId, status: "pending" });
  if (!correction) throw new AppError(404, "Pending correction not found.");
  if (input.decision === "approved") {
    const checkInAt = new Date(correction.after.checkInAt as string | Date);
    const checkOutAt = correction.after.checkOutAt ? new Date(correction.after.checkOutAt as string | Date) : null;
    const policy = await getCalendar(actor.companyId);
    const classification = classifyAttendance({ checkInAt, checkOutAt, policy });
    await db.attendance.updateOne(
      { id: correction.attendanceId, companyId: actor.companyId, employeeId: correction.employeeId },
      { $set: { checkInAt, checkOutAt, status: classification.status, late: classification.late, halfDay: classification.halfDay, workedSeconds: classification.workedSeconds, missingCheckout: classification.missingCheckout, updatedAt: new Date() } },
    );
  }
  const result = await db.attendanceCorrections.updateOne(
    { id: correctionId, companyId: actor.companyId, status: "pending" },
    { $set: { status: input.decision, comment: input.comment, decidedBy: actor.id, decidedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) throw new AppError(409, "This correction was already decided.");
  await writeAudit({ actor, companyId: actor.companyId, action: `attendance.correction.${input.decision}`, entity: "attendanceCorrection", entityId: correctionId, before: correction.before, after: { ...correction.after, comment: input.comment } });
  return { updated: true };
}
