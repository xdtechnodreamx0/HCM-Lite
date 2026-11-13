"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, UserRoundCheck, UsersRound } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { errorStatus, apiMessage } from "@/lib/errors";
import type { SessionPayload } from "@/lib/domain-types";
import { ThemePicker } from "@/features/app/components/theme-provider";
import { SiteFooter } from "@/features/app/components/site-footer";

type DemoAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  department: string;
  portal: string;
};

export function AuthGate({ initialized, demoMode = false, emailConfigured = false, onReady, onRefreshSession }: {
  initialized: boolean;
  demoMode?: boolean;
  emailConfigured?: boolean;
  onReady: () => void;
  onRefreshSession?: () => Promise<unknown>;
}) {
  const mode = initialized ? "login" : "setup";
  const [setupComplete, setSetupComplete] = useState(false);
  const activeMode = initialized || setupComplete ? "login" : mode;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ companyName: "", adminName: "", adminEmail: "", adminPassword: "", email: "", password: "" });
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoBusy, setDemoBusy] = useState("");
  const [demoError, setDemoError] = useState("");

  useEffect(() => {
    if (!demoMode || activeMode !== "login") return;
    let active = true;
    void apiRequest<{ enabled: boolean; accounts: DemoAccount[] }>("/api/demo/accounts")
      .then((result) => { if (active && result.enabled) setDemoAccounts(result.accounts); })
      .catch(() => { if (active) setDemoAccounts([]); });
    return () => { active = false; };
  }, [demoMode, activeMode]);

  useEffect(() => {
    if (activeMode !== "login") return;
    const url = new URL(window.location.href);
    const email = url.searchParams.get("email");
    let emailTimer: number | undefined;
    if (email) {
      emailTimer = window.setTimeout(() => {
        setForm((current) => current.email ? current : { ...current, email });
      }, 0);
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.toString());
    }
    const token = url.searchParams.get("verify");
    if (token) {
      url.searchParams.delete("verify");
      window.history.replaceState({}, "", url.toString());
      void apiRequest("/api/auth/verify-email", { method: "POST", body: jsonBody({ token }) })
        .then(() => setNotice("Your email is verified. Sign in to open your workspace."))
        .catch((reason) => setError(reason instanceof Error ? reason.message : "This verification link could not be used."));
    }
    return () => { if (emailTimer) window.clearTimeout(emailTimer); };
  }, [activeMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setShowResend(false);
    try {
      if (activeMode === "setup") {
        const result = await apiRequest<SessionPayload & { verificationRequired?: boolean }>("/api/setup", {
          method: "POST",
          body: jsonBody({ companyName: form.companyName, adminName: form.adminName, adminEmail: form.adminEmail, adminPassword: form.adminPassword }),
        });
        if (result.verificationRequired) {
          setSetupComplete(true);
          setNotice(`A verification link was sent to ${form.adminEmail}. Open it, then sign in here.`);
          return;
        }
        onReady();
      } else {
        await apiRequest("/api/auth/login", { method: "POST", body: jsonBody({ email: form.email, password: form.password }) });
        onReady();
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to continue. Try again.";
      if (activeMode === "setup" && errorStatus(reason) === 409 && /already initialized/i.test(message)) {
        // A cached or stale session payload can still show the one-time setup
        // form after the workspace exists. Refresh the session and switch to
        // sign-in instead of showing a dead-end form.
        await onRefreshSession?.();
        setSetupComplete(true);
        setNotice("This workspace is already set up. Sign in with your Admin account.");
      } else {
        setError(message);
      }
      setShowResend(activeMode === "login" && /verif/i.test(message));
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setError("");
    try {
      await apiRequest("/api/auth/resend-verification", { method: "POST", body: jsonBody({ email: form.email }) });
      setNotice("If this account needs verification, a fresh code and link are on their way.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send a verification email.");
    } finally {
      setResending(false);
    }
  }

  async function openDemo(accountId: string) {
    setDemoBusy(accountId);
    setDemoError("");
    try {
      await apiRequest("/api/auth/demo-login", { method: "POST", body: jsonBody({ accountId }) });
      onReady();
    } catch (reason) {
      setDemoError(apiMessage(reason));
    } finally {
      setDemoBusy("");
    }
  }

  return (
    <>
    <main className="auth-layout">
      <section className="auth-story" aria-label="HCM Lite overview">
        <div className="auth-topline"><div className="brand-lockup brand-lockup-light"><span className="brand-mark"><Building2 size={20} strokeWidth={2.2} /></span><span>people<span className="brand-dot">.</span>works</span></div><ThemePicker compact /></div>
        <div className="auth-story-copy">
          <span className="eyebrow eyebrow-light">HUMAN CAPITAL, MADE CLEAR</span>
          <h1>Good work starts with people feeling supported.</h1>
          <p>One calm place to manage your team, make confident decisions and keep the everyday work moving.</p>
          <div className="auth-feature-strip"><span><UserRoundCheck size={14} /> People, made visible</span><span><Sparkles size={14} /> Less busywork</span><span><ShieldCheck size={14} /> Audited decisions</span></div>
        </div>
        <div className="auth-art-wrap"><Image src="/team-workspace.svg" alt="A team working together around a shared workspace" width={760} height={500} priority className="auth-art" /><div className="art-caption"><span className="art-caption-dot" /><span><strong>One team, one clear view</strong><small>People · time · progress</small></span></div></div>
        <div className="story-proof">
          <span className="proof-icon"><ShieldCheck size={17} /></span>
          <span><strong>Private by design</strong><small>Every role sees only what it needs.</small></span><span className="story-proof-tag">SECURE WORKSPACE</span>
        </div>
        <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-panel-theme"><ThemePicker compact /></div>
        <div className="auth-form-wrap">
          <span className="eyebrow">{activeMode === "setup" ? "YOUR WORKSPACE STARTS HERE" : "WELCOME BACK"}</span>
          <h2>{activeMode === "setup" ? "Set up your company" : "Sign in to your workspace"}</h2>
          <p className="muted">{activeMode === "setup" ? "Create the company and first Admin account. Setup closes after this one-time step." : "Use the account created for your company."}</p>
          <form onSubmit={submit} className="form-stack">
            {activeMode === "setup" ? (
              <>
                <label className="field-label">Company name<input required minLength={2} maxLength={120} autoComplete="organization" placeholder="e.g. Northstar Studio" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
                <label className="field-label">Your full name<input required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Ayesha Khan" value={form.adminName} onChange={(event) => setForm({ ...form, adminName: event.target.value })} /></label>
                <label className="field-label">Work email<input required type="email" autoComplete="email" placeholder="you@company.com" value={form.adminEmail} onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} /></label>
              <label className="field-label">Create a password<span className="password-input-wrap"><input required type={showPassword ? "text" : "password"} minLength={10} autoComplete="new-password" placeholder="At least 10 characters" value={form.adminPassword} onChange={(event) => setForm({ ...form, adminPassword: event.target.value })} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span><span className="field-hint">Use at least 10 characters.</span></label>
              </>
            ) : (
              <>
                <label className="field-label">Work email<input required type="email" autoComplete="username" placeholder="you@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="field-label">Password<span className="password-input-wrap"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
              </>
            )}
          {notice && <div className="inline-alert success-alert auth-notice" role="status">{notice}</div>}
            {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
            <button className="button button-primary button-wide" disabled={loading} type="submit">{loading ? "Please wait…" : activeMode === "setup" ? "Create workspace" : "Sign in"}<ArrowRight size={16} /></button>
          {showResend && <button className="text-button resend-verification" type="button" disabled={resending || !form.email} onClick={() => void resendVerification()}>{resending ? "Sending link…" : "Resend email verification link"}<ArrowRight size={14} /></button>}
          </form>
          {activeMode === "login" && <>
            <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Employee sign-up</Link></div>
            <div className="auth-entry-grid">
              <Link className="auth-entry-card" href="/signup/company"><span className="auth-entry-icon"><Building2 size={16} /></span><span className="auth-entry-copy"><strong>Create a company</strong><small>{emailConfigured ? "New Admin workspace · email verified" : "Needs email delivery configured"}</small></span><ArrowRight size={14} /></Link>
              <Link className="auth-entry-card" href="/customer"><span className="auth-entry-icon"><UsersRound size={16} /></span><span className="auth-entry-copy"><strong>Customer demo</strong><small>Name + email · read-only portal</small></span><ArrowUpRight size={14} /></Link>
            </div>
            {demoMode && <div className="auth-demo-block">
              <div className="auth-demo-heading"><span><Sparkles size={14} /> LIVE DEMO WORKSPACE</span><small>One click, no password</small></div>
              {demoAccounts.length ? <div className="auth-demo-accounts">
                {demoAccounts.map((account) => <button key={account.id} type="button" className="auth-demo-account" disabled={Boolean(demoBusy)} onClick={() => void openDemo(account.id)}>
                  <span className="auth-demo-avatar">{account.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                  <span><strong>{account.name}</strong><small>{account.title}{account.department ? ` · ${account.department}` : ""}</small></span>
                  <span className="auth-demo-role">{account.role === "EMPLOYEE" ? "Staff" : account.role}</span>
                  {demoBusy === account.id ? <span className="auth-demo-spinner" aria-label="Opening demo" /> : <ArrowRight size={14} />}
                </button>)}
              </div> : <p className="auth-demo-empty">The demo workspace is not seeded on this installation. Use a normal account, or seed `hcm_lite_demo` first.</p>}
              {demoError && <div className="inline-alert error-alert" role="alert">{demoError}</div>}
            </div>}
          </>}
          <Link className="guest-demo-link" href="/demo">Explore the read-only guest dashboard<ArrowRight size={14} /></Link>
          {!initialized && activeMode === "setup" ? <p className="auth-footnote">Your first Admin account is permanent. Add HR and employee logins once you are inside.{!emailConfigured ? " Email delivery is not configured, so you will enter the workspace immediately." : ""}</p> : null}
        </div>
        <div className="auth-footer"><span><ShieldCheck size={13} /> People-first, made practical.</span><span>HCM Lite <i>·</i> Your private workspace</span></div>
      </section>
    </main>
    <SiteFooter variant="auth" note="Your workspace data stays scoped to your company and your role." />
    </>
  );
}

export function PasswordChangeGate({ name, onDone, onLogout }: { name: string; onDone: () => void; onLogout: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/auth/password", { method: "POST", body: jsonBody({ currentPassword, newPassword }) });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update password.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="public-auth-page">
      <div className="password-card">
        <span className="icon-well"><KeyRound size={22} /></span>
        <span className="eyebrow">ONE QUICK SECURITY STEP</span>
        <h1>Choose your own password, {name.split(" ")[0]}.</h1>
        <p className="muted">This account is using a temporary password. Change it to continue into your workspace.</p>
        <form onSubmit={submit} className="form-stack">
          <label className="field-label">Temporary password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label className="field-label">New password<input required type="password" minLength={10} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><span className="field-hint">At least 10 characters.</span></label>
          {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
          <button className="button button-primary button-wide" disabled={loading} type="submit">{loading ? "Saving…" : "Save new password"}<ArrowRight size={16} /></button>
        </form>
        <button className="text-button auth-switch" onClick={onLogout} type="button">Sign out</button>
      </div>
      <SiteFooter variant="auth" />
    </main>
  );
}
