import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Sparkles, Users, WalletCards } from "lucide-react";

const departments = [
  { name: "Product & Engineering", count: 28, width: "82%" },
  { name: "Customer Experience", count: 19, width: "58%" },
  { name: "People & Operations", count: 12, width: "38%" },
];

const updates = [
  { day: "24 OCT", title: "Quarterly planning week begins Monday", detail: "Team leads will share their priorities and project milestones." },
  { day: "22 OCT", title: "Wellbeing afternoon · 30 October", detail: "A half-day to reset, learn, or spend time with your team." },
  { day: "20 OCT", title: "Open enrollment is now available", detail: "Review your benefits choices with the People team by 6 November." },
];

const attendance = ["M", "T", "W", "T", "F", "M", "T"];
const attendanceHeights = [72, 86, 79, 94, 89, 68, 91];

export default function GuestDemoPage() {
  return <main className="guest-demo-page">
    <header className="guest-demo-topbar"><Link href="/" className="guest-brand"><span className="brand-mark">P</span> people<span className="brand-dot">.</span>works</Link><span className="sample-badge"><i /> SAMPLE WORKSPACE · READ ONLY</span><Link className="guest-signin" href="/">Sign in <ArrowUpRight size={14} /></Link></header>
    <section className="guest-demo-hero"><div><span className="eyebrow">GUEST DASHBOARD · NORTHSTAR STUDIO</span><h1>A clearer view of work, every day.</h1><p>Explore a sample people workspace with realistic, fictional team data. Nothing here belongs to a real company or employee.</p><div className="guest-date"><CalendarDays size={14} /> Week of October 19, 2026 <span>·</span> Karachi, PK</div></div><div className="guest-hero-note"><span className="guest-note-icon"><CheckCircle2 size={19} /></span><div><strong>People operations, in sync</strong><small>Directory · attendance · leave · pay</small></div><span className="guest-live-pill">DEMO</span></div></section>
    <section className="guest-metrics" aria-label="Sample workspace metrics">
      <article><span><Users size={17} /></span><small>Active teammates</small><strong>59</strong><em>Across 6 departments</em></article>
      <article><span><CheckCircle2 size={17} /></span><small>On time this week</small><strong>94.2%</strong><em>+2.1% from last week</em></article>
      <article><span><CalendarDays size={17} /></span><small>Leave requests</small><strong>04</strong><em>2 need a decision</em></article>
      <article><span><WalletCards size={17} /></span><small>Monthly payroll</small><strong>₨ 8.4m</strong><em>October · draft review</em></article>
    </section>
    <section className="guest-dashboard-grid">
      <article className="guest-card guest-attendance"><div className="guest-card-heading"><div><h2>Attendance rhythm</h2><p>Check-ins across the last seven workdays</p></div><span className="guest-card-icon"><Clock3 size={16} /></span></div><div className="guest-chart">{attendance.map((day, index) => <div className="guest-chart-col" key={`${day}-${index}`}><span className="guest-chart-track"><i style={{ height: `${attendanceHeights[index]}%` }} /></span><small>{day}</small></div>)}</div><div className="guest-chart-foot"><span><i /> On time</span><strong>94.2% average</strong></div></article>
      <article className="guest-card guest-departments"><div className="guest-card-heading"><div><h2>People by department</h2><p>Active and probation colleagues</p></div><span className="guest-card-icon"><Users size={16} /></span></div><div className="guest-department-list">{departments.map((item) => <div key={item.name}><div><span>{item.name}</span><strong>{item.count}</strong></div><i><b style={{ width: item.width }} /></i></div>)}</div><Link href="/" className="guest-card-link">Open the dashboard <ArrowUpRight size={14} /></Link></article>
    </section>
    <section className="guest-card guest-updates"><div className="guest-card-heading"><div><h2>What’s happening</h2><p>Recent updates shared with the sample team</p></div><span className="guest-live-pill">3 UPDATES</span></div><div className="guest-updates-list">{updates.map((item) => <article key={item.title}><time>{item.day}</time><div><strong>{item.title}</strong><p>{item.detail}</p></div><ArrowUpRight size={14} /></article>)}</div></section>
    <section className="guest-ai-card"><span className="guest-ai-icon"><Sparkles size={20} /></span><div><span className="eyebrow">PEOPLE.WORKS AI</span><h2>Get a hand finding your way around.</h2><p>Ask about attendance, leave, payroll, or the page you’re viewing. Sign in to get answers scoped to your role.</p></div><Link href="/?view=assistant" className="guest-ai-cta">Open AI assistant <ArrowUpRight size={15} /></Link></section>
    <section className="guest-roles"><div><span className="eyebrow">TRY A ROLE</span><h2>See how each workspace feels.</h2><p>These local demo accounts share one simple password. Use them only in the demo environment.</p></div><div className="guest-role-cards">
      {[{ title: "Admin", username: "admin@northstar.demo", note: "Full company settings and user access" }, { title: "HR", username: "hr@northstar.demo", note: "People operations and approvals" }, { title: "Employee", username: "employee@northstar.demo", note: "Personal attendance, leave, and payslips" }].map((role) => <article key={role.title}><span className="guest-role-mark">{role.title.slice(0, 1)}</span><strong>{role.title}</strong><small>{role.note}</small><code>{role.username}</code><span className="guest-role-password">Password <b>12345</b></span><Link href="/">Open sign in <ArrowUpRight size={13} /></Link></article>)}
    </div></section>
    <footer className="guest-demo-footer"><span>All names, figures, and updates on this page are fictional sample data.</span><Link href="/">Return to People.works <ArrowLeft size={13} /></Link></footer>
  </main>;
}
