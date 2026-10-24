import { z } from "zod";
import { createRequire } from "node:module";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { formatPkr } from "@/lib/currency";
import { eachIsoDate, isWorkday, monthRange } from "@/lib/dates";
import { calculatePayslip } from "@/lib/payroll-rules";
import { requireRole, requireSelfOrStaff } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { getCalendar } from "@/server/services/organization.service";
import { writeAudit } from "@/server/services/audit.service";
import type { SessionUser } from "@/lib/types";

type PdfFont = object;
type PdfPage = {
  drawText(text: string, options: { x: number; y: number; size: number; font: PdfFont; color: object }): void;
  drawLine(options: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; color: object }): void;
};
type PdfDocument = {
  addPage(size: [number, number]): PdfPage;
  embedFont(font: unknown): Promise<PdfFont>;
  save(): Promise<Uint8Array>;
};
const { PDFDocument, StandardFonts, rgb } = createRequire(`${process.cwd()}/package.json`)("pdf-lib/dist/pdf-lib.js") as {
  PDFDocument: { create(): Promise<PdfDocument> };
  StandardFonts: { Helvetica: unknown; HelveticaBold: unknown };
  rgb(red: number, green: number, blue: number): object;
};

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function employeePayrollSnapshot(run: Record<string, unknown>, employeeId: string) {
  const entries = (run.entries as Array<Record<string, unknown>>).filter((entry) => entry.employeeId === employeeId);
  const entry = entries[0];
  return {
    ...run,
    employeeCount: entries.length,
    totals: {
      basicPaisa: Number(entry?.basicPaisa ?? 0),
      grossPayablePaisa: Number(entry?.grossPayablePaisa ?? 0),
      taxPaisa: Number(entry?.taxPaisa ?? 0),
      netPaisa: Number(entry?.netPaisa ?? 0),
    },
    entries,
  };
}

function employedWorkdays(start: string, end: string, joiningDate: string, exitDate: string | null, calendar: Awaited<ReturnType<typeof getCalendar>>) {
  const effectiveStart = joiningDate > start ? joiningDate : start;
  const effectiveEnd = exitDate && exitDate < end ? exitDate : end;
  if (effectiveStart > effectiveEnd) return [];
  return eachIsoDate(effectiveStart, effectiveEnd).filter((date) => isWorkday(date, calendar));
}

export async function createPayrollDraft(actor: SessionUser, periodInput: string) {
  requireRole(actor, ["HR"]);
  const period = periodSchema.parse(periodInput);
  const { start, end } = monthRange(Number(period.slice(0, 4)), Number(period.slice(5, 7)));
  const calendar = await getCalendar(actor.companyId);
  const db = await collections();
  const [employees, existing] = await Promise.all([
    db.employees.find({ companyId: actor.companyId, status: { $in: ["active", "probation", "exited"] }, joiningDate: { $lte: end } }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray(),
    db.payrollRuns.findOne({ companyId: actor.companyId, period }),
  ]);
  if (existing?.status === "finalized") throw new AppError(409, "This payroll month is already finalized and locked.");
  const entries = [];
  for (const employee of employees) {
    const exitDate = employee.exitDate ? String(employee.exitDate) : null;
    const employedDates = employedWorkdays(start, end, String(employee.joiningDate), exitDate, calendar);
    if (employedDates.length === 0) continue;
    const employeeId = String(employee.id);
    const [attendance, approvedLeaves, salary] = await Promise.all([
      db.attendance.find({ companyId: actor.companyId, employeeId, workDate: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray(),
      db.leaveRequests.find({ companyId: actor.companyId, employeeId, status: "approved", startDate: { $lte: end }, endDate: { $gte: start } }, { projection: { _id: 0 } }).toArray(),
      db.salaryStructures.find({ companyId: actor.companyId, employeeId, effectiveFrom: { $lte: end } }).sort({ effectiveFrom: -1 }).limit(1).next(),
    ]);
    const attendanceByDate = new Map(attendance.map((record) => [String(record.workDate), record]));
    const leaveByDate = new Map<string, Record<string, unknown>>();
    for (const leave of approvedLeaves) {
      for (const date of leave.dates as string[]) {
        if (date >= start && date <= end) leaveByDate.set(date, leave);
      }
    }
    let absentDays = 0;
    let unpaidLeaveDays = 0;
    let halfDays = 0;
    for (const date of employedDates) {
      const leave = leaveByDate.get(date);
      if (leave) {
        if (leave.leaveTypeCode === "unpaid") unpaidLeaveDays += 1;
        continue;
      }
      const record = attendanceByDate.get(date);
      if (!record) absentDays += 1;
      else if (record.status === "half_day") halfDays += 1;
    }
    const basicPaisa = Number(salary?.basicPaisa ?? employee.basicPaisa ?? 0);
    if (basicPaisa <= 0) continue;
    const result = calculatePayslip({
      basicPaisa,
      workingDays: eachIsoDate(start, end).filter((date) => isWorkday(date, calendar)).length,
      payableDays: employedDates.length,
      deductions: { absentDays, unpaidLeaveDays, halfDays },
    });
    entries.push({
      employeeId,
      employeeCode: String(employee.employeeCode),
      employeeName: String(employee.name),
      departmentId: String(employee.departmentId),
      departmentName: String(employee.departmentName),
      ...result,
      deductions: { absentDays, unpaidLeaveDays, halfDays },
    });
  }
  const totals = entries.reduce((accumulator, entry) => ({
    basicPaisa: accumulator.basicPaisa + entry.basicPaisa,
    grossPayablePaisa: accumulator.grossPayablePaisa + entry.grossPayablePaisa,
    taxPaisa: accumulator.taxPaisa + entry.taxPaisa,
    netPaisa: accumulator.netPaisa + entry.netPaisa,
  }), { basicPaisa: 0, grossPayablePaisa: 0, taxPaisa: 0, netPaisa: 0 });
  const now = new Date();
  const runId = existing?.id ? String(existing.id) : createId("pay");
  const run = {
    id: runId, companyId: actor.companyId, period, startDate: start, endDate: end,
    status: "draft", employeeCount: entries.length, totals, entries,
    formulaVersion: "hcm-lite-brief-v1", createdBy: actor.id, createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
  if (existing) {
    const updated = await db.payrollRuns.updateOne(
      { companyId: actor.companyId, period, status: "draft" },
      { $set: { ...run, id: runId, createdBy: existing.createdBy } },
    );
    if (updated.modifiedCount !== 1) throw new AppError(409, "The payroll run changed while this draft was being updated.");
  } else {
    try {
      await db.payrollRuns.insertOne(run);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(409, "A payroll run already exists for this month.");
      throw error;
    }
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "payroll.draft.create", entity: "payrollRun", entityId: runId, after: { period, employeeCount: entries.length, totals } });
  return { ...run, _id: undefined };
}

export async function listPayrollRuns(actor: SessionUser) {
  const db = await collections();
  if (actor.role === "EMPLOYEE") {
    if (!actor.employeeId) return [];
    const runs = await db.payrollRuns.find({ companyId: actor.companyId, status: "finalized", "entries.employeeId": actor.employeeId }, { projection: { _id: 0, id: 1, period: 1, status: 1, employeeCount: 1, finalizedAt: 1, entries: 1 } }).sort({ period: -1 }).limit(36).toArray();
    return runs.map((run) => employeePayrollSnapshot(run, actor.employeeId ?? ""));
  }
  requireRole(actor, ["ADMIN", "HR"]);
  return db.payrollRuns.find({ companyId: actor.companyId }, { projection: { _id: 0, entries: 0 } }).sort({ period: -1 }).limit(36).toArray();
}

export async function getPayrollRun(actor: SessionUser, period: string) {
  periodSchema.parse(period);
  const db = await collections();
  const run = await db.payrollRuns.findOne({ companyId: actor.companyId, period }, { projection: { _id: 0 } });
  if (!run) throw new AppError(404, "Payroll run not found.");
  if (actor.role === "EMPLOYEE") {
    requireSelfOrStaff(actor, actor.employeeId ?? "");
    if (run.status !== "finalized") throw new AppError(404, "Payslip not found.");
    return employeePayrollSnapshot(run, actor.employeeId ?? "");
  }
  requireRole(actor, ["ADMIN", "HR"]);
  return run;
}

export async function finalizePayroll(actor: SessionUser, periodInput: string) {
  requireRole(actor, ["ADMIN"]);
  const period = periodSchema.parse(periodInput);
  const db = await collections();
  const run = await db.payrollRuns.findOne({ companyId: actor.companyId, period, status: "draft" });
  if (!run) {
    const finalized = await db.payrollRuns.findOne({ companyId: actor.companyId, period, status: "finalized" }, { projection: { _id: 0, entries: 0 } });
    if (finalized) return { finalized: true, alreadyFinalized: true, run: finalized };
    throw new AppError(404, "Create a payroll draft before finalizing it.");
  }
  const now = new Date();
  const result = await db.payrollRuns.updateOne(
    { id: run.id, companyId: actor.companyId, status: "draft" },
    { $set: { status: "finalized", finalizedBy: actor.id, finalizedAt: now, updatedAt: now, locked: true } },
  );
  if (result.modifiedCount !== 1) {
    const current = await db.payrollRuns.findOne({ companyId: actor.companyId, period, status: "finalized" }, { projection: { _id: 0, entries: 0 } });
    if (current) return { finalized: true, alreadyFinalized: true, run: current };
    throw new AppError(409, "Payroll changed before finalization.");
  }
  await writeAudit({ actor, companyId: actor.companyId, action: "payroll.finalize", entity: "payrollRun", entityId: String(run.id), before: { status: "draft" }, after: { status: "finalized", period, totals: run.totals } });
  const finalized = await db.payrollRuns.findOne({ id: run.id }, { projection: { _id: 0, entries: 0 } });
  return { finalized: true, alreadyFinalized: false, run: finalized };
}

export async function createPayslipPdf(actor: SessionUser, periodInput: string, employeeId?: string) {
  const period = periodSchema.parse(periodInput);
  const targetEmployeeId = actor.role === "EMPLOYEE" ? actor.employeeId : employeeId;
  if (!targetEmployeeId) throw new AppError(422, "Select an employee.");
  requireSelfOrStaff(actor, targetEmployeeId);
  const db = await collections();
  const run = await db.payrollRuns.findOne({ companyId: actor.companyId, period, status: "finalized" });
  const entry = (run?.entries as Array<Record<string, unknown>> | undefined)?.find((item) => item.employeeId === targetEmployeeId);
  if (!run || !entry) throw new AppError(404, "Finalized payslip not found.");
  if (actor.role !== "EMPLOYEE") requireRole(actor, ["ADMIN", "HR"]);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.16, 0.2);
  const muted = rgb(0.38, 0.43, 0.47);
  page.drawText("PAYSLIP", { x: 48, y: 780, size: 24, font: bold, color: ink });
  page.drawText(`HCM Lite  ·  ${period}`, { x: 48, y: 752, size: 11, font: regular, color: muted });
  page.drawText(String(entry.employeeName), { x: 48, y: 700, size: 16, font: bold, color: ink });
  page.drawText(`Employee ID  ${String(entry.employeeCode)}`, { x: 48, y: 680, size: 10, font: regular, color: muted });
  let y = 628;
  const rows: Array<[string, unknown]> = [
    ["Basic salary", entry.basicPaisa], ["House rent allowance", entry.hraPaisa],
    ["Medical allowance", entry.medicalPaisa], ["Gross payable", entry.grossPayablePaisa],
    ["Income tax (illustrative)", entry.taxPaisa], ["Net pay", entry.netPaisa],
  ];
  for (const [label, value] of rows) {
    page.drawText(label, { x: 48, y, size: 11, font: label === "Net pay" ? bold : regular, color: ink });
    page.drawText(formatPkr(Number(value)), { x: 420, y, size: 11, font: label === "Net pay" ? bold : regular, color: ink });
    page.drawLine({ start: { x: 48, y: y - 10 }, end: { x: 545, y: y - 10 }, thickness: 0.5, color: rgb(0.87, 0.89, 0.9) });
    y -= 34;
  }
  page.drawText("This payslip is generated from the finalized payroll record.", { x: 48, y: 370, size: 9, font: regular, color: muted });
  return { bytes: await pdf.save(), employeeName: String(entry.employeeName), employeeCode: String(entry.employeeCode), period };
}
