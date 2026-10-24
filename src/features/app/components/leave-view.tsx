"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarCheck2, CalendarDays, Check, CircleAlert, ShieldCheck, X } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { LeaveBalanceRecord, LeaveRecord, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, ProgressBar, SecondaryButton, StatusPill, formatDate } from "@/features/app/components/ui";

type BalanceResponse = { year: number; balances: LeaveBalanceRecord[] };

export function LeaveView({ leaves, role, refresh, notify, goToAssistant }: {
  leaves: LeaveRecord[];
  role: NonNullable<SessionPayload["user"]>["role"];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goToAssistant: () => void;
}) {
  const isEmployee = role === "EMPLOYEE";
  const [balances, setBalances] = useState<BalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!isEmployee) return;
    void apiRequest<BalanceResponse>("/api/leave-balances").then(setBalances).catch((reason: unknown) => setBalanceError(apiMessage(reason)));
  }, [isEmployee]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    const values = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/leaves", { method: "POST", body: jsonBody({ leaveTypeCode: String(values.get("leaveTypeCode")), startDate: String(values.get("startDate")), endDate: String(values.get("endDate")), reason: String(values.get("reason")) }) });
      event.currentTarget.reset(); await refresh();
      const next = await apiRequest<BalanceResponse>("/api/leave-balances"); setBalances(next);
      notify("Your leave request was sent to HR.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSubmitting(false); }
  }

  async function decision(item: LeaveRecord, choice: "approved" | "rejected", comment: string) {
    setBusyId(item.id); setError("");
    try {
      await apiRequest(`/api/leaves/${item.id}`, { method: "PATCH", body: jsonBody({ action: "decide", decision: choice, comment }) });
      await refresh(); notify(`Leave request ${choice}.`);
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }

  async function cancel(item: LeaveRecord) {
    setBusyId(item.id); setError("");
    try { await apiRequest(`/api/leaves/${item.id}`, { method: "PATCH", body: jsonBody({ action: "cancel" }) }); await refresh(); notify("Leave request cancelled."); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }

  const visibleLeaves = status === "all" ? leaves : leaves.filter((item) => item.status === status);
  return <>
    <PageHeading eyebrow="TIME AWAY" title={isEmployee ? "Leave & time off" : "Leave requests"} description={isEmployee ? "Plan ahead, understand your balance and keep your team in the loop." : "Review requests with their dates, context and policy balance in view."} action={isEmployee && <button className="button button-secondary" onClick={goToAssistant}><CircleAlert size={15} /> Help me plan leave</button>} />
    {isEmployee && <div className="balance-grid">{balances?.balances.map((item) => <article className="balance-card" key={item.id}><div className="balance-card-top"><span className="balance-type-icon"><CalendarCheck2 size={16} /></span><small>{balances.year} allowance</small></div><h3>{item.name}</h3><strong>{item.unlimited ? "Unlimited" : `${item.remaining ?? 0}`}<small>{item.unlimited ? "" : ` of ${item.quota} days left`}</small></strong>{!item.unlimited && <ProgressBar label={`${item.name} used`} value={item.approvedDays} maximum={item.quota} />}</article>)}{balances?.balances.length === 0 && <Panel><EmptyState title="No leave policies yet" description="Ask your HR team to add leave types for this company." icon={CalendarDays} /></Panel>}</div>}
    {balanceError && <FormError>{balanceError}</FormError>}
    {isEmployee && <Panel title="Request time off" subtitle="Weekends and public holidays are automatically left out of your day count." className="leave-form-panel">
      {balances?.balances.length ? <form className="form-grid" onSubmit={submitRequest}><label className="field-label">Leave type<select name="leaveTypeCode" required defaultValue=""><option value="" disabled>Choose a leave type</option>{balances.balances.map((item) => <option value={item.code} key={item.id}>{item.name}{item.unlimited ? " · no limit" : ` · ${item.remaining} remaining`}</option>)}</select></label><label className="field-label">Start date<input type="date" name="startDate" required /></label><label className="field-label">End date<input type="date" name="endDate" required /></label><label className="field-label span-two">Reason<textarea required name="reason" minLength={5} maxLength={700} rows={3} placeholder="Share a little context with your HR team." /></label><div className="form-actions span-two"><FormError>{error}</FormError><PrimaryButton disabled={submitting}>{submitting ? "Sending…" : "Submit leave request"}<ArrowRight size={15} /></PrimaryButton></div></form> : <EmptyState title="Leave types are not ready" description="Once your company adds leave policies, you can submit a request here." icon={CalendarDays} />}
    </Panel>}
    <Panel title={isEmployee ? "Your requests" : "Leave inbox"} subtitle={isEmployee ? "Your leave history and decisions." : role === "HR" ? "As HR, approve or decline each request with a note." : "Company leave history. Approvals are handled by HR."} className="leave-inbox-panel" action={<label className="filter-label">Filter <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="cancelled">Cancelled</option></select></label>}>
      <FormError>{error}</FormError>
      {visibleLeaves.length ? <div className="leave-request-list">{visibleLeaves.map((item) => <article className="leave-request-card" key={item.id}><span className={`leave-request-icon leave-${item.status}`}><CalendarDays size={17} /></span><div className="leave-request-main"><div className="leave-request-title"><strong>{item.employeeName || (isEmployee ? "Your request" : item.employeeCode)}</strong><StatusPill value={item.status} /></div><p>{item.leaveTypeName} <span>·</span> {formatDate(item.startDate)} – {formatDate(item.endDate)} <span>·</span> {item.days} {item.days === 1 ? "day" : "days"}</p><small>{item.reason}</small>{item.decisionComment && <div className="decision-note"><ShieldCheck size={13} /> {item.decisionComment}</div>}</div>
          {role === "HR" && item.status === "pending" ? <form className="leave-decision-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); void decision(item, "approved", String(values.get("comment"))); }}><input name="comment" required minLength={2} maxLength={500} placeholder="Add a decision note" aria-label="Decision note" /><button className="button button-quiet button-small" type="button" disabled={busyId === item.id} onClick={(event) => { const form = event.currentTarget.form; const comment = new FormData(form ?? undefined).get("comment"); if (typeof comment === "string" && comment.trim().length >= 2) void decision(item, "rejected", comment); else setError("Add a short decision note before declining."); }}><X size={14} /> Decline</button><PrimaryButton className="button-small" disabled={busyId === item.id}><Check size={14} /> Approve</PrimaryButton></form> : isEmployee && ["pending", "approved"].includes(item.status) ? <SecondaryButton className="button-small" disabled={busyId === item.id} onClick={() => void cancel(item)}>Cancel request</SecondaryButton> : null}
        </article>)}</div> : <EmptyState title={status === "all" ? "No leave requests yet" : `No ${status} requests`} description={isEmployee ? "Your submitted requests and their status will appear here." : "New employee requests will appear here when submitted."} icon={CalendarDays} />}
    </Panel>
  </>;
}

