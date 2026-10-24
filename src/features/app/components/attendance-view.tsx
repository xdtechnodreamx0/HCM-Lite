"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowRight, CalendarDays, Check, Clock3, LogIn, LogOut, MapPin, RotateCcw } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { AttendanceRecord, CorrectionRecord, OrganizationPayload, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, SecondaryButton, StatusPill, formatDate, formatTime } from "@/features/app/components/ui";

export function AttendanceView({ attendance, corrections, organization, company, role, refresh, notify }: {
  attendance: AttendanceRecord[];
  corrections: CorrectionRecord[];
  organization: OrganizationPayload | null;
  company: SessionPayload["company"];
  role: NonNullable<SessionPayload["user"]>["role"];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const isEmployee = role === "EMPLOYEE";
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: company?.timezone ?? "Asia/Karachi" }).format(new Date()));
  const [departmentId, setDepartmentId] = useState("");
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loadingRows, setLoadingRows] = useState(!isEmployee);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (isEmployee) return;
    let active = true;
    const params = new URLSearchParams({ date });
    if (departmentId) params.set("departmentId", departmentId);
    void apiRequest<AttendanceRecord[]>(`/api/attendance?${params.toString()}`).then((result) => { if (active) setRows(result); })
      .catch((reason: unknown) => { if (active) setError(apiMessage(reason)); })
      .finally(() => { if (active) setLoadingRows(false); });
    return () => { active = false; };
  }, [date, departmentId, isEmployee, attendance]);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: company?.timezone ?? "Asia/Karachi" }).format(new Date());
  const todayRecord = attendance.find((row) => row.workDate === today);
  const hasCheckedIn = Boolean(todayRecord?.checkInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkOutAt);

  async function attendanceAction(action: "check-in" | "check-out") {
    setBusy(true); setError("");
    try { await apiRequest(`/api/attendance/${action}`, { method: "POST" }); await refresh(); notify(action === "check-in" ? "Check-in recorded." : "Check-out recorded."); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    const checkIn = String(values.get("checkIn"));
    const checkOut = String(values.get("checkOut"));
    try {
      await apiRequest("/api/corrections", { method: "POST", body: jsonBody({
        workDate: selectedDate,
        checkInAt: checkIn ? new Date(`${selectedDate}T${checkIn}:00`).toISOString() : undefined,
        checkOutAt: checkOut ? new Date(`${selectedDate}T${checkOut}:00`).toISOString() : undefined,
        reason: String(values.get("reason")),
      }) });
      setShowCorrection(false); event.currentTarget.reset(); await refresh(); notify("Correction request sent to HR.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function decideCorrection(item: CorrectionRecord, decision: "approved" | "rejected") {
    const comment = window.prompt(`${decision === "approved" ? "Approval" : "Rejection"} note for ${item.workDate}`);
    if (!comment || comment.trim().length < 2) return;
    setBusy(true); setError("");
    try { await apiRequest(`/api/corrections/${item.id}`, { method: "PATCH", body: jsonBody({ decision, comment }) }); await refresh(); notify(`Correction ${decision}.`); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="TIME & ATTENDANCE" title={isEmployee ? "My attendance" : "Attendance"} description={isEmployee ? "Your check-in history and recorded hours." : "A clear daily view of who’s here and what needs attention."} action={isEmployee ? <span className="role-view-chip"><MapPin size={14} />Server-timestamped</span> : <div className="attendance-filter-bar"><label className="date-filter"><CalendarDays size={15} /><span className="sr-only">Attendance date</span><input type="date" value={date} onChange={(event) => { setLoadingRows(true); setDate(event.target.value); }} /></label><label className="filter-label">Department <select aria-label="Filter by department" value={departmentId} onChange={(event) => { setLoadingRows(true); setDepartmentId(event.target.value); }}><option value="">All departments</option>{organization?.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>} />
    {isEmployee ? <>
      <Panel title="Today’s check-in" subtitle={`Office starts at ${organization?.calendar.officeStart ?? company?.officeStart ?? "09:00"} · ${organization?.calendar.graceMinutes ?? company?.graceMinutes ?? 15} minute grace`} className="checkin-panel">
        <div className="checkin-status"><span className={`checkin-icon ${hasCheckedIn ? "checked-in" : ""}`}><Clock3 size={22} /></span><div><strong>{hasCheckedOut ? "Your day is complete" : hasCheckedIn ? "You’re checked in" : "Ready when you are"}</strong><small>{hasCheckedOut ? `Checked out at ${formatTime(todayRecord?.checkOutAt)}` : hasCheckedIn ? `Checked in at ${formatTime(todayRecord?.checkInAt)}${todayRecord?.late ? " · Late" : ""}` : "A secure timestamp will be recorded when you check in."}</small></div>
          <div className="checkin-actions">{!hasCheckedIn ? <PrimaryButton disabled={busy} onClick={() => void attendanceAction("check-in")}><LogIn size={16} /> Check in</PrimaryButton> : !hasCheckedOut ? <PrimaryButton disabled={busy} onClick={() => void attendanceAction("check-out")}><LogOut size={16} /> Check out</PrimaryButton> : <StatusPill value={todayRecord?.status ?? "present"} />}</div>
        </div><FormError>{error}</FormError>
      </Panel>
      <Panel title="Your history" subtitle="Recent attendance records, from newest to oldest." className="table-panel">
        {attendance.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>DATE</th><th>CHECK IN</th><th>CHECK OUT</th><th>HOURS</th><th>STATUS</th><th /></tr></thead><tbody>{attendance.map((item) => <tr key={item.id ?? item.workDate}><td>{formatDate(item.workDate)}</td><td>{formatTime(item.checkInAt)}</td><td>{formatTime(item.checkOutAt)}</td><td>{(item.workedSeconds / 3600).toFixed(1)} h</td><td><StatusPill value={item.status} /></td><td>{item.workDate && <button className="button button-quiet button-small" onClick={() => { setSelectedDate(item.workDate ?? ""); setShowCorrection(true); }}>Request correction</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No attendance yet" description="Your first check-in will create an attendance record here." icon={Activity} />}
      </Panel>
    </> : <>
      <div className="attendance-toolbar"><span className="date-display"><CalendarDays size={16} /> {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span className="toolbar-caption">{loadingRows ? "Loading the daily board…" : `${rows.length} team records`}</span></div>
      <Panel className="table-panel attendance-board-panel">
        {error && <FormError>{error}</FormError>}
        {rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>DEPARTMENT</th><th>CHECK IN</th><th>CHECK OUT</th><th>WORKED</th><th>STATUS</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.employeeId}-${item.workDate ?? date}`}><td><div className="person-cell"><span className="person-monogram">{item.employeeName?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{item.employeeName}</strong><small>{item.employeeCode}</small></span></div></td><td>{item.departmentName || "—"}</td><td>{formatTime(item.checkInAt)}</td><td>{formatTime(item.checkOutAt)}</td><td>{(item.workedSeconds / 3600).toFixed(1)} h</td><td><StatusPill value={item.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="No team records for this date" description="The board will fill in as people check in. Non-workdays and public holidays are kept clear." icon={Activity} />}
      </Panel>
      {role === "HR" && <Panel title="Attendance corrections" subtitle="Employee requests that need a review." className="correction-panel">
        {corrections.filter((item) => item.status === "pending").length ? <div className="correction-list">{corrections.filter((item) => item.status === "pending").map((item) => <div className="correction-row" key={item.id}><span className="correction-icon"><RotateCcw size={16} /></span><div><strong>{item.workDate} · {item.reason}</strong><small>Requested times: {formatTime(item.after.checkInAt)} – {formatTime(item.after.checkOutAt)}</small></div><div className="correction-actions"><SecondaryButton className="button-small" disabled={busy} onClick={() => void decideCorrection(item, "rejected")}>Decline</SecondaryButton><PrimaryButton className="button-small" disabled={busy} onClick={() => void decideCorrection(item, "approved")}><Check size={14} /> Approve</PrimaryButton></div></div>)}</div> : <EmptyState title="No corrections to review" description="New requests from employees will appear here." icon={RotateCcw} />}
      </Panel>}
    </>}
    {showCorrection && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCorrection(false); }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="correction-title"><button className="modal-close icon-button" aria-label="Close correction form" onClick={() => setShowCorrection(false)}>×</button><span className="eyebrow">ATTENDANCE HELP</span><h2 id="correction-title">Request a correction</h2><p className="muted">HR will review the time you request and the reason.</p><form className="form-stack" onSubmit={submitCorrection}><label className="field-label">Attendance date<input type="date" required value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label className="field-label">Correct check-in time<input name="checkIn" type="time" /></label><label className="field-label">Correct check-out time<input name="checkOut" type="time" /></label><label className="field-label">Reason<textarea name="reason" required minLength={8} maxLength={500} rows={3} placeholder="Tell HR what happened." /></label><FormError>{error}</FormError><PrimaryButton disabled={busy}>{busy ? "Sending…" : "Send request"}<ArrowRight size={15} /></PrimaryButton></form></section></div>}
  </>;
}
