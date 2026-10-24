export const ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYMENT_STATUSES = ["active", "probation", "exited"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "half_day",
  "missing_checkout",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const PAYROLL_STATUSES = ["draft", "finalized"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export type SessionUser = {
  id: string;
  companyId: string;
  email: string;
  role: Role;
  employeeId?: string;
  name: string;
  forcePasswordChange: boolean;
  sessionVersion: number;
};
