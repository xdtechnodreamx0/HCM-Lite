"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Bot, Check, CircleHelp, LoaderCircle, MessageCircle, Sparkles, WandSparkles } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { DashboardPayload, LeaveBalanceRecord, OrganizationPayload, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { FormError, PageHeading, Panel, PrimaryButton } from "@/features/app/components/ui";

type AiReply = { available: boolean; answer?: string; toolName?: string; prefill?: { leaveTypeCode: string; startDate: string; endDate: string; reason: string }; message?: string };
type ChatLine = { role: "user" | "assistant"; content: string; toolName?: string };

export function AssistantView({ role, dashboard, organization, company, currentPage }: {
  role: NonNullable<SessionPayload["user"]>["role"];
  dashboard: DashboardPayload | null;
  organization: OrganizationPayload | null;
  company: SessionPayload["company"];
  currentPage: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [smartText, setSmartText] = useState("");
  const [smartPrefill, setSmartPrefill] = useState<AiReply["prefill"]>(undefined);
  const [smartLoading, setSmartLoading] = useState(false);
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([]);
  const [leaveSaved, setLeaveSaved] = useState(false);

  useEffect(() => {
    void apiRequest<{ available: boolean }>("/api/ai/status").then((result) => setAvailable(result.available)).catch(() => setAvailable(false));
    if (role === "EMPLOYEE") void apiRequest<{ balances: LeaveBalanceRecord[] }>("/api/leave-balances").then((result) => setBalances(result.balances)).catch(() => setBalances([]));
  }, [role]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!message.trim()) return;
    const question = message.trim(); setMessage(""); setError(""); setBusy(true); setLines((current) => [...current, { role: "user", content: question }]);
    try {
      const result = await apiRequest<AiReply>("/api/ai/chat", { method: "POST", body: jsonBody({ mode: "assistant", message: question, contextPage: currentPage }) });
      setAvailable(result.available);
      setLines((current) => [...current, { role: "assistant", content: result.answer ?? result.message ?? "The assistant could not answer that request.", toolName: result.toolName }]);
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function summarize() {
    if (!dashboard) return;
    setBusy(true); setError(""); setSummary("");
    try {
      const result = await apiRequest<AiReply>("/api/ai/chat", { method: "POST", body: jsonBody({ mode: "summary", message: "Summarize the current dashboard." , metrics: dashboard }) });
      setAvailable(result.available); setSummary(result.answer ?? result.message ?? "No summary is available.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  async function parseSmartLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSmartLoading(true); setError(""); setSmartPrefill(undefined); setLeaveSaved(false);
    try {
      const result = await apiRequest<AiReply>("/api/ai/chat", { method: "POST", body: jsonBody({ mode: "smart-leave", message: smartText }) });
      setAvailable(result.available);
      if (result.prefill) setSmartPrefill(result.prefill);
      else setError(result.message ?? "The request could not be turned into a leave draft. Try a date range and a reason.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSmartLoading(false); }
  }

  async function submitPrefill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!smartPrefill) return;
    setSmartLoading(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/leaves", { method: "POST", body: jsonBody({ leaveTypeCode: String(values.get("leaveTypeCode")), startDate: String(values.get("startDate")), endDate: String(values.get("endDate")), reason: String(values.get("reason")) }) });
      setLeaveSaved(true); setSmartPrefill(undefined); setSmartText("");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSmartLoading(false); }
  }

  return <>
    <PageHeading eyebrow="PEOPLE. WORKS AI" title="AI assistant" description={`Page-aware help for ${currentPage.replaceAll("-", " ")}. Answers use only HCM data permitted for your account; this app does not capture your computer screen.`} action={<span className={`ai-status-chip ${available ? "ai-ready" : "ai-muted"}`}><span />{available === null ? "Checking setup" : available ? "AI connected" : "AI not configured"}</span>} />
    {available === false && <div className="ai-unavailable"><span className="ai-unavailable-icon"><CircleHelp size={18} /></span><div><strong>Connect a Gemini API key to enable answers.</strong><p>Set <code>GEMINI_API_KEY</code> in the server environment, then restart the app. Without a key this panel will not invent answers.</p></div></div>}
    <div className="module-grid ai-grid">
      <Panel title="Ask your assistant" subtitle="Try a question about the HCM data you’re allowed to see." className="assistant-chat-panel span-two">
        {lines.length ? <div className="chat-history" aria-live="polite">{lines.map((line, index) => <article className={`chat-line chat-${line.role}`} key={`${line.role}-${index}`}><span className="chat-avatar">{line.role === "assistant" ? <Bot size={15} /> : "You"}</span><div className="chat-message"><p>{line.content}</p>{line.role === "assistant" && <small>{line.toolName ? `AI-generated · ${line.toolName}` : "AI-generated · company policy"}</small>}</div></article>)}</div> : <div className="chat-welcome"><span className="chat-welcome-icon"><Sparkles size={20} /></span><strong>What would you like to know?</strong><p>Examples: “Who is on leave today?” or “What is the grace period?”</p></div>}
        <FormError>{error}</FormError>
        <form className="chat-composer" onSubmit={submitQuestion}><label className="sr-only" htmlFor="assistant-question">Your question</label><input id="assistant-question" value={message} onChange={(event) => setMessage(event.target.value)} disabled={!available || busy} placeholder={available ? "Ask something about your workspace…" : "Connect Gemini to start asking questions"} /><button className="chat-send" aria-label="Send question" disabled={!available || busy || !message.trim()}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}</button></form>
        <div className="ai-footnote"><ShieldCheckIcon />Private tools follow your role permissions. The assistant cannot approve leave or change records.</div>
      </Panel>
      {role !== "EMPLOYEE" && <Panel title="Dashboard summary" subtitle="A short summary of the current dashboard values." className="summary-panel"><div className="summary-placeholder"><span className="summary-icon"><WandSparkles size={17} /></span><p>{summary || "Ask AI to summarize your current filtered KPIs in three to five clear points."}</p></div><button className="button button-secondary button-small" disabled={!available || busy || !dashboard} onClick={() => void summarize()}>{busy ? "Working…" : "Summarize current dashboard"}<ArrowRight size={14} /></button></Panel>}
      {role === "EMPLOYEE" && <Panel title="Smart leave" subtitle="Describe your time away, review the details and confirm through the normal leave form." className="smart-leave-panel"><form className="form-stack" onSubmit={parseSmartLeave}><label className="field-label">Describe your request<textarea required minLength={8} maxLength={600} rows={3} value={smartText} onChange={(event) => setSmartText(event.target.value)} placeholder="For example: I need next Monday and Tuesday off for a wedding." /></label><PrimaryButton disabled={!available || smartLoading}>{smartLoading ? "Preparing…" : "Prepare a leave draft"}<WandSparkles size={15} /></PrimaryButton></form>
        {smartPrefill && <form className="smart-leave-review" onSubmit={submitPrefill}><div className="review-banner"><Check size={15} /><span>Check these details. Nothing is submitted until you confirm below.</span></div><label className="field-label">Leave type<select name="leaveTypeCode" required defaultValue={smartPrefill.leaveTypeCode}>{balances.map((item) => <option value={item.code} key={item.id}>{item.name}</option>)}</select></label><div className="form-grid"><label className="field-label">Start date<input type="date" name="startDate" required defaultValue={smartPrefill.startDate} /></label><label className="field-label">End date<input type="date" name="endDate" required defaultValue={smartPrefill.endDate} /></label></div><label className="field-label">Reason<textarea name="reason" required minLength={5} maxLength={700} rows={3} defaultValue={smartPrefill.reason} /></label><PrimaryButton disabled={smartLoading}>Confirm and submit leave<ArrowRight size={15} /></PrimaryButton></form>}
        {leaveSaved && <div className="inline-alert success-alert">Your leave request was submitted for HR review.</div>}
      </Panel>}
      <Panel title="Company policy" subtitle="A few everyday rules the assistant can explain." className="policy-qa-panel">
        <div className="qa-item"><span>01</span><div><strong>Attendance</strong><p>Late after {organization?.calendar.officeStart ?? company?.officeStart ?? "09:00"} plus {organization?.calendar.graceMinutes ?? company?.graceMinutes ?? 15} minutes. Under 5 hours is a half day.</p></div></div>
        <div className="qa-item"><span>02</span><div><strong>Leave</strong><p>Weekends and public holidays are not counted as leave workdays.</p></div></div>
        <div className="qa-item"><span>03</span><div><strong>Payroll</strong><p>Basic, HRA and medical allowances are calculated using the hackathon brief’s illustrative formula.</p></div></div>
        <div className="policy-qa-caption"><MessageCircle size={14} /> Ask the assistant for a role-scoped answer when AI is configured.</div>
      </Panel>
    </div>
  </>;
}

function ShieldCheckIcon() { return <span className="shield-check-mini">✓</span>; }
