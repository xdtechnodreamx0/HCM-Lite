"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { SessionPayload } from "@/lib/domain-types";

export function AuthGate({ initialized, onReady }: { initialized: boolean; onReady: () => void }) {
  const mode = initialized ? "login" : "setup";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ companyName: "", adminName: "", adminEmail: "", adminPassword: "", email: "", password: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "setup") {
        await apiRequest<SessionPayload>("/api/setup", {
          method: "POST",
          body: jsonBody({ companyName: form.companyName, adminName: form.adminName, adminEmail: form.adminEmail, adminPassword: form.adminPassword }),
        });
      } else {
        await apiRequest("/api/auth/login", { method: "POST", body: jsonBody({ email: form.email, password: form.password }) });
      }
      onReady();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="HCM Lite overview">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Building2 size={20} strokeWidth={2.2} /></span>
          <span>people<span className="brand-dot">.</span>works</span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow eyebrow-light">HUMAN CAPITAL, MADE CLEAR</span>
          <h1>Good work starts with people feeling supported.</h1>
          <p>One calm place to manage your team, make confident decisions and keep the everyday work moving.</p>
        </div>
        <div className="story-proof">
          <span className="proof-icon"><ShieldCheck size={17} /></span>
          <span><strong>Private by design</strong><small>Every role sees only what it needs.</small></span>
        </div>
        <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">{mode === "setup" ? "YOUR WORKSPACE STARTS HERE" : "WELCOME BACK"}</span>
          <h2>{mode === "setup" ? "Set up your company" : "Sign in to your workspace"}</h2>
          <p className="muted">{mode === "setup" ? "Create the company and first Admin account. Setup closes after this one-time step." : "Use the account created for your company."}</p>
          <form onSubmit={submit} className="form-stack">
            {mode === "setup" ? (
              <>
                <label className="field-label">Company name<input required minLength={2} maxLength={120} autoComplete="organization" placeholder="e.g. Northstar Studio" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
                <label className="field-label">Your full name<input required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Ayesha Khan" value={form.adminName} onChange={(event) => setForm({ ...form, adminName: event.target.value })} /></label>
                <label className="field-label">Work email<input required type="email" autoComplete="email" placeholder="you@company.com" value={form.adminEmail} onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} /></label>
                <label className="field-label">Create a password<input required type="password" minLength={10} autoComplete="new-password" placeholder="At least 10 characters" value={form.adminPassword} onChange={(event) => setForm({ ...form, adminPassword: event.target.value })} /><span className="field-hint">Use at least 10 characters.</span></label>
              </>
            ) : (
              <>
                <label className="field-label">Work email<input required type="email" autoComplete="username" placeholder="you@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label className="field-label">Password<input required type="password" autoComplete="current-password" placeholder="Your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              </>
            )}
            {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
            <button className="button button-primary button-wide" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "setup" ? "Create workspace" : "Sign in"}<ArrowRight size={16} /></button>
          </form>
          {!initialized && mode === "setup" ? <p className="auth-footnote">Your first Admin account is permanent. Add HR and employee logins once you are inside.</p> : null}
        </div>
        <div className="auth-footer"><span>People-first, made practical.</span><span>HCM Lite <i>·</i> 2026</span></div>
      </section>
    </main>
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
    <main className="password-gate">
      <div className="password-card">
        <span className="icon-well"><ShieldCheck size={22} /></span>
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
    </main>
  );
}
