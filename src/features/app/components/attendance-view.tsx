"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowRight, CalendarDays, Check, Clock3, LogIn, LogOut, MapPin, RotateCcw } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { AttendanceBoardRow, AttendanceRecord, CorrectionRecord, OrganizationPayload, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, SecondaryButton, StatusPill, formatDate, formatTime } from "@/features/app/components/ui";

export function AttendanceView({ attendance, corrections, organization, company, role, employeeId, refresh, notify }: {
  attendance: AttendanceRecord[];
  corrections: CorrectionRecord[];
  organization: OrganizationPayload | null;
  company: SessionPayload["company"];
  role: NonNullable<SessionPayload["user"]>["role"];
  employeeId?: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const isEmployee = role === "EMPLOYEE";
  const canSelfService = Boolean(employeeId) && (role === "EMPLOYEE" || role === "HR");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: company?.timezone ?? "Asia/Karachi" }).format(new Date()));
  const [departmentId, setDepartmentId] = useState("");
  const [rows, setRows] = useState<AttendanceBoardRow[]>([]);
  const [hrSelfRows, setHrSelfRows] = useState<AttendanceRecord[]>([]);
  const [loadingRows, setLoadingRows] = useState(!isEmployee);
  const [loadingSelf, setLoadingSelf] = useState(role === "HR" && canSelfService);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [correctionComments, setCorrectionComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canSelfService || isEmployee) return;
    let active = true;
    void apiRequest<AttendanceRecord[]>("/api/attendance?mine=1")
      .then((result) => { if (active) setHrSelfRows(result); })
      .catch((reason: unknown) => { if (active) setError(apiMessage(reason)); })
      .finally(() => { if (active) setLoadingSelf(false); });
    return () => { active = false; };
  }, [attendance, canSelfService, isEmployee]);

  useEffect(() => {
    if (isEmployee) return;
    let active = true;
    const params = new URLSearchParams({ date });
    if (departmentId) params.set("departmentId", departmentId);
    void apiRequest<AttendanceBoardRow[]>(`/api/attendance?${params.toString()}`).then((result) => { if (active) setRows(result); })
      .catch((reason: unknown) => { if (active) setError(apiMessage(reason)); })
      .finally(() => { if (active) setLoadingRows(false); });
    return () => { active = false; };
  }, [date, departmentId, isEmployee, attendance]);

  const selfRows = isEmployee ? attendance : hrSelfRows;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: company?.timezone ?? "Asia/Karachi" }).format(new Date());
  const todayRecord = selfRows.find((row) => row.workDate === today);
  const hasCheckedIn = Boolean(todayRecord?.checkInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkOutAt);
  const officeLat = organization?.calendar.officeLat ?? company?.officeLat;
  const officeLng = organization?.calendar.officeLng ?? company?.officeLng;
  const geofenceEnabled = officeLat != null && officeLng != null;
  const reviewCorrections = corrections.filter((item) => item.status === "pending" && (item.canDecide ?? (role === "HR" && item.employeeId !== employeeId)));

  async function locationBody() {
    if (!geofenceEnabled) return undefined;
    if (!navigator.geolocation) throw new Error("This browser cannot share a location. Use a current browser or ask HR for a correction.");
    setLocationNote("Checking your location against the office area…");
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
    });
    return jsonBody({ location: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy } });
  }

  async function attendanceAction(action: "check-in" | "check-out") {
    setBusy(true); setError(""); setLocationNote("");
    try {
      const body = action === "check-in" ? await locationBody() : undefined;
      await apiRequest(`/api/attendance/${action}`, { method: "POST", ...(body ? { body } : {}) });
      await refresh();
      setLocationNote(geofenceEnabled && action === "check-in" ? "Location verified by the server." : "");
      notify(action === "check-in" ? "Check-in recorded." : "Check-out recorded.");
    } catch (reason) {
      const code = reason instanceof GeolocationPositionError ? reason.code : 0;
      if (reason instanceof GeolocationPositionError) {
        setError(code === 1 ? "Location permission was denied. Allow location access to check in inside the office area." : "We could not read your location. Move somewhere with a clear signal and try again.");
        setLocationNote("");
      } else setError(apiMessage(reason));
    }
    finally { setBusy(false); }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const checkIn = String(values.get("checkIn"));
    const checkOut = String(values.get("checkOut"));
    try {
      await apiRequest("/api/corrections", { method: "POST", body: jsonBody({
        workDate: selectedDate,
        checkInAt: checkIn ? new Date(`${selectedDate}T${checkIn}:00`).toISOString() : undefined,
        checkOutAt: checkOut ? new Date(`${selectedDate}T${checkOut}:00`).toISOString() : undefined,
        reason: String(values.get("reason")),
      }) });
      setShowCorrection(false); form.reset(); await refresh(); notify("Correction request sent to HR.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function decideCorrection(item: CorrectionRecord, decision: "approved" | "rejected") {
    const comment = (correctionComments[item.id] ?? "").trim();
    if (comment.length < 2) { setError("Add a short decision note before reviewing a correction."); return; }
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/corrections/${item.id}`, { method: "PATCH", body: jsonBody({ decision, comment }) });
      await refresh(); notify(`Correction ${decision}.`);
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="TIME & ATTENDANCE" title={isEmployee ? "My attendance" : "Attendance"} description={isEmployee ? "Your check-in history and recorded hours." : role === "HR" ? "Your own workday plus a daily view of the whole team." : "A clear daily view of who’s here and what needs attention."} action={isEmployee ? <span className="role-view-chip"><MapPin size={14} />Server-timestamped</span> : <div className="attendance-filter-bar"><label className="date-filter"><CalendarDays size={15} /><span className="sr-only">Attendance date</span><input type="date" value={date} onChange={(event) => { setLoadingRows(true); setDate(event.target.value); }} /></label><label className="filter-label">Department <select aria-label="Filter by department" value={departmentId} onChange={(event) => { setLoadingRows(true); setDepartmentId(event.target.value); }}><option value="">All departments</option>{organization?.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>} />
    {role === "HR" && !canSelfService && <Panel className="self-service-note"><EmptyState title="Your own attendance is not linked yet" description="Ask an Admin to link your login to a staff profile in User access. You can still review the team board and corrections below." icon={MapPin} /></Panel>}
    {canSelfService && <>
      <Panel title={isEmployee ? "Today’s check-in" : "My check-in"} subtitle={`Office starts at ${organization?.calendar.officeStart ?? company?.officeStart ?? "09:00"} · ${organization?.calendar.graceMinutes ?? company?.graceMinutes ?? 15} minute grace${geofenceEnabled ? " · location verified" : ""}`} className="checkin-panel">
        <div className="checkin-status"><span className={`checkin-icon ${hasCheckedIn ? "checked-in" : ""}`}><Clock3 size={22} /></span><div><strong>{hasCheckedOut ? "Your day is complete" : hasCheckedIn ? "You’re checked in" : "Ready when you are"}</strong><small>{hasCheckedOut ? `Checked out at ${formatTime(todayRecord?.checkOutAt)}` : hasCheckedIn ? `Checked in at ${formatTime(todayRecord?.checkInAt)}${todayRecord?.late ? " · Late" : ""}` : geofenceEnabled ? "Your browser will share a location; the server verifies it is inside the office area." : "A secure, server-side timestamp will be recorded when you check in."}</small></div>
          <div className="checkin-actions">{!hasCheckedIn ? <PrimaryButton disabled={busy} onClick={() => void attendanceAction("check-in")}><LogIn size={16} /> Check in</PrimaryButton> : !hasCheckedOut ? <PrimaryButton disabled={busy} onClick={() => void attendanceAction("check-out")}><LogOut size={16} /> Check out</PrimaryButton> : <StatusPill value={todayRecord?.status ?? "present"} />}</div>
        </div>{locationNote && <p className="location-note"><MapPin size={13} /> {locationNote}</p>}<FormError>{error}</FormError>
      </Panel>
      <Panel title={isEmployee ? "Your history" : "My attendance history"} subtitle="Recent attendance records, from newest to oldest." className="table-panel">
        {loadingSelf ? <div className="loading-line">Loading your attendance…</div> : selfRows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>DATE</th><th>CHECK IN</th><th>CHECK OUT</th><th>HOURS</th><th>STATUS</th><th /></tr></thead><tbody>{selfRows.map((item) => <tr key={item.id ?? item.workDate}><td>{formatDate(item.workDate)}</td><td>{formatTime(item.checkInAt)}</td><td>{formatTime(item.checkOutAt)}</td><td>{(item.workedSeconds / 3600).toFixed(1)} h</td><td><StatusPill value={item.status} /></td><td>{item.workDate && <button className="button button-quiet button-small" onClick={() => { setSelectedDate(item.workDate ?? ""); setShowCorrection(true); }}>Request correction</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No attendance yet" description="Your first check-in will create an attendance record here." icon={Activity} />}
      </Panel>
    </>}
    {!isEmployee && <>
      <div className="attendance-toolbar"><span className="date-display"><CalendarDays size={16} /> {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span className="toolbar-caption">{loadingRows ? "Loading the daily board…" : `${rows.length} team records`}</span></div>
      <Panel className="table-panel attendance-board-panel">
        {!canSelfService && !isEmployee && <FormError>{error}</FormError>}
        {rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>DEPARTMENT</th><th>CHECK IN</th><th>CHECK OUT</th><th>WORKED</th><th>STATUS</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.employeeId}-${item.id ?? date}`}><td><div className="person-cell"><span className="person-monogram">{item.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{item.name}</strong><small>{item.employeeCode}{item.employeeId === employeeId ? " · You" : ""}</small></span></div></td><td>{item.departmentName || "—"}</td><td>{formatTime(item.checkInAt)}</td><td>{formatTime(item.checkOutAt)}</td><td>{(item.workedSeconds / 3600).toFixed(1)} h</td><td><StatusPill value={item.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="No team records for this date" description="The board will fill in as people check in. Non-workdays and public holidays are kept clear." icon={Activity} />}
      </Panel>
      {role === "HR" || reviewCorrections.length > 0 ? <Panel title={role === "ADMIN" ? "Corrections awaiting Admin review" : "Attendance corrections"} subtitle={role === "ADMIN" ? "Admin cover for an HR teammate’s own correction. Employee corrections stay with HR." : "Employee requests that need a review. Your own requests stay with an Admin."} className="correction-panel">
        <FormError>{error}</FormError>
        {reviewCorrections.length ? <div className="correction-list">{reviewCorrections.map((item) => <div className="correction-row" key={item.id}><span className="correction-icon"><RotateCcw size={16} /></span><div><strong>{item.workDate} · {item.reason}</strong><small>Requested times: {formatTime(item.after.checkInAt)} – {formatTime(item.after.checkOutAt)}</small><input className="correction-comment" aria-label={`Decision note for ${item.workDate}`} placeholder="Add a short decision note" maxLength={500} value={correctionComments[item.id] ?? ""} onChange={(event) => setCorrectionComments((current) => ({ ...current, [item.id]: event.target.value }))} /></div><div className="correction-actions"><SecondaryButton className="button-small" disabled={busy} onClick={() => void decideCorrection(item, "rejected")}>Decline</SecondaryButton><PrimaryButton className="button-small" disabled={busy} onClick={() => void decideCorrection(item, "approved")}><Check size={14} /> Approve</PrimaryButton></div></div>)}</div> : <EmptyState title="No corrections to review" description="New requests from employees will appear here." icon={RotateCcw} />}
      </Panel> : <Panel title="Recent correction requests" subtitle="A read-only view of employee attendance corrections." className="correction-panel">
        {corrections.length ? <div className="correction-list">{corrections.slice(0, 8).map((item) => <div className="correction-row" key={item.id}><span className="correction-icon"><RotateCcw size={16} /></span><div><strong>{item.workDate} · {item.reason}</strong><small>{item.status} · requested {formatTime(item.after.checkInAt)} – {formatTime(item.after.checkOutAt)}</small></div><StatusPill value={item.status} /></div>)}</div> : <EmptyState title="No correction requests" description="Employee requests will appear here for visibility." icon={RotateCcw} />}
      </Panel>}
    </>}
    {showCorrection && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCorrection(false); }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="correction-title"><button className="modal-close icon-button" aria-label="Close correction form" onClick={() => setShowCorrection(false)}>×</button><span className="eyebrow">ATTENDANCE HELP</span><h2 id="correction-title">Request a correction</h2><p className="muted">HR will review the time you request and the reason.</p><form className="form-stack" onSubmit={submitCorrection}><label className="field-label">Attendance date<input type="date" required value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label className="field-label">Correct check-in time<input name="checkIn" type="time" /></label><label className="field-label">Correct check-out time<input name="checkOut" type="time" /></label><label className="field-label">Reason<textarea name="reason" required minLength={8} maxLength={500} rows={3} placeholder="Tell HR what happened." /></label><FormError>{error}</FormError><PrimaryButton disabled={busy}>{busy ? "Sending…" : "Send request"}<ArrowRight size={15} /></PrimaryButton></form></section></div>}
  </>;
}
