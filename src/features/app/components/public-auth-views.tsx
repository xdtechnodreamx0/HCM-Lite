"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MailCheck, ShieldCheck, UserRoundPlus } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { apiMessage } from "@/lib/errors";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      await apiRequest("/api/auth/signup", { method: "POST", body: jsonBody({ name, email, password }) });
      setName(""); setEmail(""); setPassword("");
      setNotice("If the request can be created, check your inbox for an email verification link. An Admin or HR teammate must link your employee profile before you can sign in.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  return <main className="password-gate public-auth-page"><section className="password-card public-auth-card">
    <Link className="auth-back-link" href="/"><ArrowLeft size={14} /> Back to sign in</Link>
    <span className="icon-well"><UserRoundPlus size={22} /></span><span className="eyebrow">JOIN YOUR TEAM</span>
    <h1>Request employee access.</h1>
    <p className="muted">Create your login request with your work email. Your Admin or HR team will match it to an employee profile before access is enabled.</p>
    <form className="form-stack" onSubmit={submit}>
      <label className="field-label">Full name<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></label>
      <label className="field-label">Work email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
      <label className="field-label">Create a password<input required type="password" minLength={10} maxLength={100} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /><span className="field-hint">Use a password you do not use anywhere else.</span></label>
      {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
      {notice && <div className="inline-alert success-alert" role="status"><MailCheck size={16} />{notice}</div>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Sending request…" : "Request access"}<ArrowRight size={15} /></button>
    </form>
    <p className="auth-security-note"><ShieldCheck size={14} /> New sign-ups cannot choose their own access role or view company data until approved.</p>
  </section></main>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const result = await apiRequest<{ emailConfigured: boolean }>("/api/auth/password-reset/request", { method: "POST", body: jsonBody({ email }) });
      setNotice(result.emailConfigured
        ? "If an eligible account matches that email, a single-use reset link will arrive shortly. Check your spam folder too."
        : "Password reset email is not configured yet. Ask your Admin to configure Resend in .env.local, or contact your Admin to reset access.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  return <main className="password-gate public-auth-page"><section className="password-card public-auth-card">
    <Link className="auth-back-link" href="/"><ArrowLeft size={14} /> Back to sign in</Link>
    <span className="icon-well"><MailCheck size={22} /></span><span className="eyebrow">ACCOUNT RECOVERY</span>
    <h1>Reset your password.</h1><p className="muted">Enter the email on your account. We’ll send a secure link if email delivery is configured and the account is eligible.</p>
    <form className="form-stack" onSubmit={submit}>
      <label className="field-label">Work email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
      {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
      {notice && <div className="inline-alert success-alert" role="status">{notice}</div>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Checking…" : "Send reset link"}<ArrowRight size={15} /></button>
    </form>
    <p className="auth-security-note"><ShieldCheck size={14} /> Reset links are single-use and expire after 30 minutes.</p>
  </section></main>;
}

export function ResetPasswordPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!token) { setError("This reset link is missing its token. Request a new one."); return; }
    if (password !== confirmed) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      await apiRequest("/api/auth/password-reset/complete", { method: "POST", body: jsonBody({ token, password }) });
      setDone(true); setPassword(""); setConfirmed("");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setBusy(false); }
  }

  return <main className="password-gate public-auth-page"><section className="password-card public-auth-card">
    <Link className="auth-back-link" href="/"><ArrowLeft size={14} /> Back to sign in</Link>
    <span className="icon-well"><ShieldCheck size={22} /></span><span className="eyebrow">SECURE ACCOUNT RECOVERY</span>
    <h1>Choose a new password.</h1><p className="muted">Use at least 10 characters. This change signs out other active sessions.</p>
    {done ? <div className="inline-alert success-alert" role="status">Password updated. You can now <Link href="/">sign in</Link> with your new password.</div> : <form className="form-stack" onSubmit={submit}>
      <label className="field-label">New password<input required type="password" minLength={10} maxLength={100} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="field-label">Confirm password<input required type="password" minLength={10} maxLength={100} autoComplete="new-password" value={confirmed} onChange={(event) => setConfirmed(event.target.value)} /></label>
      {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Updating…" : "Update password"}<ArrowRight size={15} /></button>
    </form>}
    <p className="auth-security-note"><ShieldCheck size={14} /> The emailed link can only be used once and expires in 30 minutes.</p>
  </section></main>;
}
