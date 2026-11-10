import { AppError } from "@/lib/errors";
import type { Role, SessionUser } from "@/lib/types";

export function requireRole(user: SessionUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new AppError(403, "You do not have access to this action.");
  }
}

export function requireSelfOrStaff(user: SessionUser, employeeId: string) {
  if (user.role === "EMPLOYEE" && user.employeeId !== employeeId) {
    throw new AppError(404, "Record not found.");
  }
}

export function requireSelfService(user: SessionUser) {
  requireRole(user, ["EMPLOYEE", "HR"]);
  if (!user.employeeId) {
    throw new AppError(403, "Your login is not linked to a staff profile. Ask an Admin to link one in User access.");
  }
  return user.employeeId;
}

export function staffOnly(user: SessionUser) {
  requireRole(user, ["ADMIN", "HR"]);
}
