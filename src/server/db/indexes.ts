import { collections } from "@/server/db/collections";

export async function ensureIndexes() {
  const db = await collections();
  await Promise.all([
    db.companies.createIndex({ setupKey: 1 }, { unique: true }),
    db.users.createIndex({ email: 1 }, { unique: true }),
    db.users.createIndex({ companyId: 1, role: 1 }),
    db.employees.createIndex({ companyId: 1, employeeCode: 1 }, { unique: true }),
    db.employees.createIndex({ companyId: 1, email: 1 }, { unique: true }),
    db.departments.createIndex({ companyId: 1, name: 1 }, { unique: true }),
    db.designations.createIndex({ companyId: 1, name: 1 }, { unique: true }),
    db.leaveTypes.createIndex({ companyId: 1, code: 1 }, { unique: true }),
    db.holidays.createIndex({ companyId: 1, date: 1 }, { unique: true }),
    db.attendance.createIndex(
      { companyId: 1, employeeId: 1, workDate: 1 },
      { unique: true },
    ),
    db.leaveRequests.createIndex({ companyId: 1, employeeId: 1, status: 1, startDate: 1 }),
    db.payrollRuns.createIndex({ companyId: 1, period: 1 }, { unique: true }),
    db.payslips.createIndex({ companyId: 1, employeeId: 1, period: 1 }, { unique: true }),
    db.notifications.createIndex({ companyId: 1, recipientUserId: 1, createdAt: -1 }),
    db.auditLogs.createIndex({ companyId: 1, createdAt: -1 }),
    db.announcements.createIndex({ companyId: 1, createdAt: -1 }),
    db.aiLogs.createIndex({ companyId: 1, actorUserId: 1, createdAt: -1 }),
    db.leaveUsage.createIndex(
      { companyId: 1, employeeId: 1, leaveTypeCode: 1, year: 1 },
      { unique: true },
    ),
    db.rateLimits.createIndex({ key: 1 }, { unique: true }),
    db.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
