"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarCheck2, CalendarDays, Check, CircleAlert, ShieldCheck, X } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { LeaveBalanceRecord, LeaveRecord, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, ProgressBar, SecondaryButton, StatusPill, formatDate } from "@/features/app/components/ui";

type BalanceResponse = { year: number; balances: LeaveBalanceRecord[] };

export function LeaveView({ leaves, role, employeeId, refresh, notify, goToAssistant }: {
  leaves: LeaveRecord[];
  role: NonNullable<SessionPayload["user"]>["role"];
  employeeId?: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goToAssistant: () => void;
}) {
  const isEmployee = role === "EMPLOYEE";
  const canSelfService = isEmployee || (role === "HR" && Boolean(employeeId));
  const [balances, setBalances] = useState<BalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!canSelfService) return;
    let active = true;
    void apiRequest<BalanceResponse>("/api/leave-balances")
      .then((result) => { if (active) setBalances(result); })
      .catch((reason: unknown) => { if (active) setBalanceError(apiMessage(reason)); });
    return () => { active = false; };
  }, [canSelfService]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await apiRequest("/api/leaves", { method: "POST", body: jsonBody({ leaveTypeCode: String(values.get("leaveTypeCode")), startDate: String(values.get("startDate")), endDate: String(values.get("endDate")), reason: String(values.get("reason")) }) });
      form.reset(); await refresh();
      const next = await apiRequest<BalanceResponse>("/api/leave-balances"); setBalances(next);
      notify(role === "HR" ? "Your leave request was sent for Admin review." : "Your leave request was sent to HR.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSubmitting(false); }
  }

  async function loadBalances() {
    try { setBalances(await apiRequest<BalanceResponse>("/api/leave-balances")); }
    catch (reason) { setBalanceError(apiMessage(reason)); }
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
    try { await apiRequest(`/api/leaves/${item.id}`, { method: "PATCH", body: jsonBody({ action: "cancel" }) }); await refresh(); await loadBalances(); notify("Leave request cancelled."); }
    catch (reason) { setError(apiMessage(reason)); }
    finally { setBusyId(""); }
  }

  const ownLeaves = canSelfService ? leaves.filter((item) => item.employeeId === employeeId) : [];
  const teamLeaves = canSelfService ? leaves.filter((item) => item.employeeId !== employeeId) : leaves;
  const visibleOwn = status === "all" ? ownLeaves : ownLeaves.filter((item) => item.status === status);
  const visibleTeam = status === "all" ? teamLeaves : teamLeaves.filter((item) => item.status === status);
  const visibleAll = status === "all" ? leaves : leaves.filter((item) => item.status === status);
  const filter = <label className="filter-label">Filter <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="cancelled">Cancelled</option></select></label>;

  function requestCard(item: LeaveRecord) {
    const canDecide = Boolean(item.canDecide);
    const isOwn = canSelfService && item.employeeId === employeeId;
    return <article className="leave-request-card" key={item.id}>
      <span className={`leave-request-icon leave-${item.status}`}><CalendarDays size={17} /></span>
      <div className="leave-request-main">
        <div className="leave-request-title"><strong>{isOwn ? "Your request" : item.employeeName || item.employeeCode}</strong><StatusPill value={item.status} /></div>
        <p>{item.leaveTypeName} <span>·</span> {item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`} <span>·</span> {item.days} {item.days === 1 ? "day" : "days"}</p>
        <small>{item.reason}</small>
        {item.decisionComment && <div className="decision-note"><ShieldCheck size={13} /> {item.decisionComment}</div>}
        {isOwn && role === "HR" && item.status === "pending" && <div className="decision-note"><ShieldCheck size={13} /> Your own request is waiting for an Admin to review it.</div>}
      </div>
      {canDecide && item.status === "pending" ? <form className="leave-decision-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); void decision(item, "approved", String(values.get("comment"))); }}>
        <input name="comment" required minLength={2} maxLength={500} placeholder="Add a decision note" aria-label="Decision note" />
        <button className="button button-quiet button-small" type="button" disabled={busyId === item.id} onClick={(event) => { const form = event.currentTarget.form; const comment = new FormData(form ?? undefined).get("comment"); if (typeof comment === "string" && comment.trim().length >= 2) void decision(item, "rejected", comment); else setError("Add a short decision note before declining."); }}><X size={14} /> Decline</button>
        <PrimaryButton className="button-small" disabled={busyId === item.id}><Check size={14} /> Approve</PrimaryButton>
      </form> : isOwn && ["pending", "approved"].includes(item.status) ? <SecondaryButton className="button-small" disabled={busyId === item.id} onClick={() => void cancel(item)}>Cancel request</SecondaryButton> : null}
    </article>;
  }

  return <>
    <PageHeading
      eyebrow="TIME AWAY"
      title={isEmployee ? "Leave & time off" : role === "HR" ? "Leave & requests" : "Leave history"}
      description={isEmployee ? "Plan ahead, understand your balance and keep your team in the loop." : role === "HR" ? "Request your own time off and review the team’s leave with the policy balance in view." : "Company leave history. HR handles employee decisions, with Admin cover for an HR teammate’s own request."}
      action={canSelfService ? <button className="button button-secondary" onClick={goToAssistant}><CircleAlert size={15} /> Help me plan leave</button> : undefined}
    />
    {role === "HR" && !canSelfService && <Panel className="self-service-note"><EmptyState title="Your own leave is not linked yet" description="Ask an Admin to link your login to a staff profile in User access. You can still review the team’s requests below." icon={CalendarDays} /></Panel>}
    {canSelfService && <div className="balance-grid">
      {balances?.balances.map((item) => <article className="balance-card" key={item.id}><div className="balance-card-top"><span className="balance-type-icon"><CalendarCheck2 size={16} /></span><small>{balances.year} allowance</small></div><h3>{item.name}</h3><strong>{item.unlimited ? "Unlimited" : `${item.remaining ?? 0}`}<small>{item.unlimited ? "" : ` of ${item.quota} days left`}</small></strong>{!item.unlimited && <ProgressBar label={`${item.name} used`} value={item.approvedDays} maximum={item.quota} />}</article>)}
      {balances?.balances.length === 0 && <Panel><EmptyState title="No leave policies yet" description="Ask your HR team to add leave types for this company." icon={CalendarDays} /></Panel>}
      {!balances && !balanceError && <div className="balance-card balance-loading"><div className="balance-card-top"><span className="balance-type-icon"><CalendarCheck2 size={16} /></span><small>Loading</small></div><h3>Your allowance</h3><strong>—</strong><div className="loading-line">Reading leave balances…</div></div>}
    </div>}
    {balanceError && <FormError>{balanceError}</FormError>}
    {canSelfService && <Panel title={isEmployee ? "Request time off" : "Request my time off"} subtitle="Weekends and public holidays are automatically left out of your day count." className="leave-form-panel">
      {balances?.balances.length ? <form className="form-grid" onSubmit={submitRequest}><label className="field-label">Leave type<select name="leaveTypeCode" required defaultValue=""><option value="" disabled>Choose a leave type</option>{balances.balances.map((item) => <option value={item.code} key={item.id}>{item.name}{item.unlimited ? " · no limit" : ` · ${item.remaining} remaining`}</option>)}</select></label><label className="field-label">Start date<input type="date" name="startDate" required /></label><label className="field-label">End date<input type="date" name="endDate" required /></label><label className="field-label span-two">Reason<textarea required name="reason" minLength={5} maxLength={700} rows={3} placeholder="Share a little context with your reviewer." /></label><div className="form-actions span-two"><FormError>{error}</FormError><PrimaryButton disabled={submitting}>{submitting ? "Sending…" : "Submit leave request"}<ArrowRight size={15} /></PrimaryButton></div></form> : <EmptyState title="Leave types are not ready" description="Once your company adds leave policies, you can submit a request here." icon={CalendarDays} />}
    </Panel>}
    {canSelfService && !isEmployee && <Panel title="My leave requests" subtitle="Your own leave history. An Admin reviews an HR teammate’s request." className="leave-inbox-panel" action={filter}>
      <FormError>{error}</FormError>
      {visibleOwn.length ? <div className="leave-request-list">{visibleOwn.map(requestCard)}</div> : <EmptyState title={status === "all" ? "No leave requests yet" : `No ${status} requests`} description="Your submitted requests and their status will appear here." icon={CalendarDays} />}
    </Panel>}
    {isEmployee ? <Panel title="Your requests" subtitle="Your leave history and decisions." className="leave-inbox-panel" action={filter}>
      <FormError>{error}</FormError>
      {visibleAll.length ? <div className="leave-request-list">{visibleAll.map(requestCard)}</div> : <EmptyState title={status === "all" ? "No leave requests yet" : `No ${status} requests`} description="Your submitted requests and their status will appear here." icon={CalendarDays} />}
    </Panel> : role === "HR" ? <Panel title="Team leave inbox" subtitle="Review requests from your teammates with a short decision note." className="leave-inbox-panel">
      <FormError>{error}</FormError>
      {visibleTeam.length ? <div className="leave-request-list">{visibleTeam.map(requestCard)}</div> : <EmptyState title={status === "all" ? "No team requests yet" : `No ${status} team requests`} description="New employee requests will appear here when submitted." icon={CalendarDays} />}
    </Panel> : <Panel title="Company leave history" subtitle="A read-only view of every request. HR decides employee requests; Admin can decide an HR teammate’s own request." className="leave-inbox-panel" action={filter}>
      <FormError>{error}</FormError>
      {visibleAll.length ? <div className="leave-request-list">{visibleAll.map(requestCard)}</div> : <EmptyState title={status === "all" ? "No leave requests yet" : `No ${status} requests`} description="New employee requests will appear here when submitted." icon={CalendarDays} />}
    </Panel>}
  </>;
}
