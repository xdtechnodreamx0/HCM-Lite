import type { AttendanceStatus, EmploymentStatus, LeaveStatus, Role } from "@/lib/types";

export type CompanySummary = {
  id: string;
  name: string;
  timezone: string;
  officeStart: string;
  graceMinutes: number;
  weekendDays: number[];
  officeLat: number | null;
  officeLng: number | null;
  geofenceRadiusMeters: number;
};

export type DepartmentRecord = { id: string; name: string };
export type DesignationRecord = { id: string; name: string };
export type LeaveTypeRecord = {
  id: string;
  code: string;
  name: string;
  yearlyQuota: number;
  unlimited: boolean;
  active: boolean;
};

export type EmployeeRecord = {
  id: string;
  userId?: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gender?: string;
  departmentId?: string;
  departmentName: string;
  designationId?: string;
  designationName: string;
  joiningDate: string;
  exitDate: string | null;
  status: EmploymentStatus;
  basicPaisa?: number;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string | null;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  workDate?: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedSeconds: number;
  status: AttendanceStatus | "absent" | "on_leave" | "non_workday";
  late: boolean;
  halfDay: boolean;
  missingCheckout: boolean;
};

export type AttendanceBoardRow = {
  employeeId: string;
  name: string;
  employeeCode: string;
  departmentId: string;
  departmentName: string;
  id: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedSeconds: number;
  late: boolean;
  status: string;
  leaveTypeName: string | null;
};

export type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  decisionComment: string;
  createdAt: string;
};

export type SessionPayload = {
  initialized: boolean;
  user: null | {
    id: string;
    email: string;
    name: string;
    role: Role;
    employeeId?: string;
    forcePasswordChange: boolean;
  };
  company: CompanySummary | null;
};

export type DashboardPayload = {
  role: Role;
  asOf: string;
  kpis: Array<{ label: string; value: string | number; note: string }>;
  attendance: { present: number; onLeave: number; late: number; absent: number };
  pendingLeaves: number;
  trend: Array<{ label: string; value: number }>;
  recentAudit: Array<{ id: string; action: string; entity: string; actorEmail: string; createdAt: string }>;
  employee: null | {
    hoursThisWeek: number;
    lateCount: number;
    lastPayslip: null | { period: string; netPaisa: number };
    leaveBalances: Array<{ name: string; remaining: number | null; unlimited: boolean }>;
    announcements?: AnnouncementRecord[];
  };
  detail?: {
    attendanceRate: number | null;
    latePercent: number | null;
    absenteeism: number | null;
    leaveUtilizationDays: number | null;
    department: string | null;
    departmentBreakdown?: Array<{ label: string; count: number }>;
    genderBreakdown?: Array<{ label: string; count: number }>;
    tenureBreakdown?: Array<{ label: string; count: number }>;
    topLatecomers?: Array<{ employeeId: string; name: string; employeeCode: string; departmentName: string; lateCount: number }>;
  };
};

export type OrganizationPayload = {
  calendar: Omit<CompanySummary, "id"> & { name: string; holidays: string[] };
  departments: DepartmentRecord[];
  designations: DesignationRecord[];
  leaveTypes: LeaveTypeRecord[];
  holidays: Array<{ id: string; date: string; name: string }>;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
  active: boolean;
  signupPending?: boolean;
  emailVerificationRequired?: boolean;
  emailVerifiedAt?: string;
  forcePasswordChange: boolean;
  createdAt: string;
};

export type LeaveBalanceRecord = {
  id: string;
  code: string;
  name: string;
  quota: number;
  approvedDays: number;
  remaining: number | null;
  unlimited: boolean;
};

export type PayrollEntryRecord = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  basicPaisa: number;
  hraPaisa: number;
  medicalPaisa: number;
  grossPayablePaisa: number;
  taxPaisa: number;
  netPaisa: number;
  workingDays: number;
  payableDays: number;
  deductedDays: number;
  paidDays: number;
  perDayPaisa: number;
  deductions: { absentDays: number; unpaidLeaveDays: number; halfDays: number };
};

export type PayrollRunRecord = {
  id: string;
  period: string;
  status: "draft" | "finalized";
  employeeCount: number;
  totals?: { basicPaisa: number; grossPayablePaisa: number; taxPaisa: number; netPaisa: number };
  entries?: PayrollEntryRecord[];
  finalizedAt?: string;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  authorName?: string;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type CorrectionRecord = {
  id: string;
  employeeId: string;
  workDate: string;
  before: { checkInAt: string; checkOutAt: string | null };
  after: { checkInAt: string; checkOutAt: string | null };
  reason: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  createdAt: string;
};
