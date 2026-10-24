"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Download, FileSpreadsheet, Mail, Plus, Search, UserRound, Users } from "lucide-react";
import { apiRequest, downloadApiFile, jsonBody } from "@/lib/api-client";
import type { EmployeeRecord, OrganizationPayload, SessionPayload, UserRecord } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, FormSuccess, Monogram, PageHeading, Panel, PrimaryButton, SecondaryButton, StatusPill, formatDate, formatMoney } from "@/features/app/components/ui";

type EmployeePage = { items: EmployeeRecord[]; page: number; pageSize: number; total: number };
type CsvIssue = { row: number; field: string; reason: string };
type CsvPreview = { valid: boolean; rowCount: number; validRows: number; issues: CsvIssue[] };
type CsvImport = { imported: number; rowCount: number; valid: boolean; importedRows?: Array<{ row: number; employeeCode: string; temporaryPassword: string | null }>; issues: CsvIssue[] };

export function PeopleView({ employees, organization, role, refresh, notify, searchSeed = "" }: {
  employees: EmployeeRecord[];
  organization: OrganizationPayload | null;
  role: NonNullable<SessionPayload["user"]>["role"];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  searchSeed?: string;
}) {
  const [rows, setRows] = useState(employees);
  const [queryInput, setQueryInput] = useState(searchSeed);
  const [query, setQuery] = useState(searchSeed);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "joiningDate" | "employeeCode">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(employees.length);
  const [loadingRows, setLoadingRows] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvImport, setCsvImport] = useState<CsvImport | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [selected, setSelected] = useState<EmployeeRecord | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const canCreate = role === "HR" || role === "ADMIN";
  const pages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ query, page: String(page), pageSize: "20", status: statusFilter, sortBy, sortDirection });
    if (departmentFilter) params.set("departmentId", departmentFilter);
    void apiRequest<EmployeePage>(`/api/employees?${params.toString()}`).then((result) => {
      if (active) { setRows(result.items); setTotal(result.total); }
    }).catch((reason: unknown) => { if (active) setError(apiMessage(reason)); }).finally(() => { if (active) setLoadingRows(false); });
    return () => { active = false; };
  }, [query, page, statusFilter, departmentFilter, sortBy, sortDirection, employees]);

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess(""); setTemporaryPassword("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ temporaryPassword: string | null; accountLinked?: boolean }>("/api/employees", {
        method: "POST",
        body: jsonBody({
          employeeCode: String(values.get("employeeCode")), name: String(values.get("name")), email: String(values.get("email")),
          phone: String(values.get("phone") ?? ""), address: String(values.get("address") ?? ""), gender: String(values.get("gender") ?? ""),
          departmentId: String(values.get("departmentId")), designationId: String(values.get("designationId")),
          joiningDate: String(values.get("joiningDate")), status: String(values.get("status")), basicSalary: Number(values.get("basicSalary")),
        }),
      });
      setTemporaryPassword(result.temporaryPassword ?? "");
      setSuccess(result.accountLinked ? "Employee profile linked to the existing sign-up. They can use the password they created." : "Employee and login created. Share this temporary password securely; it is shown only now.");
      event.currentTarget.reset();
      setPage(1); setQuery(""); setQueryInput("");
      await refresh();
      notify("Employee added to the directory.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSaving(false); }
  }

  async function previewCsv() {
    setCsvBusy(true); setCsvError(""); setCsvImport(null); setCsvPreview(null);
    try {
      const result = await apiRequest<CsvPreview>("/api/employees/import", { method: "POST", body: jsonBody({ csv: csvText, dryRun: true }) });
      setCsvPreview(result);
    } catch (reason) { setCsvError(apiMessage(reason)); }
    finally { setCsvBusy(false); }
  }

  async function importCsv() {
    setCsvBusy(true); setCsvError(""); setCsvImport(null);
    try {
      const result = await apiRequest<CsvImport>("/api/employees/import", { method: "POST", body: jsonBody({ csv: csvText, dryRun: false }) });
      setCsvImport(result);
      setCsvPreview(null);
      await refresh();
      notify(`${result.imported} ${result.imported === 1 ? "employee" : "employees"} imported.`);
    } catch (reason) { setCsvError(apiMessage(reason)); }
    finally { setCsvBusy(false); }
  }

  const filteredRows = useMemo(() => rows, [rows]);

  return <>
    <PageHeading eyebrow="PEOPLE DIRECTORY" title="People" description="A thoughtful overview of the people behind the work. New team profiles get Employee access by default." action={canCreate ? <PrimaryButton onClick={() => { setShowForm((visible) => !visible); setError(""); setSuccess(""); }}><Plus size={16} /> Add employee</PrimaryButton> : <span className="role-view-chip"><Users size={14} />Company directory</span>} />
    {showForm && canCreate && <Panel title="Add a team member" subtitle="A login is created with a one-time temporary password.">
      <form className="form-grid" onSubmit={createEmployee}>
        <label className="field-label">Employee code<input name="employeeCode" required minLength={2} maxLength={32} placeholder="NW-024" /></label>
        <label className="field-label">Full name<input name="name" required minLength={2} autoComplete="name" placeholder="Team member’s name" /></label>
        <label className="field-label">Work email<input name="email" required type="email" autoComplete="email" placeholder="person@company.com" /></label>
        <label className="field-label">Phone <span className="optional-label">optional</span><input name="phone" type="tel" autoComplete="tel" placeholder="+92 …" /></label>
        <label className="field-label">Department<select name="departmentId" required defaultValue=""><option value="" disabled>Select department</option>{organization?.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-label">Designation<select name="designationId" required defaultValue=""><option value="" disabled>Select designation</option>{organization?.designations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-label">Joining date<input name="joiningDate" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className="field-label">Employment status<select name="status" defaultValue="active"><option value="active">Active</option><option value="probation">Probation</option></select></label>
        <label className="field-label">Basic monthly salary (PKR)<input name="basicSalary" required type="number" min="1" max="100000000" step="0.01" inputMode="decimal" placeholder="85000" /></label>
        <label className="field-label">Gender <span className="optional-label">optional</span><select name="gender" defaultValue=""><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Self describe</option></select></label>
        <label className="field-label span-two">Address <span className="optional-label">optional</span><input name="address" maxLength={240} placeholder="City, country" /></label>
        <div className="form-actions span-two"><FormError>{error}</FormError><FormSuccess>{success}</FormSuccess>{temporaryPassword && <div className="temp-credential"><BadgeCheck size={16} /><span>Temporary password</span><code>{temporaryPassword}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(temporaryPassword)}>Copy</button></div>}<PrimaryButton disabled={saving}>{saving ? "Creating…" : "Create employee"}<ArrowRight size={15} /></PrimaryButton></div>
      </form>
    </Panel>}
    {canCreate && <Panel title="Import employees from CSV" subtitle="Validate a small CSV file first. Every imported employee receives a one-time password." action={<button className="button button-secondary button-small" type="button" onClick={() => { setShowImport((visible) => !visible); setCsvError(""); }}>{showImport ? "Close import" : <><FileSpreadsheet size={15} /> Import CSV</>}</button>}>
      {showImport && <div className="csv-import-area">
        <label className="field-label">Employee CSV file<input type="file" accept=".csv,text/csv" onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          setCsvPreview(null); setCsvImport(null); setCsvError("");
          if (!file) { setCsvText(""); setCsvFileName(""); return; }
          if (file.size > 1_000_000) { setCsvText(""); setCsvFileName(""); setCsvError("CSV file must be smaller than 1 MB."); return; }
          try { setCsvText(await file.text()); setCsvFileName(file.name); }
          catch { setCsvText(""); setCsvFileName(""); setCsvError("This file could not be read. Choose a UTF-8 CSV file."); }
        }} /></label>
        <details className="csv-column-help"><summary>Required columns and company IDs</summary>
          <p>Required columns: <code>employeeCode,name,email,departmentId,designationId,joiningDate,basicSalary</code>. Optional columns: <code>phone,address,gender,status</code>. Use dates like <code>2026-10-25</code> and salary in PKR.</p>
          <div className="csv-id-list"><strong>Department IDs</strong>{organization?.departments.map((item) => <span key={item.id}>{item.name} <code>{item.id}</code></span>)}</div>
          <div className="csv-id-list"><strong>Designation IDs</strong>{organization?.designations.map((item) => <span key={item.id}>{item.name} <code>{item.id}</code></span>)}</div>
        </details>
        {csvFileName && <span className="small-text muted">Selected: {csvFileName} · {csvText.length.toLocaleString()} characters</span>}
        <div className="form-actions"><FormError>{csvError}</FormError><PrimaryButton type="button" disabled={!csvText || csvBusy} onClick={() => void previewCsv()}>{csvBusy ? "Checking…" : "Validate CSV"}<ArrowRight size={15} /></PrimaryButton></div>
        {csvPreview && <div className={csvPreview.valid ? "inline-alert success-alert" : "inline-alert error-alert"} role="status">
          <strong>{csvPreview.valid ? `${csvPreview.validRows} rows ready to import` : `${csvPreview.issues.length} issue${csvPreview.issues.length === 1 ? "" : "s"} found`}</strong>
          <span>{csvPreview.rowCount} data rows checked. No records were created during validation.</span>
          {csvPreview.issues.length > 0 && <ul className="csv-issues">{csvPreview.issues.slice(0, 20).map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>Row {issue.row} · {issue.field}: {issue.reason}</li>)}</ul>}
          {csvPreview.valid && csvPreview.validRows > 0 && <button className="button button-primary button-small" type="button" disabled={csvBusy} onClick={() => void importCsv()}>Import {csvPreview.validRows} {csvPreview.validRows === 1 ? "employee" : "employees"}</button>}
        </div>}
        {csvImport && <div className={csvImport.valid ? "inline-alert success-alert" : "inline-alert error-alert"} role="status">
          <strong>{csvImport.imported} of {csvImport.rowCount} employees imported</strong>
          <span>Temporary passwords appear only here. Share each one privately and have the employee change it at first sign-in.</span>
          {csvImport.importedRows && csvImport.importedRows.length > 0 && <div className="table-scroll"><table className="data-table"><thead><tr><th>ROW</th><th>EMPLOYEE CODE</th><th>LOGIN DETAILS</th></tr></thead><tbody>{csvImport.importedRows.map((row) => <tr key={`${row.row}-${row.employeeCode}`}><td>{row.row}</td><td>{row.employeeCode}</td><td><code>{row.temporaryPassword ?? "Existing sign-up linked"}</code></td></tr>)}</tbody></table></div>}
          {csvImport.issues.length > 0 && <ul className="csv-issues">{csvImport.issues.map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>Row {issue.row} · {issue.field}: {issue.reason}</li>)}</ul>}
        </div>}
      </div>}
    </Panel>}
    <Panel title="All employees" subtitle={`${total} ${total === 1 ? "person" : "people"} in this workspace.`} className="people-table-panel" action={<button className="button button-secondary button-small" onClick={() => void downloadApiFile("/api/employees/export").then(() => notify("Employee CSV downloaded.")).catch((reason: unknown) => setError(apiMessage(reason)))}><Download size={15} /> Export CSV</button>}>
      <div className="table-toolbar"><form className="table-search" onSubmit={(event) => { event.preventDefault(); setLoadingRows(true); setPage(1); setQuery(queryInput.trim()); }}><Search size={16} /><input aria-label="Search people" placeholder="Search name, code or email" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} /><button type="submit">Search</button></form><div className="people-filter-controls"><label className="filter-label">Status <select aria-label="Filter by employee status" value={statusFilter} onChange={(event) => { setLoadingRows(true); setPage(1); setStatusFilter(event.target.value); }}><option value="all">All statuses</option><option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option></select></label><label className="filter-label">Department <select aria-label="Filter by employee department" value={departmentFilter} onChange={(event) => { setLoadingRows(true); setPage(1); setDepartmentFilter(event.target.value); }}><option value="">All departments</option>{organization?.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="filter-label">Sort by <select aria-label="Sort employees" value={sortBy} onChange={(event) => { setLoadingRows(true); setSortBy(event.target.value as typeof sortBy); }}><option value="name">Name</option><option value="joiningDate">Joining date</option><option value="employeeCode">Employee code</option></select></label><button className="button button-quiet button-small" type="button" aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`} onClick={() => { setLoadingRows(true); setSortDirection((value) => value === "asc" ? "desc" : "asc"); }}>{sortDirection === "asc" ? "A–Z" : "Z–A"}</button></div><span className="toolbar-caption">Search is scoped to your company</span></div>
      <FormError>{error}</FormError>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>DESIGNATION</th><th>JOINED</th><th>STATUS</th><th className="numeric-cell">BASIC PAY</th><th /></tr></thead><tbody>
        {filteredRows.length ? filteredRows.map((employee) => <tr key={employee.id} onClick={() => setSelected(employee)} className="clickable-row"><td><div className="person-cell"><Monogram name={employee.name} /><span><strong>{employee.name}</strong><small>{employee.employeeCode} · {employee.email}</small></span></div></td><td>{employee.departmentName || "—"}</td><td>{employee.designationName || "—"}</td><td>{formatDate(employee.joiningDate)}</td><td><StatusPill value={employee.status} /></td><td className="numeric-cell">{role === "EMPLOYEE" ? "Private" : formatMoney(employee.basicPaisa)}</td><td><button className="row-open" aria-label={`Open ${employee.name} profile`} onClick={(event) => { event.stopPropagation(); setSelected(employee); }}><ArrowRight size={15} /></button></td></tr>) : <tr><td colSpan={7}><EmptyState title={query ? "No matching people" : "Your directory is ready"} description={query ? "Try another name, email or employee code." : "When HR adds a team member, their profile will show up here."} icon={Users} /></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>{loadingRows ? "Updating results…" : `Showing ${total ? (page - 1) * 20 + 1 : 0}–${Math.min(page * 20, total)} of ${total}`}</span><div><SecondaryButton className="button-small" disabled={page <= 1} onClick={() => { setLoadingRows(true); setPage((value) => Math.max(1, value - 1)); }}><ArrowLeft size={14} /> Previous</SecondaryButton><span className="page-count">Page {page} of {pages}</span><SecondaryButton className="button-small" disabled={page >= pages} onClick={() => { setLoadingRows(true); setPage((value) => Math.min(pages, value + 1)); }}>Next <ArrowRight size={14} /></SecondaryButton></div></div>
    </Panel>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="modal-close icon-button" onClick={() => setSelected(null)} aria-label="Close profile">×</button><div className="profile-hero"><Monogram name={selected.name} className="profile-monogram" /><div><span className="eyebrow">EMPLOYEE 360</span><h2 id="profile-title">{selected.name}</h2><p>{selected.designationName || "Team member"} · {selected.departmentName || "Unassigned"}</p></div><StatusPill value={selected.status} /></div><div className="profile-detail-grid"><div><small>Employee code</small><strong>{selected.employeeCode}</strong></div><div><small>Work email</small><strong>{selected.email}</strong></div><div><small>Phone</small><strong>{selected.phone || "Not added"}</strong></div><div><small>Joined</small><strong>{formatDate(selected.joiningDate)}</strong></div><div><small>Basic salary</small><strong>{role === "EMPLOYEE" ? "Private" : formatMoney(selected.basicPaisa)}</strong></div><div><small>Department</small><strong>{selected.departmentName || "Not assigned"}</strong></div></div>{role === "HR" && <SalaryEditor employee={selected} onSaved={(basicPaisa) => setSelected({ ...selected, basicPaisa })} notify={notify} />}</section></div>}
  </>;
}

function SalaryEditor({ employee, onSaved, notify }: { employee: EmployeeRecord; onSaved: (basicPaisa: number) => void; notify: (message: string) => void }) {
  const [basicSalary, setBasicSalary] = useState(employee.basicPaisa == null ? "" : (employee.basicPaisa / 100).toFixed(2));
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const paisa = Math.round(Number(basicSalary) * 100);
      await apiRequest(`/api/employees/${employee.id}/salary`, { method: "POST", body: jsonBody({ basicSalary: Number(basicSalary), effectiveFrom }) });
      onSaved(paisa); notify("Salary change saved.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSaving(false); }
  }
  return <form className="salary-edit-form" onSubmit={save}><strong>Update salary</strong><label className="field-label">Basic monthly salary (PKR)<input required type="number" min="1" max="100000000" step="0.01" value={basicSalary} onChange={(event) => setBasicSalary(event.target.value)} /></label><label className="field-label">Effective from<input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label><FormError>{error}</FormError><PrimaryButton disabled={saving}>{saving ? "Saving…" : "Save salary change"}<ArrowRight size={14} /></PrimaryButton></form>;
}

export function UsersView({ users, actorId, refresh, notify }: { users: UserRecord[]; actorId: string; refresh: () => Promise<void>; notify: (message: string) => void }) {
  const [error, setError] = useState("");
  const [credential, setCredential] = useState("");
  const [busyId, setBusyId] = useState("");
  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setCredential("");
    const values = new FormData(event.currentTarget);
    try {
      const role = String(values.get("role"));
      const result = await apiRequest<{ temporaryPassword: string }>("/api/users", { method: "POST", body: jsonBody({ name: String(values.get("name")), email: String(values.get("email")), role }) });
      setCredential(result.temporaryPassword); event.currentTarget.reset(); await refresh(); notify(`${role === "ADMIN" ? "Admin" : "HR"} login created.`);
    } catch (reason) { setError(apiMessage(reason)); }
  }
  async function resetPassword(user: UserRecord) {
    setBusyId(user.id); setError("");
    try { const result = await apiRequest<{ emailSent?: boolean; verificationSent?: boolean }>(`/api/users/${user.id}`, { method: "POST" }); notify(result.verificationSent ? `Verification link sent to ${user.email}.` : `Password reset link sent to ${user.email}.`); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }
  async function toggleUser(user: UserRecord) {
    setBusyId(user.id); setError("");
    try { await apiRequest(`/api/users/${user.id}`, { method: "PATCH", body: jsonBody({ active: !user.active }) }); await refresh(); notify(user.active ? "Account deactivated." : "Account reactivated."); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }
  async function changeRole(user: UserRecord, role: UserRecord["role"]) {
    if (user.id === actorId) return;
    setBusyId(user.id); setError("");
    try { await apiRequest(`/api/users/${user.id}`, { method: "PATCH", body: jsonBody({ role }) }); await refresh(); notify(`${user.name} now has ${role === "ADMIN" ? "Admin" : role === "HR" ? "HR" : "Employee"} access.`); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }
  return <>
    <PageHeading eyebrow="ACCESS & SECURITY" title="User access" description="Choose who can manage company settings, people operations, or their own employee workspace." />
    <div className="module-grid">
      <Panel title="Create an Admin or HR login" subtitle="Employee accounts are created with their team profile in People. New accounts receive a one-time password." className="span-two">
        <form className="inline-create-user" onSubmit={addStaff}><label className="field-label">Full name<input required name="name" minLength={2} placeholder="Teammate name" /></label><label className="field-label">Work email<input required type="email" name="email" placeholder="teammate@company.com" /></label><label className="field-label">Workspace role<select name="role" defaultValue="HR"><option value="HR">HR · People operations</option><option value="ADMIN">Admin · Full company access</option></select></label><PrimaryButton><Plus size={15} /> Create login</PrimaryButton></form>
        <FormError>{error}</FormError>
        {credential && <div className="temp-credential"><BadgeCheck size={16} /><span>Temporary password</span><code>{credential}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(credential.split(": ").at(-1) ?? credential)}>Copy</button></div>}
      </Panel>
      <Panel title="Company accounts" subtitle={`${users.length} accounts provisioned from this workspace.`} className="span-two">
        {users.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>ACCOUNT</th><th>ROLE</th><th>STATUS</th><th>ACCESS</th><th /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="person-cell"><Monogram name={user.name} /><span><strong>{user.name}{user.id === actorId ? " · You" : ""}</strong><small><Mail size={11} /> {user.email}</small></span></div></td><td><select aria-label={`Role for ${user.name}`} className="role-select" value={user.role} disabled={busyId === user.id || user.id === actorId || user.signupPending} onChange={(event) => void changeRole(user, event.target.value as UserRecord["role"])}><option value="EMPLOYEE">Employee</option><option value="HR">HR</option><option value="ADMIN">Admin</option></select></td><td><StatusPill value={user.signupPending ? "Signup pending" : user.active ? "Active" : "Inactive"} /></td><td><span className="small-text muted">{user.signupPending ? "Add their employee profile using this email." : user.emailVerificationRequired && !user.emailVerifiedAt ? "Email verification pending" : user.forcePasswordChange ? "Temporary password pending" : "Password set"}</span></td><td><div className="row-actions"><button className="button button-quiet button-small" disabled={busyId === user.id || !user.active} onClick={() => void resetPassword(user)}>Send reset link</button><button className="button button-quiet button-small" disabled={busyId === user.id || user.role === "ADMIN" || user.signupPending} onClick={() => void toggleUser(user)}>{user.active ? "Deactivate" : "Reactivate"}</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No accounts yet" description="Your Admin account is the first account in this company." icon={UserRound} />}
      </Panel>
    </div>
  </>;
}
