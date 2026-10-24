import type { Db, Document } from "mongodb";
import { getDb } from "@/server/db/client";

export const COLLECTION_NAMES = {
  companies: "companies",
  users: "users",
  employees: "employees",
  departments: "departments",
  designations: "designations",
  leaveTypes: "leaveTypes",
  holidays: "holidays",
  attendance: "attendance",
  attendanceCorrections: "attendanceCorrections",
  leaveRequests: "leaveRequests",
  salaryStructures: "salaryStructures",
  payrollRuns: "payrollRuns",
  payslips: "payslips",
  announcements: "announcements",
  notifications: "notifications",
  auditLogs: "auditLogs",
  aiLogs: "aiLogs",
  rateLimits: "rateLimits",
  leaveUsage: "leaveUsage",
} as const;

export async function collections(db?: Db) {
  const database = db ?? (await getDb());
  return {
    companies: database.collection<Document>(COLLECTION_NAMES.companies),
    users: database.collection<Document>(COLLECTION_NAMES.users),
    employees: database.collection<Document>(COLLECTION_NAMES.employees),
    departments: database.collection<Document>(COLLECTION_NAMES.departments),
    designations: database.collection<Document>(COLLECTION_NAMES.designations),
    leaveTypes: database.collection<Document>(COLLECTION_NAMES.leaveTypes),
    holidays: database.collection<Document>(COLLECTION_NAMES.holidays),
    attendance: database.collection<Document>(COLLECTION_NAMES.attendance),
    attendanceCorrections: database.collection<Document>(COLLECTION_NAMES.attendanceCorrections),
    leaveRequests: database.collection<Document>(COLLECTION_NAMES.leaveRequests),
    salaryStructures: database.collection<Document>(COLLECTION_NAMES.salaryStructures),
    payrollRuns: database.collection<Document>(COLLECTION_NAMES.payrollRuns),
    payslips: database.collection<Document>(COLLECTION_NAMES.payslips),
    announcements: database.collection<Document>(COLLECTION_NAMES.announcements),
    notifications: database.collection<Document>(COLLECTION_NAMES.notifications),
    auditLogs: database.collection<Document>(COLLECTION_NAMES.auditLogs),
    aiLogs: database.collection<Document>(COLLECTION_NAMES.aiLogs),
    rateLimits: database.collection<Document>(COLLECTION_NAMES.rateLimits),
    leaveUsage: database.collection<Document>(COLLECTION_NAMES.leaveUsage),
  };
}
