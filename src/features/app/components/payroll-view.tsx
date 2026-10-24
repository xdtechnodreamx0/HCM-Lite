"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BadgeCheck, Calculator, CircleAlert, LockKeyhole, ReceiptText, WalletCards } from "lucide-react";
import { apiRequest, downloadApiFile, jsonBody } from "@/lib/api-client";
import type { PayrollEntryRecord, PayrollRunRecord, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, StatusPill, formatMoney } from "@/features/app/components/ui";

export function PayrollView({ payroll, role, employeeId, refresh, notify }: {
  payroll: PayrollRunRecord[];
  role: NonNullable<SessionPayload["user"]>["role"];
  employeeId?: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const isEmployee = role === "EMPLOYEE";
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRun, setSelectedRun] = useState<PayrollRunRecord | null>(null);
  const [loadingRun, setLoadingRun] = useState(!isEmployee);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (isEmployee) return;
    let active = true;
    void apiRequest<PayrollRunRecord>(`/api/payroll?period=${encodeURIComponent(period)}`).then((run) => { if (active) setSelectedRun(run); })
      .catch((reason: unknown) => { if (active) { setSelectedRun(null); if (!(reason instanceof Error && "status" in reason && reason.status === 404)) setError(apiMessage(reason)); } })
      .finally(() => { if (active) setLoadingRun(false); });
    return () => { active = false; };
  }, [period, isEmployee, payroll]);

  async function createDraft() {
    setBusy(true); setError("");
    try {
      const run = await apiRequest<PayrollRunRecord>("/api/payroll", { method: "POST", body: jsonBody({ period }) });
      setSelectedRun(run); await refresh(); notify(`Payroll draft prepared for ${period}.`);
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function finalize() {
    if (!window.confirm(`Finalize ${period} payroll? Finalized payroll is locked and payslips become available.`)) return;
    setBusy(true); setError("");
    try {
      await apiRequest("/api/payroll/finalize", { method: "POST", body: jsonBody({ period }) });
      await refresh();
      const run = await apiRequest<PayrollRunRecord>(`/api/payroll?period=${encodeURIComponent(period)}`);
      setSelectedRun(run); notify(`Payroll for ${period} has been finalized and locked.`);
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function download(periodToDownload: string, targetEmployeeId?: string) {
    setDownloadError("");
    const query = targetEmployeeId ? `?employeeId=${encodeURIComponent(targetEmployeeId)}` : "";
    try { await downloadApiFile(`/api/payroll/${encodeURIComponent(periodToDownload)}/payslip${query}`); notify("Payslip downloaded."); }
    catch (reason) { setDownloadError(apiMessage(reason)); }
  }

  const employeeRuns = useMemo(() => payroll.filter((item) => item.status === "finalized"), [payroll]);
  return <>
    <PageHeading eyebrow="PAYROLL LITE" title={isEmployee ? "My payslips" : "Payroll"} description={isEmployee ? "Your finalized pay statements, ready whenever you need them." : "Review the month’s attendance and salary math before the Admin locks it."} action={!isEmployee && <label className="date-filter"><span className="sr-only">Payroll month</span><input type="month" value={period} onChange={(event) => { setLoadingRun(true); setError(""); setPeriod(event.target.value); }} /></label>} />
    {isEmployee ? <>
      {downloadError && <FormError>{downloadError}</FormError>}
      <div className="payslip-grid">{employeeRuns.length ? employeeRuns.map((run) => {
        const entry = run.entries?.find((item) => item.employeeId === employeeId);
        if (!entry) return null;
        return <article className="payslip-card" key={run.id}><div className="payslip-card-top"><span className="payslip-icon"><ReceiptText size={19} /></span><StatusPill value="Finalized" /></div><span className="eyebrow">PAY PERIOD</span><h2>{run.period}</h2><div className="payslip-amount"><small>Net pay</small><strong>{formatMoney(entry.netPaisa)}</strong></div><div className="payslip-card-rule" /><div className="payslip-breakdown"><span>Gross payable <b>{formatMoney(entry.grossPayablePaisa)}</b></span><span>Illustrative tax <b>{formatMoney(entry.taxPaisa)}</b></span></div><button className="button button-primary button-wide" onClick={() => void download(run.period, employeeId)}><ArrowDownToLine size={15} /> Download payslip PDF</button></article>;
      }) : <Panel className="span-two"><EmptyState title="Your first payslip will appear here" description="Payslips become available once Admin finalizes a payroll run for you." icon={WalletCards} /></Panel>}</div>
    </> : <>
      <div className="payroll-action-banner"><span className="banner-icon"><Calculator size={19} /></span><div><strong>{role === "HR" ? "Prepare a monthly payroll draft" : "Review a payroll draft"}</strong><p>Uses saved salaries, configured working days, recorded absences, half days and approved unpaid leave.</p></div>{role === "HR" ? <PrimaryButton disabled={busy} onClick={() => void createDraft()}><Calculator size={15} />{busy ? "Calculating…" : "Create draft"}</PrimaryButton> : <span className="role-view-chip"><LockKeyhole size={14} />Admin finalizes</span>}</div>
      <FormError>{error}</FormError>
      <Panel title={`Payroll for ${period || "this month"}`} subtitle={loadingRun ? "Loading payroll details…" : selectedRun?.status === "finalized" ? "This snapshot is finalized and cannot be changed." : selectedRun ? "Review the draft; Admin can finalize when it is ready." : "Create a draft to calculate this month from current records."} className="payroll-run-panel" action={selectedRun && <StatusPill value={selectedRun.status} />}>
        {selectedRun ? <>
          <div className="payroll-summary-grid"><div><small>Employees</small><strong>{selectedRun.employeeCount}</strong></div><div><small>Gross payable</small><strong>{formatMoney(selectedRun.totals?.grossPayablePaisa)}</strong></div><div><small>Illustrative tax</small><strong>{formatMoney(selectedRun.totals?.taxPaisa)}</strong></div><div><small>Net pay</small><strong>{formatMoney(selectedRun.totals?.netPaisa)}</strong></div></div>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>BASIC</th><th>ABSENT</th><th>UNPAID</th><th>HALF DAY</th><th>GROSS PAYABLE</th><th>NET PAY</th></tr></thead><tbody>{selectedRun.entries?.length ? selectedRun.entries.map((entry) => <PayrollRow key={entry.employeeId} entry={entry} />) : <tr><td colSpan={8}><EmptyState title="No payroll rows" description="No eligible employees with salary records were found for this period." icon={WalletCards} /></td></tr>}</tbody></table></div>
          <div className="payroll-footnote"><CircleAlert size={15} /><span>The tax figures use the illustrative hackathon slabs and are not current tax advice. Finalized figures keep this formula snapshot.</span></div>
          <div className="payroll-finalize-row">{selectedRun.status === "draft" && role === "ADMIN" ? <PrimaryButton disabled={busy} onClick={() => void finalize()}><BadgeCheck size={15} /> Finalize and lock payroll</PrimaryButton> : selectedRun.status === "draft" ? <span className="muted small-text">Only Admin can finalize this payroll.</span> : <span className="finalized-lock"><LockKeyhole size={15} /> Locked on {selectedRun.finalizedAt ? new Date(selectedRun.finalizedAt).toLocaleDateString("en-PK") : "—"}</span>}</div>
        </> : <EmptyState title={loadingRun ? "Loading payroll" : "No payroll draft yet"} description={role === "HR" ? "Choose a month and create a draft. It will use the latest saved employee and attendance records." : "An HR teammate can prepare a draft for your review."} icon={WalletCards} />}
      </Panel>
      <Panel title="Payroll history" subtitle="Monthly payroll snapshots for this company.">
        {payroll.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>PERIOD</th><th>EMPLOYEES</th><th>GROSS PAYABLE</th><th>NET PAY</th><th>STATUS</th><th /></tr></thead><tbody>{payroll.map((run) => <tr key={run.id}><td><strong>{run.period}</strong></td><td>{run.employeeCount}</td><td>{formatMoney(run.totals?.grossPayablePaisa)}</td><td>{formatMoney(run.totals?.netPaisa)}</td><td><StatusPill value={run.status} /></td><td><button className="button button-quiet button-small" onClick={() => setPeriod(run.period)}>Review</button></td></tr>)}</tbody></table></div> : <EmptyState title="No payroll history" description="Drafts and finalized months will be listed here." icon={ReceiptText} />}
      </Panel>
    </>}
  </>;
}

function PayrollRow({ entry }: { entry: PayrollEntryRecord }) {
  return <tr><td><div className="person-cell"><span className="person-monogram">{entry.employeeName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{entry.employeeName}</strong><small>{entry.employeeCode}</small></span></div></td><td>{entry.departmentName || "—"}</td><td>{formatMoney(entry.basicPaisa)}</td><td>{entry.deductions.absentDays}</td><td>{entry.deductions.unpaidLeaveDays}</td><td>{entry.deductions.halfDays}</td><td>{formatMoney(entry.grossPayablePaisa)}</td><td><strong>{formatMoney(entry.netPaisa)}</strong></td></tr>;
}
