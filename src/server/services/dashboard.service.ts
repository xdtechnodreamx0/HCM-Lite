import { AppError } from "@/lib/errors";
import { attrition, attendanceRate, absenteeism, latePercent, safeRatio } from "@/lib/dashboard-metrics";
import { currentYear, eachIsoDate, isWorkday, monthRange, toIsoDate } from "@/lib/dates";
import { formatPkr } from "@/lib/currency";
import { requireRole } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { getCalendar } from "@/server/services/organization.service";
import { getLeaveBalances } from "@/server/services/leave.service";
import type { SessionUser } from "@/lib/types";

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00.000Z`));
}

export async function getDashboard(actor: SessionUser, input: { start?: string; end?: string; departmentId?: string }) {
  const calendar = await getCalendar(actor.companyId);
  const today = toIsoDate(new Date(), calendar.timezone);
  const nowRange = monthRange(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  const start = input.start ?? nowRange.start;
  const end = input.end ?? today;
  if (start > end || start.length !== 10 || end.length !== 10) throw new AppError(422, "Choose a valid date range.");
  const db = await collections();
  const employeeFilter: Record<string, unknown> = { companyId: actor.companyId };
  if (actor.role === "EMPLOYEE") {
    if (!actor.employeeId) throw new AppError(404, "Employee profile not found.");
    employeeFilter.id = actor.employeeId;
  } else {
    requireRole(actor, ["ADMIN", "HR"]);
    if (input.departmentId) employeeFilter.departmentId = input.departmentId;
  }
  const [allEmployees, attendanceRows, leaveRows, pendingLeaves] = await Promise.all([
    db.employees.find(employeeFilter, { projection: { _id: 0 } }).toArray(),
    db.attendance.find({ companyId: actor.companyId, ...(actor.role === "EMPLOYEE" ? { employeeId: actor.employeeId } : {}), workDate: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray(),
    db.leaveRequests.find({ companyId: actor.companyId, ...(actor.role === "EMPLOYEE" ? { employeeId: actor.employeeId } : {}), status: "approved", startDate: { $lte: end }, endDate: { $gte: start } }, { projection: { _id: 0 } }).toArray(),
    actor.role === "EMPLOYEE" ? Promise.resolve(0) : db.leaveRequests.countDocuments({ companyId: actor.companyId, status: "pending" }),
  ]);
  const currentEmployees = allEmployees.filter((employee) => employee.status === "active" || employee.status === "probation");
  const employeeIds = new Set(allEmployees.map((employee) => String(employee.id)));
  const scopedAttendance = attendanceRows.filter((row) => employeeIds.has(String(row.employeeId)));
  const scopedLeaves = leaveRows.filter((leave) => employeeIds.has(String(leave.employeeId)));
  const todayAttendance = scopedAttendance.filter((row) => row.workDate === today);
  const todayLeaves = scopedLeaves.filter((leave) => {
    const dates = Array.isArray(leave.dates) ? leave.dates.map(String) : [];
    return dates.length ? dates.includes(today) : String(leave.startDate) <= today && String(leave.endDate) >= today;
  });
  const attendedIds = new Set(todayAttendance.map((row) => String(row.employeeId)));
  const onLeaveIds = new Set(todayLeaves.map((row) => String(row.employeeId)));
  const present = todayAttendance.filter((row) => row.status === "present" || row.status === "late" || row.status === "missing_checkout").length;
  const late = todayAttendance.filter((row) => row.late === true).length;
  const absent = isWorkday(today, calendar)
    ? currentEmployees.filter((employee) => !attendedIds.has(String(employee.id)) && !onLeaveIds.has(String(employee.id))).length
    : 0;
  const rangeWorkdays = eachIsoDate(start, end).filter((date) => isWorkday(date, calendar));
  const expectedWorkDays = allEmployees.reduce((sum, employee) => {
    const joined = String(employee.joiningDate ?? start);
    const exited = employee.exitDate ? String(employee.exitDate) : end;
    return sum + rangeWorkdays.filter((date) => date >= joined && date <= exited).length;
  }, 0);
  const approvedLeaveDays = scopedLeaves.reduce((sum, leave) => {
    const dates = Array.isArray(leave.dates) ? leave.dates : [];
    const count = dates.length
      ? dates.filter((date) => String(date) >= start && String(date) <= end).length
      : Number(leave.days ?? 0);
    return sum + count;
  }, 0);
  const halfDays = scopedAttendance.filter((row) => row.status === "half_day").length;
  const presentCount = scopedAttendance.filter((row) => row.status === "present").length;
  const lateStatusCount = scopedAttendance.filter((row) => row.status === "late").length;
  const missingCheckoutCount = scopedAttendance.filter((row) => row.missingCheckout === true).length;
  const absentCount = Math.max(0, expectedWorkDays - scopedAttendance.length - approvedLeaveDays);
  const month = today.slice(0, 7);
  const finalizedPayroll = actor.role === "ADMIN"
    ? await db.payrollRuns.findOne({ companyId: actor.companyId, period: month, status: "finalized" })
    : null;
  const currentYearNumber = currentYear(calendar.timezone);
  const employeeById = new Map(currentEmployees.map((employee) => [String(employee.id), employee]));
  const departmentCounts = countBy(currentEmployees, (employee) => String(employee.departmentName || "Unassigned"));
  const genderCounts = countBy(currentEmployees, (employee) => {
    const value = String(employee.gender ?? "").trim();
    return value || "Not shared";
  });
  const tenureCounts = new Map<string, number>([["Under 1 year", 0], ["1–3 years", 0], ["3–5 years", 0], ["5+ years", 0]]);
  for (const employee of currentEmployees) {
    const joined = Date.parse(`${String(employee.joiningDate)}T00:00:00.000Z`);
    const tenure = Number.isNaN(joined) ? 0 : Math.max(0, (Date.parse(`${today}T00:00:00.000Z`) - joined) / (365.2425 * 24 * 60 * 60 * 1000));
    const bucket = tenure < 1 ? "Under 1 year" : tenure < 3 ? "1–3 years" : tenure < 5 ? "3–5 years" : "5+ years";
    tenureCounts.set(bucket, (tenureCounts.get(bucket) ?? 0) + 1);
  }
  const lateCounts = new Map<string, number>();
  for (const row of scopedAttendance) {
    if (row.late === true && employeeById.has(String(row.employeeId))) {
      const id = String(row.employeeId);
      lateCounts.set(id, (lateCounts.get(id) ?? 0) + 1);
    }
  }
  const topLatecomers = [...lateCounts]
    .map(([employeeId, lateCount]) => {
      const employee = employeeById.get(employeeId);
      return employee ? {
        employeeId, name: String(employee.name), employeeCode: String(employee.employeeCode),
        departmentName: String(employee.departmentName || "Unassigned"), lateCount,
      } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.lateCount - left.lateCount || left.name.localeCompare(right.name))
    .slice(0, 5);

  if (actor.role === "EMPLOYEE") {
    const employeeId = actor.employeeId ?? "";
    const weekStart = startOfWeek(today);
    const [ownAttendance, balances, lastPayslip, announcements] = await Promise.all([
      db.attendance.find({ companyId: actor.companyId, employeeId, workDate: { $gte: weekStart, $lte: today } }).toArray(),
      getLeaveBalances(actor, employeeId),
      db.payrollRuns.find({ companyId: actor.companyId, status: "finalized", "entries.employeeId": employeeId }, { projection: { _id: 0, period: 1, entries: 1 } }).sort({ period: -1 }).limit(1).next(),
      db.announcements.find({ companyId: actor.companyId, active: true }, { projection: { _id: 0, id: 1, title: 1, body: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(3).toArray(),
    ]);
    const ownEntry = (lastPayslip?.entries as Array<Record<string, unknown>> | undefined)?.find((entry) => entry.employeeId === employeeId);
    const hoursThisWeek = ownAttendance.reduce((sum, row) => sum + Number(row.workedSeconds ?? 0), 0) / 3600;
    return {
      role: actor.role, asOf: today,
      kpis: [
        { label: "Hours this week", value: hoursThisWeek.toFixed(1), note: "Against a 40 hour target" },
        { label: "Late arrivals", value: ownAttendance.filter((row) => row.late).length, note: "This week" },
        { label: "Leave types", value: balances.balances.length, note: `Balances for ${balances.year}` },
        { label: "Last payslip", value: lastPayslip?.period ?? "—", note: "Finalized payroll" },
      ],
      attendance: { present: present, onLeave: todayLeaves.length, late, absent },
      pendingLeaves: 0,
      trend: ownAttendance.map((row) => ({ label: String(row.workDate).slice(5), value: Number(row.workedSeconds ?? 0) / 3600 })),
      recentAudit: [],
      employee: {
        hoursThisWeek, lateCount: ownAttendance.filter((row) => row.late).length,
        lastPayslip: ownEntry ? { period: String(lastPayslip?.period), netPaisa: Number(ownEntry.netPaisa) } : null,
        leaveBalances: balances.balances.map((balance) => ({ name: balance.name, remaining: balance.remaining, unlimited: balance.unlimited })),
        announcements,
      },
    };
  }

  const kpis = actor.role === "ADMIN"
    ? await adminKpis(actor, currentEmployees, allEmployees, finalizedPayroll, start, end, currentYearNumber, db)
    : [
        { label: "Headcount", value: currentEmployees.length, note: "Active and probation" },
        { label: "Present today", value: present, note: "Includes missing checkout" },
        { label: "On leave today", value: todayLeaves.length, note: "Approved leave" },
        { label: "Late today", value: late, note: "Arrival after configured grace" },
      ];
  const lastSeven = eachIsoDate(today, today).length ? eachIsoDate(addIsoDays(today, -6), today) : [];
  const trend = lastSeven.map((date) => ({
    label: dayLabel(date),
    value: scopedAttendance.filter((row) => row.workDate === date && ["present", "late", "missing_checkout"].includes(String(row.status))).length,
  }));
  const audit = actor.role === "ADMIN"
    ? await db.auditLogs.find({ companyId: actor.companyId }, { projection: { _id: 0, id: 1, action: 1, entity: 1, actorEmail: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(8).toArray()
    : [];
  return {
    role: actor.role, asOf: today, kpis,
    attendance: { present, onLeave: todayLeaves.length, late, absent },
    pendingLeaves: pendingLeaves,
    trend,
    recentAudit: audit,
    employee: null,
    detail: {
      attendanceRate: attendanceRate({ present: presentCount, late: lateStatusCount, missingCheckout: missingCheckoutCount, halfDay: halfDays, workingDayRecords: expectedWorkDays, onLeave: approvedLeaveDays }),
      latePercent: latePercent(lateStatusCount, presentCount),
      absenteeism: absenteeism(absentCount, expectedWorkDays),
      leaveUtilizationDays: safeRatio(approvedLeaveDays, currentEmployees.length),
      department: input.departmentId ?? null,
      departmentBreakdown: asBreakdown(departmentCounts),
      genderBreakdown: asBreakdown(genderCounts),
      tenureBreakdown: [...tenureCounts].map(([label, count]) => ({ label, count })),
      topLatecomers,
    },
  };
}

function countBy(items: Array<Record<string, unknown>>, labelFor: (item: Record<string, unknown>) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = labelFor(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function asBreakdown(counts: Map<string, number>) {
  return [...counts].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function addIsoDays(date: string, delta: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

function startOfWeek(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const daysSinceMonday = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysSinceMonday);
  return value.toISOString().slice(0, 10);
}

async function adminKpis(
  _actor: SessionUser,
  activeEmployees: Array<Record<string, unknown>>,
  allEmployees: Array<Record<string, unknown>>,
  payroll: Record<string, unknown> | null,
  start: string,
  end: string,
  year: number,
  db: Awaited<ReturnType<typeof collections>>,
) {
  const exits = allEmployees.filter((employee) => employee.status === "exited" && String(employee.exitDate ?? "") >= start && String(employee.exitDate ?? "") <= end).length;
  const startCount = allEmployees.filter((employee) => ["active", "probation"].includes(String(employee.status)) && String(employee.joiningDate) <= start && (!employee.exitDate || String(employee.exitDate) >= start)).length;
  const endCount = activeEmployees.length;
  const finalizedRuns = await db.payrollRuns.find({ companyId: _actor.companyId, status: "finalized", period: { $gte: `${year}-01`, $lte: `${year}-12` } }, { projection: { _id: 0, totals: 1 } }).toArray();
  const yearPayroll = finalizedRuns.reduce((sum, run) => sum + Number((run.totals as Record<string, unknown> | undefined)?.grossPayablePaisa ?? 0), 0);
  const averageSalary = activeEmployees.length
    ? activeEmployees.reduce((sum, employee) => sum + Number(employee.basicPaisa ?? 0) * 1.5, 0) / activeEmployees.length
    : null;
  const departmentCounts = new Map<string, number>();
  for (const employee of activeEmployees) {
    const name = String(employee.departmentName || "Unassigned");
    departmentCounts.set(name, (departmentCounts.get(name) ?? 0) + 1);
  }
  const deptText = [...departmentCounts].map(([name, count]) => `${name}: ${count}`).join(" · ") || "No employees yet";
  return [
    { label: "Headcount", value: activeEmployees.length, note: "Active and probation" },
    { label: "Attrition", value: attrition(exits, startCount, endCount) === null ? "N/A" : `${attrition(exits, startCount, endCount)?.toFixed(1)}%`, note: `${exits} exits in range` },
    { label: "Payroll cost", value: payroll ? formatPkr(Number((payroll.totals as Record<string, unknown> | undefined)?.grossPayablePaisa ?? 0)) : "—", note: "Current month, finalized only" },
    { label: "Average gross", value: averageSalary === null ? "N/A" : formatPkr(averageSalary), note: `By active headcount · ${deptText}` },
    { label: "YTD payroll", value: yearPayroll ? formatPkr(yearPayroll) : "—", note: "Finalized payroll records" },
  ];
}
