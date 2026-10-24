import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { eachIsoDate, currentYear, toIsoDate } from "@/lib/dates";
import { canApply, countedLeaveDays, rangesOverlap } from "@/lib/leave-rules";
import { requireRole, requireSelfOrStaff } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { getCalendar } from "@/server/services/organization.service";
import { notify } from "@/server/services/notifications.service";
import { writeAudit } from "@/server/services/audit.service";
import type { SessionUser } from "@/lib/types";

type YearSlice = { year: number; days: number };

function splitDaysByYear(dates: string[]): YearSlice[] {
  const counts = new Map<number, number>();
  for (const date of dates) {
    const year = Number(date.slice(0, 4));
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts].map(([year, days]) => ({ year, days }));
}

async function updateUsage(input: {
  companyId: string;
  employeeId: string;
  leaveTypeCode: string;
  year: number;
  days: number;
  quota: number;
  direction: 1 | -1;
}) {
  const db = await collections();
  const key = {
    companyId: input.companyId, employeeId: input.employeeId,
    leaveTypeCode: input.leaveTypeCode, year: input.year,
  };
  try {
    await db.leaveUsage.updateOne(key, {
      $setOnInsert: { ...key, approvedDays: 0, updatedAt: new Date() },
    }, { upsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const filter = input.direction === 1
    ? { ...key, approvedDays: { $lte: input.quota - input.days } }
    : { ...key, approvedDays: { $gte: input.days } };
  const result = await db.leaveUsage.updateOne(filter, {
    $inc: { approvedDays: input.direction * input.days },
    $set: { updatedAt: new Date() },
  });
  if (result.modifiedCount !== 1) {
    throw new AppError(422, input.direction === 1 ? "Insufficient leave balance." : "Leave balance could not be restored.");
  }
}

async function adjustUsageSlices(input: {
  companyId: string;
  employeeId: string;
  leaveTypeCode: string;
  slices: YearSlice[];
  quota: number;
  unlimited: boolean;
  direction: 1 | -1;
}) {
  if (input.unlimited) return;
  const changed: YearSlice[] = [];
  try {
    for (const slice of input.slices) {
      await updateUsage({ ...input, ...slice });
      changed.push(slice);
    }
  } catch (error) {
    for (const slice of changed.reverse()) {
      await updateUsage({ ...input, ...slice, direction: input.direction === 1 ? -1 : 1 });
    }
    throw error;
  }
}

const requestSchema = z.object({
  leaveTypeCode: z.string().trim().min(1).max(40),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  reason: z.string().trim().min(5).max(700),
});

export async function getLeaveBalances(actor: SessionUser, employeeId?: string) {
  const targetId = actor.role === "EMPLOYEE" ? actor.employeeId : employeeId;
  if (!targetId) throw new AppError(422, "Select an employee.");
  requireSelfOrStaff(actor, targetId);
  if (actor.role !== "EMPLOYEE") requireRole(actor, ["ADMIN", "HR"]);
  const db = await collections();
  const company = await db.companies.findOne({ id: actor.companyId });
  if (!company) throw new AppError(404, "Company not found.");
  const year = currentYear(String(company.timezone));
  const [types, employee] = await Promise.all([
    db.leaveTypes.find({ companyId: actor.companyId, active: true }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray(),
    db.employees.findOne({ id: targetId, companyId: actor.companyId }),
  ]);
  if (!employee) throw new AppError(404, "Record not found.");
  const balances = await Promise.all(types.map(async (type) => {
    const usage = await db.leaveUsage.findOne({ companyId: actor.companyId, employeeId: targetId, leaveTypeCode: type.code, year });
    const approvedDays = Number(usage?.approvedDays ?? 0);
    const unlimited = Boolean(type.unlimited);
    return {
      id: String(type.id), code: String(type.code), name: String(type.name),
      quota: Number(type.yearlyQuota ?? 0), approvedDays,
      remaining: unlimited ? null : Math.max(0, Number(type.yearlyQuota ?? 0) - approvedDays),
      unlimited,
    };
  }));
  return { year, employeeId: targetId, employeeName: String(employee.name), balances };
}

export async function createLeaveRequest(actor: SessionUser, raw: unknown) {
  requireRole(actor, ["EMPLOYEE"]);
  if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
  const input = requestSchema.parse(raw);
  const calendar = await getCalendar(actor.companyId);
  const dates = countedLeaveDays(input.startDate, input.endDate, calendar);
  const checks = canApply({
    start: input.startDate, end: input.endDate, requestedDays: dates.length,
    unlimited: true, quota: 0, approvedDays: 0,
  });
  if (!checks.ok) throw new AppError(422, checks.reason ?? "Choose valid work dates for this request.");
  const db = await collections();
  const [leaveType, employee, overlapping] = await Promise.all([
    db.leaveTypes.findOne({ companyId: actor.companyId, code: input.leaveTypeCode, active: true }),
    db.employees.findOne({ id: actor.employeeId, companyId: actor.companyId }),
    db.leaveRequests.findOne({
      companyId: actor.companyId, employeeId: actor.employeeId,
      status: { $in: ["pending", "approved"] }, startDate: { $lte: input.endDate }, endDate: { $gte: input.startDate },
    }),
  ]);
  if (!leaveType) throw new AppError(422, "Choose an active leave type.");
  if (!employee) throw new AppError(404, "Employee profile not found.");
  if (overlapping) throw new AppError(422, "These dates overlap another pending or approved request.");
  const slices = splitDaysByYear(dates);
  if (!Boolean(leaveType.unlimited)) {
    for (const slice of slices) {
      const usage = await db.leaveUsage.findOne({ companyId: actor.companyId, employeeId: actor.employeeId, leaveTypeCode: input.leaveTypeCode, year: slice.year });
      const approvedDays = Number(usage?.approvedDays ?? 0);
      const quota = Number(leaveType.yearlyQuota ?? 0);
      if (approvedDays + slice.days > quota) throw new AppError(422, `Not enough ${String(leaveType.name).toLowerCase()} balance for ${slice.year}.`);
    }
  }
  const id = createId("lev");
  await db.leaveRequests.insertOne({
    id, companyId: actor.companyId, employeeId: actor.employeeId, employeeName: employee.name,
    employeeCode: employee.employeeCode, leaveTypeId: leaveType.id, leaveTypeCode: leaveType.code,
    leaveTypeName: leaveType.name, startDate: input.startDate, endDate: input.endDate,
    days: dates.length, dates, daysByYear: slices, reason: input.reason, status: "pending",
    decisionComment: "", requestedBy: actor.id, createdAt: new Date(),
    policySnapshot: { timezone: calendar.timezone, weekendDays: calendar.weekendDays, holidays: calendar.holidays, quota: leaveType.yearlyQuota, unlimited: leaveType.unlimited },
  });
  await writeAudit({ actor, companyId: actor.companyId, action: "leave.request", entity: "leaveRequest", entityId: id, after: { leaveTypeCode: input.leaveTypeCode, startDate: input.startDate, endDate: input.endDate, days: dates.length } });
  return { id, days: dates.length, status: "pending" };
}

export async function listLeaveRequests(actor: SessionUser, status = "all") {
  const requestedStatus = z.enum(["all", "pending", "approved", "rejected", "cancelled"]).parse(status);
  const db = await collections();
  const filter: Record<string, unknown> = { companyId: actor.companyId };
  if (actor.role === "EMPLOYEE") {
    if (!actor.employeeId) return [];
    filter.employeeId = actor.employeeId;
  } else {
    requireRole(actor, ["ADMIN", "HR"]);
  }
  if (requestedStatus !== "all") filter.status = requestedStatus;
  return db.leaveRequests.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
}

export async function decideLeaveRequest(actor: SessionUser, requestId: string, raw: unknown) {
  requireRole(actor, ["HR"]);
  const input = z.object({ decision: z.enum(["approved", "rejected"]), comment: z.string().trim().min(2).max(500) }).parse(raw);
  const db = await collections();
  const request = await db.leaveRequests.findOne({ id: requestId, companyId: actor.companyId, status: "pending" });
  if (!request) throw new AppError(404, "Pending leave request not found.");
  const leaveType = await db.leaveTypes.findOne({ companyId: actor.companyId, code: request.leaveTypeCode });
  if (!leaveType) throw new AppError(409, "The leave policy for this request is no longer available.");
  const slices = request.daysByYear as YearSlice[];
  if (input.decision === "approved") {
    await adjustUsageSlices({
      companyId: actor.companyId, employeeId: String(request.employeeId), leaveTypeCode: String(request.leaveTypeCode),
      slices, quota: Number(request.policySnapshot?.quota ?? leaveType.yearlyQuota ?? 0),
      unlimited: Boolean(request.policySnapshot?.unlimited ?? leaveType.unlimited), direction: 1,
    });
  }
  const result = await db.leaveRequests.updateOne(
    { id: requestId, companyId: actor.companyId, status: "pending" },
    { $set: { status: input.decision, decisionComment: input.comment, decidedBy: actor.id, decidedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    if (input.decision === "approved") {
      await adjustUsageSlices({
        companyId: actor.companyId, employeeId: String(request.employeeId), leaveTypeCode: String(request.leaveTypeCode),
        slices, quota: Number(request.policySnapshot?.quota ?? leaveType.yearlyQuota ?? 0),
        unlimited: Boolean(request.policySnapshot?.unlimited ?? leaveType.unlimited), direction: -1,
      });
    }
    throw new AppError(409, "This leave request was already decided.");
  }
  const employee = await db.employees.findOne({ id: request.employeeId, companyId: actor.companyId });
  if (employee?.userId) {
    await notify({
      companyId: actor.companyId, recipientUserId: String(employee.userId),
      title: input.decision === "approved" ? "Leave approved" : "Leave request updated",
      body: `${String(request.leaveTypeName)} from ${String(request.startDate)} to ${String(request.endDate)} was ${input.decision}.`,
      href: "/leave",
    });
  }
  await writeAudit({ actor, companyId: actor.companyId, action: `leave.${input.decision}`, entity: "leaveRequest", entityId: requestId, before: { status: "pending" }, after: { status: input.decision, comment: input.comment, days: request.days } });
  return { status: input.decision };
}

export async function cancelLeaveRequest(actor: SessionUser, requestId: string) {
  requireRole(actor, ["EMPLOYEE"]);
  if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
  const db = await collections();
  const request = await db.leaveRequests.findOne({ id: requestId, companyId: actor.companyId, employeeId: actor.employeeId, status: { $in: ["pending", "approved"] } });
  if (!request) throw new AppError(404, "Request cannot be cancelled.");
  const calendar = await getCalendar(actor.companyId);
  if (request.status === "approved" && String(request.startDate) < toIsoDate(new Date(), calendar.timezone)) {
    throw new AppError(422, "Approved leave that has started cannot be cancelled here.");
  }
  const leaveType = await db.leaveTypes.findOne({ companyId: actor.companyId, code: request.leaveTypeCode });
  if (request.status === "approved" && !leaveType) throw new AppError(409, "The leave policy for this request is no longer available.");
  const result = await db.leaveRequests.updateOne(
    { id: requestId, companyId: actor.companyId, employeeId: actor.employeeId, status: request.status },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
  );
  if (result.modifiedCount !== 1) throw new AppError(409, "This leave request changed before it could be cancelled.");
  if (request.status === "approved" && leaveType) {
    try {
      await adjustUsageSlices({
        companyId: actor.companyId, employeeId: actor.employeeId, leaveTypeCode: String(request.leaveTypeCode),
        slices: request.daysByYear as YearSlice[], quota: Number(request.policySnapshot?.quota ?? leaveType.yearlyQuota ?? 0),
        unlimited: Boolean(request.policySnapshot?.unlimited ?? leaveType.unlimited), direction: -1,
      });
    } catch (error) {
      await db.leaveRequests.updateOne(
        { id: requestId, companyId: actor.companyId, employeeId: actor.employeeId, status: "cancelled" },
        { $set: { status: "approved" }, $unset: { cancelledAt: "" } },
      );
      throw error;
    }
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "leave.cancel", entity: "leaveRequest", entityId: requestId, before: { status: request.status }, after: { status: "cancelled" } });
  return { status: "cancelled" };
}

export async function hasLeaveOnDate(companyId: string, employeeId: string, date: string) {
  const db = await collections();
  return db.leaveRequests.findOne({ companyId, employeeId, status: "approved", startDate: { $lte: date }, endDate: { $gte: date } });
}

export function hasDateOverlap(startA: string, endA: string, startB: string, endB: string) {
  return rangesOverlap(startA, endA, startB, endB);
}

export function listCalendarDays(start: string, end: string) {
  return eachIsoDate(start, end);
}
