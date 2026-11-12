"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Building2, CalendarDays, CheckCircle2, Clock3,
  LoaderCircle, LogOut, Mail, ShieldCheck, Sparkles, Users, UsersRound,
} from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { apiMessage } from "@/lib/errors";
import { SiteFooter } from "@/features/app/components/site-footer";

type CustomerDashboard = {
  company: { name: string; timezone: string; officeStart: string; graceMinutes: number; weekendDays: number[] };
  today: string;
  stats: { headcount: number; departments: number; onLeaveToday: number; newJoiners: number };
  teams: Array<{ name: string; count: number; lead: string | null }>;
  people: Array<{ name: string; designation: string; department: string }>;
  updates: Array<{ title: string; body: string; date: string }>;
};

type CustomerBootstrap = {
  available: boolean;
  reason?: string;
  company?: { name: string };
  session?: { name: string; email: string } | null;
  dashboard?: CustomerDashboard | null;
};

function formatLongDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function CustomerBrand() {
  return <Link className="customer-brand" href="/">
    <span className="brand-mark"><Building2 size={18} strokeWidth={2.2} /></span>
    <span>people<span className="brand-dot">.</span>works</span>
    <span className="customer-brand-tag">CUSTOMER VIEW</span>
  </Link>;
}

export function CustomerPortal() {
  const [bootstrap, setBootstrap] = useState<CustomerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    let active = true;
    void apiRequest<CustomerBootstrap>("/api/customer/session")
      .then((result) => { if (active) setBootstrap(result); })
      .catch((reason) => { if (active) setError(apiMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest<CustomerBootstrap>("/api/customer/session", {
        method: "POST",
        body: jsonBody({ name: form.name, email: form.email }),
      });
      setBootstrap(result);
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/customer/session", { method: "DELETE" });
      setBootstrap((current) => current ? { ...current, session: null, dashboard: null } : current);
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="customer-portal customer-centered">
      <div className="customer-loading"><LoaderCircle size={22} className="spin" /><span>Opening the customer demo…</span></div>
      <SiteFooter variant="auth" />
    </main>;
  }

  if (bootstrap && !bootstrap.available) {
    return <main className="customer-portal customer-centered">
      <section className="password-card public-auth-card customer-signin-card">
        <CustomerBrand />
        <span className="icon-well"><ShieldCheck size={22} /></span>
        <span className="eyebrow">CUSTOMER DEMO</span>
        <h1>This demo portal is not available.</h1>
        <p className="muted">{bootstrap.reason ?? "The demo workspace has not been enabled on this deployment."}</p>
        <div className="verify-actions">
          <Link className="button button-primary button-wide" href="/demo">Open the guest dashboard<ArrowRight size={15} /></Link>
          <Link className="button button-secondary button-wide" href="/login">Staff sign in</Link>
        </div>
        <p className="auth-security-note"><ShieldCheck size={14} /> This portal never grants access to staff records or company settings.</p>
      </section>
      <SiteFooter variant="auth" />
    </main>;
  }

  if (!bootstrap?.session || !bootstrap.dashboard) {
    return <main className="customer-portal customer-signin-layout">
      <section className="customer-story">
        <div className="customer-story-top"><CustomerBrand /><Link className="customer-story-exit" href="/login"><ArrowLeft size={14} /> Staff sign in</Link></div>
        <div className="customer-story-copy">
          <span className="eyebrow eyebrow-light">A CUSTOMER’S-EYE VIEW</span>
          <h1>See the company as your people do.</h1>
          <p>Step into a read-only snapshot of the Northstar Studio demo workspace. No password, no staff permissions — just a clear view of the team, structure, and latest updates.</p>
          <div className="customer-story-points">
            <span><Users size={15} /> Team and department overview</span>
            <span><CalendarDays size={15} /> Leave and joining-day context</span>
            <span><ShieldCheck size={15} /> Sanitized demo data only</span>
          </div>
        </div>
        <div className="customer-story-art">
          <Image src="/customer-lounge.svg" alt="A calm, light-filled studio lounge with sage walls and natural wood furniture" width={900} height={720} priority sizes="(max-width: 900px) 90vw, 44vw" className="customer-story-image" />
          <span className="customer-story-art-caption"><i /> Northstar Studio · Karachi</span>
        </div>
        <div className="customer-story-note">
          <span className="guest-note-icon"><Sparkles size={18} /></span>
          <div><strong>Built for a genuine first impression</strong><small>Enter a name and email. Nothing is stored beyond this demo session.</small></div>
        </div>
      </section>
      <section className="customer-form-panel">
        <section className="password-card public-auth-card customer-signin-card">
          <CustomerBrand />
          <span className="icon-well"><UsersRound size={22} /></span>
          <span className="eyebrow">CUSTOMER DEMO SIGN IN</span>
          <h1>Welcome to the studio.</h1>
          <p className="muted">Use your own name and email to open the customer view. This is a separate, read-only demo portal — not a fourth staff role.</p>
          <form className="form-stack" onSubmit={signIn}>
            <label className="field-label">Your name<input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" /></label>
            <label className="field-label">Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label>
            {error && <div className="inline-alert error-alert" role="alert">{error}</div>}
            <button className="button button-primary button-wide" disabled={busy}>{busy ? "Opening the demo…" : "Open customer demo"}<ArrowRight size={15} /></button>
          </form>
          <p className="auth-security-note"><ShieldCheck size={14} /> This session can read a sanitized demo snapshot only. It cannot open employee records, payroll, or settings.</p>
          <p className="auth-switch-line">Need the full workspace? <Link href="/login">Sign in with a staff account</Link></p>
        </section>
        <Link className="customer-form-back" href="/demo"><ArrowUpRight size={14} /> Prefer browsing without signing in? Open the guest dashboard.</Link>
      </section>
      <SiteFooter variant="auth" note="The customer demo reads a fictional, sanitized Northstar Studio workspace. No real employee data is shown." />
    </main>;
  }

  const dashboard = bootstrap.dashboard;
  const firstName = bootstrap.session.name.split(" ")[0];
  const maxTeam = Math.max(1, ...dashboard.teams.map((team) => team.count));

  return <main className="customer-portal">
    <header className="customer-topbar">
      <CustomerBrand />
      <span className="customer-readonly"><ShieldCheck size={13} /> READ-ONLY DEMO</span>
      <div className="customer-account">
        <span className="customer-avatar">{initials(bootstrap.session.name)}</span>
        <span className="customer-account-copy"><strong>{bootstrap.session.name}</strong><small>{bootstrap.session.email}</small></span>
        <button className="button button-secondary button-small" type="button" disabled={busy} onClick={() => void signOut()}><LogOut size={14} /> Sign out</button>
      </div>
    </header>

    <section className="customer-hero">
      <div>
        <span className="eyebrow">CUSTOMER VIEW · {dashboard.company.name.toUpperCase()}</span>
        <h1>Good to see you, {firstName}.</h1>
        <p>Here is the {dashboard.company.name} snapshot for {formatLongDate(dashboard.today)}. Everything on this page is a read-only sample from the demo workspace.</p>
        <div className="customer-hero-meta"><span><Clock3 size={14} /> Office hours from {dashboard.company.officeStart} · {dashboard.company.timezone}</span><span><CalendarDays size={14} /> {dashboard.company.graceMinutes}-minute grace period</span></div>
      </div>
      <aside className="customer-hero-card">
        <span className="customer-hero-card-icon"><Sparkles size={20} /></span>
        <span className="eyebrow">WHAT YOU ARE SEEING</span>
        <strong>A calm, sanitized snapshot</strong>
        <p>Headcount, teams, updates, and time context only. Names are fictional; salary, attendance, and contact details never leave the staff workspace.</p>
        <Link href="/demo">Explore the product tour <ArrowUpRight size={14} /></Link>
      </aside>
    </section>

    <section className="customer-stats" aria-label="Demo company snapshot">
      <article><span><Users size={17} /></span><small>Active teammates</small><strong>{dashboard.stats.headcount}</strong><em>Across {dashboard.stats.departments} departments</em></article>
      <article><span><Building2 size={17} /></span><small>Departments</small><strong>{dashboard.stats.departments}</strong><em>One shared studio view</em></article>
      <article><span><CalendarDays size={17} /></span><small>On leave today</small><strong>{dashboard.stats.onLeaveToday}</strong><em>Approved leave only</em></article>
      <article><span><CheckCircle2 size={17} /></span><small>New this year</small><strong>{dashboard.stats.newJoiners}</strong><em>Joiners in {dashboard.today.slice(0, 4)}</em></article>
    </section>

    <section className="customer-grid">
      <article className="customer-card customer-teams">
        <div className="customer-card-heading"><div><h2>Team shape</h2><p>How the studio is organized today</p></div><span className="customer-card-icon"><Users size={16} /></span></div>
        <div className="customer-team-list">
          {dashboard.teams.map((team) => <div key={team.name} className="customer-team-row">
            <div className="customer-team-label"><span>{team.name}</span><strong>{team.count}</strong></div>
            <div className="customer-team-track"><i style={{ width: `${Math.max(10, Math.round(team.count / maxTeam * 100))}%` }} /></div>
            <small>{team.lead ? `Led by ${team.lead}` : "Shared team ownership"}</small>
          </div>)}
        </div>
      </article>

      <article className="customer-card customer-updates">
        <div className="customer-card-heading"><div><h2>Latest updates</h2><p>Recent notes shared with the team</p></div><span className="customer-card-icon"><Sparkles size={16} /></span></div>
        {dashboard.updates.length ? <div className="customer-update-list">
          {dashboard.updates.map((update, index) => <article key={`${update.title}-${index}`}>
            <time>{update.date ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${update.date}T12:00:00Z`)) : "UPDATE"}</time>
            <div><strong>{update.title}</strong><p>{update.body}</p></div>
          </article>)}
        </div> : <p className="customer-empty">No announcements have been shared in the demo workspace yet.</p>}
      </article>
    </section>

    <section className="customer-card customer-people">
      <div className="customer-card-heading"><div><h2>Some of the people behind the work</h2><p>A small, representative slice of the directory</p></div><span className="customer-card-icon"><UsersRound size={16} /></span></div>
      <div className="customer-people-grid">
        {dashboard.people.map((person) => <article key={`${person.name}-${person.designation}`}>
          <span className="customer-person-avatar">{initials(person.name)}</span>
          <strong>{person.name}</strong>
          <small>{person.designation}</small>
          <em>{person.department}</em>
        </article>)}
      </div>
    </section>

    <section className="customer-cta">
      <div><span className="eyebrow">READY FOR THE REAL THING?</span><h2>Give every role a workspace that fits.</h2><p>Admins keep control, HR moves the work forward, and employees get a clear view of their own day.</p></div>
      <div className="customer-cta-actions"><Link className="button button-primary" href="/login">Staff sign in<ArrowRight size={15} /></Link><Link className="button button-secondary" href="/signup">Request employee access</Link></div>
    </section>

    <p className="customer-demo-note"><Mail size={14} /> This customer session is tied to {bootstrap.session.email} and expires automatically. It never grants staff API access.</p>
    <SiteFooter variant="public" companyName={dashboard.company.name} note="Customer demo · fictional sample data from the Northstar Studio demo workspace." />
  </main>;
}
