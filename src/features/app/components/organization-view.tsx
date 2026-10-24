"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Clock3, MapPin, Pencil, Plus, Save, Settings2 } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { OrganizationPayload, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { FormError, FormSuccess, PageHeading, Panel, PrimaryButton, StatusPill, formatDate } from "@/features/app/components/ui";

export function OrganizationView({ organization, role, refresh, notify }: {
  organization: OrganizationPayload | null;
  role: NonNullable<SessionPayload["user"]>["role"];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const canManage = role === "ADMIN";
  const [form, setForm] = useState(() => ({
    name: organization?.calendar.name ?? "",
    timezone: organization?.calendar.timezone ?? "Asia/Karachi",
    officeStart: organization?.calendar.officeStart ?? "09:00",
    graceMinutes: organization?.calendar.graceMinutes ?? 15,
    weekendDays: organization?.calendar.weekendDays ?? [0, 6],
    officeLat: organization?.calendar.officeLat == null ? "" : String(organization.calendar.officeLat),
    officeLng: organization?.calendar.officeLng == null ? "" : String(organization.calendar.officeLng),
    geofenceRadiusMeters: organization?.calendar.geofenceRadiusMeters ?? 150,
  }));
  const [departmentName, setDepartmentName] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [holiday, setHoliday] = useState({ date: "", name: "" });
  const [leaveType, setLeaveType] = useState({ code: "", name: "", yearlyQuota: 12, unlimited: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function action(event: FormEvent<HTMLFormElement>, run: () => Promise<void>) {
    event.preventDefault(); setError(""); setSuccess(""); setSaving(true);
    try { await run(); await refresh(); setSuccess("Saved successfully."); notify("Organization details updated."); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setSaving(false); }
  }

  async function renameRecord(endpoint: string, id: string, currentName: string) {
    const name = window.prompt("Enter the updated name", currentName)?.trim();
    if (!name || name === currentName) return;
    setError(""); setSuccess("");
    try {
      await apiRequest(`${endpoint}/${encodeURIComponent(id)}`, { method: "PATCH", body: jsonBody({ name }) });
      await refresh(); setSuccess("Saved successfully."); notify("Organization details updated.");
    } catch (reason) { setError(apiMessage(reason)); }
  }

  async function editLeaveType(item: OrganizationPayload["leaveTypes"][number]) {
    const name = window.prompt("Leave type name", item.name)?.trim();
    if (!name) return;
    const patch: { name: string; yearlyQuota?: number } = { name };
    if (!item.unlimited) {
      const rawQuota = window.prompt("Days per year", String(item.yearlyQuota));
      if (rawQuota === null) return;
      const yearlyQuota = Number(rawQuota);
      if (!Number.isInteger(yearlyQuota) || yearlyQuota < 1 || yearlyQuota > 366) {
        setError("Enter a whole number from 1 to 366."); return;
      }
      patch.yearlyQuota = yearlyQuota;
    }
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/leave-types/${encodeURIComponent(item.id)}`, { method: "PATCH", body: jsonBody(patch) });
      await refresh(); setSuccess("Saved successfully."); notify("Leave policy updated.");
    } catch (reason) { setError(apiMessage(reason)); }
  }

  async function setLeaveTypeActive(id: string, active: boolean) {
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/leave-types/${encodeURIComponent(id)}`, { method: "PATCH", body: jsonBody({ active }) });
      await refresh(); setSuccess("Saved successfully."); notify("Leave policy updated.");
    } catch (reason) { setError(apiMessage(reason)); }
  }

  async function editHoliday(item: OrganizationPayload["holidays"][number]) {
    const name = window.prompt("Holiday name", item.name)?.trim();
    if (!name) return;
    const date = window.prompt("Date (YYYY-MM-DD)", item.date)?.trim();
    if (!date) return;
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/holidays/${encodeURIComponent(item.id)}`, { method: "PATCH", body: jsonBody({ name, date }) });
      await refresh(); setSuccess("Saved successfully."); notify("Holiday calendar updated.");
    } catch (reason) { setError(apiMessage(reason)); }
  }

  return <>
    <PageHeading eyebrow="COMPANY SETUP" title="Organization" description="Keep your workplace details and people policies in one place." action={<span className="role-view-chip"><Settings2 size={14} />{canManage ? "Admin controls" : "Read only for HR"}</span>} />
    <div className="module-grid organization-grid">
      <Panel title="Workplace settings" subtitle="These rules apply to new attendance and leave records." className="span-two">
        {organization ? <form className="form-grid" onSubmit={(event) => action(event, async () => {
          await apiRequest("/api/organization", { method: "PATCH", body: jsonBody({
            name: form.name, timezone: form.timezone, officeStart: form.officeStart,
            graceMinutes: Number(form.graceMinutes), weekendDays: form.weekendDays,
            officeLat: form.officeLat ? Number(form.officeLat) : null,
            officeLng: form.officeLng ? Number(form.officeLng) : null,
            geofenceRadiusMeters: Number(form.geofenceRadiusMeters),
          }) });
        })}>
          <label className="field-label">Company name<input required disabled={!canManage} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="field-label">Time zone<input required disabled={!canManage} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
          <label className="field-label">Office start<input type="time" required disabled={!canManage} value={form.officeStart} onChange={(event) => setForm({ ...form, officeStart: event.target.value })} /></label>
          <label className="field-label">Grace period (minutes)<input type="number" min={0} max={180} required disabled={!canManage} value={form.graceMinutes} onChange={(event) => setForm({ ...form, graceMinutes: Number(event.target.value) })} /></label>
          <fieldset className="weekend-field"><legend>Weekend days</legend><label><input type="checkbox" disabled={!canManage} checked={form.weekendDays.includes(0)} onChange={() => toggleWeekend(0)} /> Sunday</label><label><input type="checkbox" disabled={!canManage} checked={form.weekendDays.includes(6)} onChange={() => toggleWeekend(6)} /> Saturday</label></fieldset>
          <label className="field-label">Office latitude <span className="optional-label">optional</span><input type="number" step="any" disabled={!canManage} placeholder="24.8607" value={form.officeLat} onChange={(event) => setForm({ ...form, officeLat: event.target.value })} /></label>
          <label className="field-label">Office longitude <span className="optional-label">optional</span><input type="number" step="any" disabled={!canManage} placeholder="67.0011" value={form.officeLng} onChange={(event) => setForm({ ...form, officeLng: event.target.value })} /></label>
          <label className="field-label">Office radius (m)<input type="number" min={10} max={5000} disabled={!canManage} value={form.geofenceRadiusMeters} onChange={(event) => setForm({ ...form, geofenceRadiusMeters: Number(event.target.value) })} /></label>
          <div className="form-actions span-two"><FormError>{error}</FormError><FormSuccess>{success}</FormSuccess>{canManage && <PrimaryButton disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save workplace settings"}</PrimaryButton>}</div>
        </form> : <div className="loading-line">Loading workplace settings…</div>}
      </Panel>
      <Panel title="Departments" subtitle="Group people for reporting and access." className="compact-panel">
        {canManage && <form className="inline-create-form" onSubmit={(event) => action(event, async () => { await apiRequest("/api/departments", { method: "POST", body: jsonBody({ name: departmentName }) }); setDepartmentName(""); })}><input required minLength={2} placeholder="New department" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} aria-label="New department name" /><PrimaryButton aria-label="Add department" disabled={saving}><Plus size={16} /></PrimaryButton></form>}
        <FormError>{error}</FormError>
        <div className="tag-list">{organization?.departments.length ? organization.departments.map((item) => <span className="soft-tag" key={item.id}>{item.name}{canManage && <button className="tag-edit-button" type="button" aria-label={`Rename ${item.name}`} onClick={() => void renameRecord("/api/departments", item.id, item.name)}><Pencil size={12} /></button>}</span>) : <span className="muted small-text">No departments added yet.</span>}</div>
      </Panel>
      <Panel title="Designations" subtitle="Use clear titles across your employee directory." className="compact-panel">
        {canManage && <form className="inline-create-form" onSubmit={(event) => action(event, async () => { await apiRequest("/api/designations", { method: "POST", body: jsonBody({ name: designationName }) }); setDesignationName(""); })}><input required minLength={2} placeholder="New designation" value={designationName} onChange={(event) => setDesignationName(event.target.value)} aria-label="New designation name" /><PrimaryButton aria-label="Add designation" disabled={saving}><Plus size={16} /></PrimaryButton></form>}
        <FormError>{error}</FormError>
        <div className="tag-list">{organization?.designations.length ? organization.designations.map((item) => <span className="soft-tag" key={item.id}>{item.name}{canManage && <button className="tag-edit-button" type="button" aria-label={`Rename ${item.name}`} onClick={() => void renameRecord("/api/designations", item.id, item.name)}><Pencil size={12} /></button>}</span>) : <span className="muted small-text">No designations added yet.</span>}</div>
      </Panel>
      <Panel title="Leave policies" subtitle="Quota settings are saved with each new request." className="span-two">
        {canManage && <form className="inline-policy-form" onSubmit={(event) => action(event, async () => { await apiRequest("/api/leave-types", { method: "POST", body: jsonBody(leaveType) }); setLeaveType({ code: "", name: "", yearlyQuota: 12, unlimited: false }); })}>
          <label className="field-label">Code<input required pattern="[a-z][a-z0-9_-]{1,39}" placeholder="parental" value={leaveType.code} onChange={(event) => setLeaveType({ ...leaveType, code: event.target.value.toLowerCase() })} /></label>
          <label className="field-label">Leave type<input required minLength={2} placeholder="Parental leave" value={leaveType.name} onChange={(event) => setLeaveType({ ...leaveType, name: event.target.value })} /></label>
          <label className="field-label">Days per year<input type="number" min={1} max={366} disabled={leaveType.unlimited} value={leaveType.yearlyQuota} onChange={(event) => setLeaveType({ ...leaveType, yearlyQuota: Number(event.target.value) })} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={leaveType.unlimited} onChange={(event) => setLeaveType({ ...leaveType, unlimited: event.target.checked })} /> Unlimited</label>
          <PrimaryButton disabled={saving}><Plus size={15} /> Add type</PrimaryButton>
        </form>}
        <FormError>{error}</FormError>
        <div className="policy-list">{organization?.leaveTypes.map((item) => <div className="policy-row" key={item.id}><div><strong>{item.name}</strong><small>{item.code}</small></div><span>{item.unlimited ? "Unlimited" : `${item.yearlyQuota} days / year`}</span><StatusPill value={item.active ? "Active" : "Inactive"} />{canManage && <div className="policy-actions"><button className="text-button" type="button" onClick={() => void editLeaveType(item)}>Edit</button><button className="text-button" type="button" onClick={() => void setLeaveTypeActive(item.id, !item.active)}>{item.active ? "Deactivate" : "Activate"}</button></div>}</div>)}</div>
      </Panel>
      <Panel title="Public holidays" subtitle="Holiday dates are excluded from leave day counts." className="span-two">
        {canManage && <form className="inline-holiday-form" onSubmit={(event) => action(event, async () => { await apiRequest("/api/holidays", { method: "POST", body: jsonBody(holiday) }); setHoliday({ date: "", name: "" }); })}>
          <label className="field-label">Date<input required type="date" value={holiday.date} onChange={(event) => setHoliday({ ...holiday, date: event.target.value })} /></label>
          <label className="field-label holiday-name-field">Holiday<input required minLength={2} placeholder="Holiday name" value={holiday.name} onChange={(event) => setHoliday({ ...holiday, name: event.target.value })} /></label>
          <PrimaryButton disabled={saving}><Plus size={15} /> Add holiday</PrimaryButton>
        </form>}
        <div className="holiday-list">{organization?.holidays.length ? organization.holidays.map((item) => <div className="holiday-row" key={item.id}><span className="holiday-date-icon"><CalendarDays size={15} /></span><strong>{item.name}</strong><span>{formatDate(item.date)}</span>{canManage && <button className="tag-edit-button" type="button" aria-label={`Edit ${item.name}`} onClick={() => void editHoliday(item)}><Pencil size={12} /></button>}</div>) : <p className="muted small-text">No public holidays have been added.</p>}</div>
      </Panel>
      <Panel title="Attendance policy" subtitle="Plain-language rules used by the system." className="span-two policy-note-panel">
        <div className="rule-summary"><div><span><Clock3 size={15} /></span><strong>Late after</strong><small>{organization?.calendar.officeStart ?? "09:00"} + {organization?.calendar.graceMinutes ?? 15} minute grace</small></div><div><span><MapPin size={15} /></span><strong>Office area</strong><small>{organization?.calendar.officeLat != null && organization.calendar.officeLng != null ? `${organization.calendar.geofenceRadiusMeters} m radius configured` : "Location is optional and not configured"}</small></div><div><span><Settings2 size={15} /></span><strong>Half day</strong><small>Less than 5 hours worked</small></div></div>
      </Panel>
    </div>
  </>;

  function toggleWeekend(day: number) {
    const weekendDays = form.weekendDays.includes(day) ? form.weekendDays.filter((item) => item !== day) : [...form.weekendDays, day];
    setForm({ ...form, weekendDays });
  }
}
