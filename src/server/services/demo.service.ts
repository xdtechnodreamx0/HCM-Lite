import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { setSessionCookie } from "@/server/auth/sessions";
import { collections } from "@/server/db/collections";
import { rateLimit } from "@/server/security/rate-limit";
import type { SessionUser } from "@/lib/types";

const ROLE_ORDER: Record<string, number> = { ADMIN: 0, HR: 1, EMPLOYEE: 2 };

export async function listDemoAccounts() {
  if (!getEnv().demoMode) return { enabled: false, accounts: [] };
  const db = await collections();
  const company = await db.companies.findOne(
    { demoSeed: true },
    { projection: { _id: 0, id: 1, name: 1 } },
  );
  if (!company) return { enabled: true, company: null, accounts: [] };

  const users = await db.users
    .find(
      { companyId: company.id, demoAccount: true, active: true },
      { projection: { _id: 0, id: 1, name: 1, email: 1, role: 1, employeeId: 1 } },
    )
    .toArray();
  const employeeIds = users.map((user) => user.employeeId).filter((id): id is string => typeof id === "string");
  const employees = employeeIds.length
    ? await db.employees
      .find(
        { companyId: company.id, id: { $in: employeeIds } },
        { projection: { _id: 0, id: 1, designationName: 1, departmentName: 1 } },
      )
      .toArray()
    : [];
  const employeeById = new Map(employees.map((employee) => [String(employee.id), employee]));

  const accounts = users
    .map((user) => {
      const employee = user.employeeId ? employeeById.get(String(user.employeeId)) : null;
      const role = String(user.role);
      return {
        id: String(user.id),
        name: String(user.name),
        email: String(user.email),
        role,
        title: employee
          ? String(employee.designationName || "Team member")
          : role === "ADMIN" ? "Workspace administrator" : "People operations",
        department: employee ? String(employee.departmentName || "") : "",
        portal: role === "EMPLOYEE" ? "Personal employee workspace" : role === "HR" ? "People operations workspace" : "Company administration",
      };
    })
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name));

  return { enabled: true, company: { id: String(company.id), name: String(company.name) }, accounts };
}

export async function demoLogin(accountId: string, ip: string) {
  if (!getEnv().demoMode) {
    throw new AppError(404, "One-click demo sign-in is not enabled on this deployment.", "DEMO_MODE_DISABLED");
  }
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  await rateLimit(`demo-login:ip:${ipHash}`, 30, 15 * 60 * 1000);
  const db = await collections();
  const user = await db.users.findOne(
    { id: accountId, demoAccount: true, active: true },
    { projection: { _id: 0, id: 1, companyId: 1, email: 1, name: 1, role: 1, employeeId: 1, forcePasswordChange: 1, sessionVersion: 1 } },
  );
  if (!user) throw new AppError(404, "That demo account is not available.", "DEMO_ACCOUNT_NOT_FOUND");
  const company = await db.companies.findOne(
    { id: user.companyId, demoSeed: true },
    { projection: { _id: 0, id: 1, name: 1 } },
  );
  if (!company) throw new AppError(404, "That demo workspace is not available.", "DEMO_WORKSPACE_NOT_FOUND");

  const session: SessionUser = {
    id: String(user.id),
    companyId: String(user.companyId),
    email: String(user.email),
    role: user.role as SessionUser["role"],
    employeeId: typeof user.employeeId === "string" ? user.employeeId : undefined,
    name: String(user.name),
    forcePasswordChange: Boolean(user.forcePasswordChange),
    sessionVersion: Number(user.sessionVersion ?? 1),
  };
  await setSessionCookie(session);
  return {
    user: { id: session.id, name: session.name, email: session.email, role: session.role, employeeId: session.employeeId },
    company: { id: String(company.id), name: String(company.name) },
  };
}
