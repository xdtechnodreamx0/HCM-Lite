"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Phone, UserRound } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type {
  AttendanceRecord, AnnouncementRecord, CorrectionRecord, DashboardPayload, EmployeeRecord,
  LeaveRecord, NotificationRecord, OrganizationPayload, PayrollRunRecord, SessionPayload, UserRecord,
} from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { AttendanceView } from "@/features/app/components/attendance-view";
import { AssistantView } from "@/features/app/components/assistant-view";
import { AnnouncementsView, AuditView } from "@/features/app/components/communications-view";
import { DashboardView } from "@/features/app/components/dashboard-view";
import { LeaveView } from "@/features/app/components/leave-view";
import { OrganizationView } from "@/features/app/components/organization-view";
import { PayrollView } from "@/features/app/components/payroll-view";
import { PeopleView, UsersView } from "@/features/app/components/people-view";
import { FormError, FormSuccess, PageHeading, Panel, PrimaryButton } from "@/features/app/components/ui";

type ViewId = "overview" | "organization" | "users" | "employees" | "attendance" | "leave" | "payroll" | "announcements" | "audit" | "assistant" | "profile";
type PortalData = {
  dashboard: DashboardPayload | null;
  organization: OrganizationPayload | null;
  employees: EmployeeRecord[];
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  corrections: CorrectionRecord[];
  payroll: PayrollRunRecord[];
  announcements: AnnouncementRecord[];
  notifications: NotificationRecord[];
  audit: Array<Record<string, unknown>>;
  users: UserRecord[];
};

export function PortalView({ view, user, company, data, refresh, notify, goTo, peopleSearchSeed, assistantContext }: {
  view: ViewId;
  user: NonNullable<SessionPayload["user"]>;
  company: SessionPayload["company"];
  data: PortalData;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goTo: (view: ViewId) => void;
  peopleSearchSeed: { query: string; key: number } | null;
  assistantContext?: string;
}) {
  switch (view) {
    case "overview":
      return <DashboardView dashboard={data.dashboard} announcements={data.announcements} user={user} onGo={goTo} />;
    case "organization":
      return <OrganizationView organization={data.organization} role={user.role} refresh={refresh} notify={notify} />;
    case "users":
      return <UsersView users={data.users} actorId={user.id} refresh={refresh} notify={notify} />;
    case "employees":
      return <PeopleView key={peopleSearchSeed?.key ?? "people-directory"} employees={data.employees} organization={data.organization} role={user.role} refresh={refresh} notify={notify} searchSeed={peopleSearchSeed?.query ?? ""} />;
    case "attendance":
      return <AttendanceView attendance={data.attendance} corrections={data.corrections} organization={data.organization} company={company} role={user.role} refresh={refresh} notify={notify} />;
    case "leave":
      return <LeaveView leaves={data.leaves} role={user.role} refresh={refresh} notify={notify} goToAssistant={() => goTo("assistant")} />;
    case "payroll":
      return <PayrollView payroll={data.payroll} role={user.role} employeeId={user.employeeId} refresh={refresh} notify={notify} />;
    case "announcements":
      return <AnnouncementsView announcements={data.announcements} notifications={data.notifications} role={user.role} refresh={refresh} notify={notify} />;
    case "audit":
      return <AuditView rows={data.audit} />;
    case "assistant":
      return <AssistantView role={user.role} dashboard={data.dashboard} organization={data.organization} company={company} currentPage={assistantContext ?? "overview"} />;
    case "profile":
      return <ProfileView employee={data.employees[0]} companyName={company?.name ?? ""} refresh={refresh} notify={notify} />;
    default:
      return <DashboardView dashboard={data.dashboard} announcements={data.announcements} user={user} onGo={goTo} />;
  }
}

function ProfileView({ employee, companyName, refresh, notify }: {
  employee?: EmployeeRecord;
  companyName: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await apiRequest(`/api/employees/${employee.id}`, { method: "PATCH", body: jsonBody({ phone, address }) });
      await refresh(); setSuccess("Your contact details are up to date."); notify("Profile saved.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading eyebrow="YOUR DETAILS" title="My profile" description="Keep your contact details current so HR can reach you." />
    {employee ? <div className="module-grid profile-grid"><Panel title={employee.name} subtitle={`${employee.designationName || "Employee"} · ${employee.departmentName || companyName}`} className="span-two"><div className="profile-identity"><span className="profile-identity-avatar"><UserRound size={24} /></span><div><strong>{employee.email}</strong><small>Employee code {employee.employeeCode}</small></div></div><div className="profile-detail-grid"><div><small>Department</small><strong>{employee.departmentName || "—"}</strong></div><div><small>Designation</small><strong>{employee.designationName || "—"}</strong></div><div><small>Work email</small><strong>{employee.email}</strong></div><div><small>Joined</small><strong>{employee.joiningDate}</strong></div></div></Panel><Panel title="Contact details" subtitle="You can update only your own phone and address." className="span-two"><form className="form-grid" onSubmit={save}><label className="field-label"><span><Phone size={13} /> Phone</span><input type="tel" autoComplete="tel" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="field-label span-two">Address<input maxLength={240} autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} /></label><div className="form-actions span-two"><FormError>{error}</FormError><FormSuccess>{success}</FormSuccess><PrimaryButton disabled={saving}>{saving ? "Saving…" : "Save contact details"}<ArrowRight size={15} /></PrimaryButton></div></form></Panel></div> : <Panel><div className="loading-line">Loading your profile…</div></Panel>}
  </>;
}
