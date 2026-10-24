import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import { toPaisa } from "@/lib/currency";
import { parseCsv, toCsv } from "@/lib/csv";
import { requireRole, requireSelfOrStaff } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { createLogin } from "@/server/services/auth.service";
import { writeAudit } from "@/server/services/audit.service";
import { getEmailProvider } from "@/lib/env";
import { issueEmailVerification } from "@/server/services/email.service";
import type { SessionUser } from "@/lib/types";

export const employeeSchema = z.object({
  employeeCode: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().max(32).default(""),
  address: z.string().trim().max(240).default(""),
  gender: z.string().trim().max(40).default(""),
  departmentId: z.string().min(1),
  designationId: z.string().min(1),
  joiningDate: z.iso.date(),
  status: z.enum(["active", "probation", "exited"]).default("active"),
  basicSalary: z.number().positive().max(100_000_000),
});

function cleanEmployee(doc: Record<string, unknown>) {
  const { _id: _ignored, companyId: _company, ...safe } = doc;
  void _ignored;
  void _company;
  return safe;
}

function employeeForActor(doc: Record<string, unknown>, actor: SessionUser) {
  const safe = cleanEmployee(doc);
  if (actor.role === "EMPLOYEE") {
    delete safe.basicPaisa;
    delete safe.gender;
    delete safe.departmentId;
    delete safe.designationId;
    delete safe.userId;
  }
  return safe;
}

export async function listEmployees(actor: SessionUser, input: {
  query?: string;
  status?: string;
  departmentId?: string;
  sortBy?: "name" | "joiningDate" | "employeeCode";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  const filtersInput = z.object({
    query: z.string().trim().max(100).optional(),
    status: z.enum(["all", "active", "probation", "exited"]).optional(),
    departmentId: z.string().min(1).max(100).optional(),
    sortBy: z.enum(["name", "joiningDate", "employeeCode"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.number().int().min(1).max(100_000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  }).strict().parse(input);
  const db = await collections();
  const page = filtersInput.page ?? 1;
  const pageSize = filtersInput.pageSize ?? 20;
  const sortField = filtersInput.sortBy ?? "name";
  const sortOrder = filtersInput.sortDirection === "desc" ? -1 : 1;
  const filters: Record<string, unknown> = { companyId: actor.companyId };
  if (actor.role === "EMPLOYEE") {
    if (!actor.employeeId) throw new AppError(404, "Record not found.");
    filters.id = actor.employeeId;
  } else {
    requireRole(actor, ["ADMIN", "HR"]);
    if (filtersInput.status && filtersInput.status !== "all") filters.status = filtersInput.status;
    if (filtersInput.departmentId) filters.departmentId = filtersInput.departmentId;
    if (filtersInput.query) {
      const escaped = filtersInput.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filters.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { employeeCode: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }
  }
  const [docs, total] = await Promise.all([
    db.employees.find(filters, { projection: { _id: 0 } })
      .sort({ [sortField]: sortOrder, id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    db.employees.countDocuments(filters),
  ]);
  return { items: docs.map((doc) => employeeForActor(doc, actor)), page, pageSize, total };
}

export async function getEmployee(actor: SessionUser, employeeId: string) {
  requireSelfOrStaff(actor, employeeId);
  const db = await collections();
  const employee = await db.employees.findOne(
    { companyId: actor.companyId, id: employeeId },
    { projection: { _id: 0 } },
  );
  if (!employee) throw new AppError(404, "Record not found.");
  return employeeForActor(employee, actor);
}

export async function createEmployee(actor: SessionUser, raw: unknown) {
  requireRole(actor, ["ADMIN", "HR"]);
  const input = employeeSchema.parse(raw);
  const db = await collections();
  const department = await db.departments.findOne({ id: input.departmentId, companyId: actor.companyId });
  const designation = await db.designations.findOne({ id: input.designationId, companyId: actor.companyId });
  if (!department || !designation) throw new AppError(422, "Choose a department and designation from this company.");
  const existing = await db.users.findOne({ email: input.email.toLowerCase() });
  const signupAccount = existing?.signupPending === true && existing.role === "EMPLOYEE" && !existing.employeeId && !existing.active
    ? existing
    : null;
  if (existing && !signupAccount) throw new AppError(409, "A login with this email already exists.");
  const id = createId("emp");
  const now = new Date();
  const record = {
    id,
    companyId: actor.companyId,
    employeeCode: input.employeeCode,
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    address: input.address,
    gender: input.gender,
    departmentId: input.departmentId,
    departmentName: String(department.name),
    designationId: input.designationId,
    designationName: String(designation.name),
    joiningDate: input.joiningDate,
    exitDate: null,
    status: input.status,
    basicPaisa: toPaisa(input.basicSalary),
    createdAt: now,
    updatedAt: now,
  };
  await db.employees.insertOne(record);
  let createdUserId: string | undefined;
  try {
    let login: { id: string; temporaryPassword: string } | null = null;
    if (signupAccount) {
      const linked = await db.users.updateOne(
        { id: signupAccount.id, companyId: actor.companyId, signupPending: true, active: false },
        { $set: { employeeId: id, role: "EMPLOYEE", active: true, signupPending: false, sessionVersion: Number(signupAccount.sessionVersion ?? 0) + 1, updatedAt: now } },
      );
      if (linked.modifiedCount !== 1) throw new AppError(409, "This sign-up request changed. Refresh the page and try again.");
      createdUserId = signupAccount.id;
      await db.employees.updateOne({ id, companyId: actor.companyId }, { $set: { userId: signupAccount.id } });
      if (getEmailProvider() && signupAccount.emailVerificationRequired && !signupAccount.emailVerifiedAt) {
        const company = await db.companies.findOne({ id: actor.companyId }, { projection: { name: 1 } });
        await issueEmailVerification({ id: signupAccount.id, companyId: actor.companyId, email: signupAccount.email, name: signupAccount.name, company: String(company?.name ?? "your company") });
      }
    } else {
      login = await createLogin({ actor, email: record.email, name: record.name, role: "EMPLOYEE", employeeId: id });
      createdUserId = login.id;
      await db.employees.updateOne({ id, companyId: actor.companyId }, { $set: { userId: login.id } });
    }
    await db.salaryStructures.insertOne({
      id: createId("sal"), companyId: actor.companyId, employeeId: id,
      basicPaisa: record.basicPaisa, effectiveFrom: input.joiningDate,
      createdAt: now, createdBy: actor.id,
    });
    await writeAudit({
      actor, companyId: actor.companyId, action: "employee.create", entity: "employee", entityId: id,
      after: { employeeCode: record.employeeCode, name: record.name, departmentId: record.departmentId, status: record.status },
    });
    return { employeeId: id, userId: createdUserId, temporaryPassword: login?.temporaryPassword ?? null, accountLinked: Boolean(signupAccount) };
  } catch (error) {
    await Promise.all([
      db.employees.deleteOne({ id, companyId: actor.companyId }),
      db.salaryStructures.deleteMany({ companyId: actor.companyId, employeeId: id }),
      signupAccount && createdUserId
        ? db.users.updateOne({ id: createdUserId, companyId: actor.companyId }, { $set: { active: false, signupPending: true, sessionVersion: Number(signupAccount.sessionVersion ?? 0) + 2 }, $unset: { employeeId: "", emailVerificationTokenHash: "", emailVerificationExpiresAt: "" } })
        : createdUserId ? db.users.deleteOne({ id: createdUserId, companyId: actor.companyId }) : Promise.resolve(),
      db.auditLogs.deleteMany({ companyId: actor.companyId, action: "employee.create", entityId: id }),
    ]);
    throw error;
  }
}

export async function updateEmployee(actor: SessionUser, employeeId: string, raw: unknown) {
  const db = await collections();
  const existing = await db.employees.findOne({ id: employeeId, companyId: actor.companyId });
  if (!existing) throw new AppError(404, "Record not found.");
  const patchSchema = actor.role === "EMPLOYEE"
    ? z.object({ phone: z.string().trim().max(32).optional(), address: z.string().trim().max(240).optional() }).strict()
    : z.object({
        name: z.string().trim().min(2).max(100).optional(),
        phone: z.string().trim().max(32).optional(),
        address: z.string().trim().max(240).optional(),
        gender: z.string().trim().max(40).optional(),
        departmentId: z.string().optional(),
        designationId: z.string().optional(),
        status: z.enum(["active", "probation", "exited"]).optional(),
        exitDate: z.iso.date().nullable().optional(),
      }).strict();
  const patch = patchSchema.parse(raw);
  if (actor.role === "EMPLOYEE") requireSelfOrStaff(actor, employeeId);
  else requireRole(actor, ["HR"]);
  if ("departmentId" in patch && patch.departmentId) {
    const department = await db.departments.findOne({ id: patch.departmentId, companyId: actor.companyId });
    if (!department) throw new AppError(422, "Choose a department from this company.");
    Object.assign(patch, { departmentName: department.name });
  }
  if ("designationId" in patch && patch.designationId) {
    const designation = await db.designations.findOne({ id: patch.designationId, companyId: actor.companyId });
    if (!designation) throw new AppError(422, "Choose a designation from this company.");
    Object.assign(patch, { designationName: designation.name });
  }
  const result = await db.employees.updateOne(
    { id: employeeId, companyId: actor.companyId },
    { $set: { ...patch, updatedAt: new Date() } },
  );
  if (result.modifiedCount) {
    await writeAudit({ actor, companyId: actor.companyId, action: "employee.update", entity: "employee", entityId: employeeId, before: { phone: existing.phone, address: existing.address, status: existing.status }, after: patch });
  }
  return { updated: result.modifiedCount > 0 };
}

export async function updateEmployeeSalary(actor: SessionUser, employeeId: string, raw: unknown) {
  requireRole(actor, ["HR"]);
  const input = z.object({ basicSalary: z.number().positive().max(100_000_000), effectiveFrom: z.iso.date() }).parse(raw);
  const db = await collections();
  const employee = await db.employees.findOne({ id: employeeId, companyId: actor.companyId });
  if (!employee) throw new AppError(404, "Employee not found.");
  const basicPaisa = toPaisa(input.basicSalary);
  const now = new Date();
  const salary = { id: createId("sal"), companyId: actor.companyId, employeeId, basicPaisa, effectiveFrom: input.effectiveFrom, createdBy: actor.id, createdAt: now };
  await db.salaryStructures.insertOne(salary);
  await db.employees.updateOne({ id: employeeId, companyId: actor.companyId }, { $set: { basicPaisa, updatedAt: now } });
  await writeAudit({ actor, companyId: actor.companyId, action: "employee.salary.update", entity: "salaryStructure", entityId: salary.id, before: { basicPaisa: employee.basicPaisa }, after: { basicPaisa, effectiveFrom: input.effectiveFrom } });
  return { updated: true };
}

export type CsvIssue = { row: number; field: string; reason: string };

async function validateCsvRows(actor: SessionUser, text: string) {
  requireRole(actor, ["HR"]);
  if (text.length > 1_000_000) throw new AppError(413, "CSV file must be smaller than 1 MB.");
  const parsed = parseCsv(text);
  const header = parsed[0]?.map((value) => value.trim()) ?? [];
  const required = ["employeeCode", "name", "email", "departmentId", "designationId", "joiningDate", "basicSalary"];
  const headerIssues: CsvIssue[] = required.filter((field) => !header.includes(field)).map((field) => ({ row: 1, field, reason: "Required column is missing." }));
  if (headerIssues.length) return { validRows: [] as Array<z.infer<typeof employeeSchema>>, issues: headerIssues, rowCount: Math.max(0, parsed.length - 1) };
  const db = await collections();
  const departmentIds = new Set((await db.departments.find({ companyId: actor.companyId }, { projection: { _id: 0, id: 1 } }).toArray()).map((item) => String(item.id)));
  const designationIds = new Set((await db.designations.find({ companyId: actor.companyId }, { projection: { _id: 0, id: 1 } }).toArray()).map((item) => String(item.id)));
  const validRows: Array<z.infer<typeof employeeSchema>> = [];
  const issues: CsvIssue[] = [];
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const existing = await db.employees.find({ companyId: actor.companyId }, { projection: { _id: 0, employeeCode: 1, email: 1 } }).toArray();
  const existingCodes = new Set(existing.map((item) => String(item.employeeCode).toLowerCase()));
  const existingEmails = new Set(existing.map((item) => String(item.email).toLowerCase()));
  for (let index = 1; index < parsed.length; index += 1) {
    const cells = parsed[index];
    const row: Record<string, string> = {};
    for (const [columnIndex, field] of header.entries()) row[field] = cells[columnIndex] ?? "";
    if (header.includes("phone")) row.phone = row.phone ?? "";
    if (header.includes("address")) row.address = row.address ?? "";
    if (header.includes("gender")) row.gender = row.gender ?? "";
    if (header.includes("status") && !row.status) row.status = "active";
    if (!row.basicSalary) row.basicSalary = "0";
    const rowNumber = index + 1;
    const parsedRow = employeeSchema.safeParse({
      ...row,
      basicSalary: Number(row.basicSalary),
      status: row.status || "active",
    });
    if (!parsedRow.success) {
      for (const issue of parsedRow.error.issues) issues.push({ row: rowNumber, field: issue.path.join(".") || "row", reason: issue.message });
      continue;
    }
    const valid = parsedRow.data;
    const code = valid.employeeCode.toLowerCase();
    const email = valid.email.toLowerCase();
    let duplicate = false;
    if (existingCodes.has(code) || seenCodes.has(code)) { issues.push({ row: rowNumber, field: "employeeCode", reason: "Employee code already exists in the company or file." }); duplicate = true; }
    if (existingEmails.has(email) || seenEmails.has(email)) { issues.push({ row: rowNumber, field: "email", reason: "Email already exists in the company or file." }); duplicate = true; }
    if (!departmentIds.has(valid.departmentId)) { issues.push({ row: rowNumber, field: "departmentId", reason: "Choose a department ID from this company." }); duplicate = true; }
    if (!designationIds.has(valid.designationId)) { issues.push({ row: rowNumber, field: "designationId", reason: "Choose a designation ID from this company." }); duplicate = true; }
    seenCodes.add(code); seenEmails.add(email);
    if (!duplicate) validRows.push(valid);
  }
  return { validRows, issues, rowCount: Math.max(0, parsed.length - 1) };
}

export async function dryRunEmployeeCsv(actor: SessionUser, text: string) {
  const result = await validateCsvRows(actor, text);
  return { valid: result.issues.length === 0, rowCount: result.rowCount, validRows: result.validRows.length, issues: result.issues };
}

export async function importEmployeeCsv(actor: SessionUser, text: string) {
  const result = await validateCsvRows(actor, text);
  if (result.issues.length) return { imported: 0, rowCount: result.rowCount, valid: false, issues: result.issues };
  const imported: Array<{ row: number; employeeCode: string; temporaryPassword: string | null }> = [];
  const issues: CsvIssue[] = [];
  for (const [index, row] of result.validRows.entries()) {
    try {
      const created = await createEmployee(actor, row);
      imported.push({ row: index + 2, employeeCode: row.employeeCode, temporaryPassword: created.temporaryPassword });
    } catch (error) {
      issues.push({ row: index + 2, field: "row", reason: apiSafeMessage(error) });
    }
  }
  return { imported: imported.length, rowCount: result.rowCount, valid: issues.length === 0, importedRows: imported, issues };
}

function apiSafeMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  return "This row could not be saved. Check that the employee code and email are unique.";
}

export async function exportEmployeesCsv(actor: SessionUser) {
  requireRole(actor, ["HR"]);
  const db = await collections();
  const rows = await db.employees.find({ companyId: actor.companyId }, { projection: { _id: 0, employeeCode: 1, name: 1, email: 1, phone: 1, address: 1, gender: 1, departmentId: 1, designationId: 1, joiningDate: 1, status: 1, basicPaisa: 1 } }).sort({ name: 1 }).limit(5000).toArray();
  return toCsv(rows.map((row) => ({
    employeeCode: row.employeeCode, name: row.name, email: row.email, phone: row.phone,
    address: row.address, gender: row.gender, departmentId: row.departmentId,
    designationId: row.designationId, joiningDate: row.joiningDate, status: row.status,
    basicSalary: Number(row.basicPaisa ?? 0) / 100,
  })));
}
