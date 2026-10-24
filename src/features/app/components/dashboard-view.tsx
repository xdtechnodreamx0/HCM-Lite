import { Activity, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Clock3, UserRound, Users, WalletCards } from "lucide-react";
import type { AnnouncementRecord, DashboardPayload, SessionPayload } from "@/lib/domain-types";
import { EmptyState, MetricCard, PageHeading, Panel, ProgressBar, formatMoney } from "@/features/app/components/ui";

export function DashboardView({ dashboard, announcements = [], user, onGo }: { dashboard: DashboardPayload | null; announcements?: AnnouncementRecord[]; user: NonNullable<SessionPayload["user"]>; onGo: (view: "employees" | "attendance" | "leave" | "payroll" | "assistant" | "announcements") => void }) {
  const name = user.name.split(" ")[0];
  const iconList = [Users, Activity, CalendarDays, Clock3, WalletCards];
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  const kpis = dashboard?.kpis ?? [];
  const hours = dashboard?.employee?.hoursThisWeek ?? 0;

  return <>
    <PageHeading eyebrow={user.role === "EMPLOYEE" ? "YOUR WORKSPACE" : `${user.role} OVERVIEW`} title={`${greeting}, ${name}.`} description={user.role === "EMPLOYEE" ? "Here’s how your week is going." : "A clear view of what’s happening across your team."} action={<span className="live-date-chip"><span className="live-dot" /> Live · {dashboard?.asOf ?? "—"}</span>} />
    <div className={`metric-grid ${kpis.length > 4 ? "metric-grid-five" : ""}`}>
      {kpis.map((metric, index) => <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} icon={iconList[index % iconList.length]} />)}
    </div>

    {user.role === "EMPLOYEE" ? (
      <div className="dashboard-grid employee-dashboard-grid">
        <Panel title="Your time this week" subtitle="A steady week, one check-in at a time." action={<button className="panel-link" onClick={() => onGo("attendance")}>View attendance <ArrowRight size={14} /></button>}>
          <div className="week-hours"><strong>{hours.toFixed(1)}<span>h</span></strong><span className="week-target">of 40 hours</span></div>
          <ProgressBar label="Weekly target" value={Number(hours.toFixed(1))} maximum={40} />
          <div className="week-note"><span className="soft-icon"><Activity size={15} /></span> Your logged hours update after checkout.</div>
        </Panel>
        <Panel title="Leave balance" subtitle="Available for this calendar year." action={<button className="panel-link" onClick={() => onGo("leave")}>Plan time off <ArrowRight size={14} /></button>}>
          {dashboard?.employee?.leaveBalances?.length ? <div className="balance-list">{dashboard.employee.leaveBalances.map((balance) => <div className="balance-row" key={balance.name}><span>{balance.name}</span><strong>{balance.unlimited ? "Unlimited" : `${balance.remaining ?? 0} days left`}</strong></div>)}</div> : <EmptyState title="No leave types yet" description="Your company’s leave policies will show here." icon={CalendarDays} />}
        </Panel>
        <Panel title="Your latest payslip" subtitle="Finalized payroll appears here." className="payslip-tile" action={<button className="panel-link" onClick={() => onGo("payroll")}>Payslips <ArrowRight size={14} /></button>}>
          {dashboard?.employee?.lastPayslip ? <div className="latest-payslip"><span className="payslip-icon"><WalletCards size={19} /></span><div><strong>{dashboard.employee.lastPayslip.period}</strong><small>Net pay</small></div><b>{formatMoney(dashboard.employee.lastPayslip.netPaisa)}</b></div> : <EmptyState title="No finalized payslip" description="Once payroll is finalized, your payslip will be ready to download." icon={WalletCards} />}
        </Panel>
        <Panel title="Team updates" subtitle="The latest from your company." className="team-updates" action={<button className="panel-link" onClick={() => onGo("assistant")}>Ask a question <ArrowRight size={14} /></button>}>
          {dashboard?.employee?.announcements?.length ? <div className="announcement-list">{dashboard.employee.announcements.map((item) => <article className="announcement-item" key={item.id}><div className="announcement-mark"><CalendarClock size={15} /></div><div><strong>{item.title}</strong><p>{item.body}</p></div></article>)}</div> : <EmptyState title="No updates yet" description="Company announcements will appear here." icon={CalendarDays} />}
        </Panel>
      </div>
    ) : (
      <div className="dashboard-grid">
        <Panel title="Attendance at a glance" subtitle={`Today · ${dashboard?.asOf ?? ""}`} action={<button className="panel-link" onClick={() => onGo("attendance")}>Open attendance <ArrowRight size={14} /></button>}>
          {dashboard ? <div className="attendance-glance">
            <div className="glance-main"><span className="glance-ring"><CheckCircle2 size={23} /></span><div><strong>{dashboard.attendance.present}</strong><span>present today</span></div></div>
            <div className="glance-stats">
              <div><span className="legend-dot dot-teal" />On leave<strong>{dashboard.attendance.onLeave}</strong></div>
              <div><span className="legend-dot dot-amber" />Late arrivals<strong>{dashboard.attendance.late}</strong></div>
              <div><span className="legend-dot dot-rose" />Absent<strong>{dashboard.attendance.absent}</strong></div>
            </div>
          </div> : <EmptyState title="No attendance data yet" description="Team attendance will appear after employees check in." icon={Activity} />}
        </Panel>
        <Panel title="Attendance trend" subtitle="Recorded presence over the last week." action={<span className="chart-key"><span /> People</span>}>
          {dashboard?.trend.length ? <div className="mini-chart" role="img" aria-label="Attendance trend by day">
            {dashboard.trend.map((item, index) => <div className="mini-chart-column" key={`${item.label}-${index}`}><span className="mini-chart-value">{item.value}</span><div className="mini-chart-track"><span style={{ height: `${Math.max(4, Math.min(100, item.value * 16))}%` }} /></div><small>{item.label}</small></div>)}
          </div> : <EmptyState title="No trend to display" description="Attendance history will create a useful trend here." icon={Activity} />}
        </Panel>
        <Panel title={user.role === "ADMIN" ? "Recent activity" : "Needs your attention"} subtitle={user.role === "ADMIN" ? "A short view of company changes." : "The items that keep people moving."} className="activity-panel" action={user.role === "ADMIN" ? <button className="panel-link" onClick={() => onGo("assistant")}>Summarize <ArrowRight size={14} /></button> : null}>
          {user.role === "ADMIN" ? dashboard?.recentAudit?.length ? <div className="activity-list">{dashboard.recentAudit.map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><strong>{String(item.action).replaceAll(".", " ")}</strong><small>{item.actorEmail} · {String(item.entity)}</small></div><time>{timeAgo(item.createdAt)}</time></div>)}</div> : <EmptyState title="No activity recorded" description="Important company actions will be captured here." icon={CalendarDays} /> : <div className="attention-list">
            <button className="attention-row" onClick={() => onGo("leave")}><span className="attention-icon attention-amber"><CalendarDays size={16} /></span><span><strong>{dashboard?.pendingLeaves ?? 0} leave requests</strong><small>Waiting for a decision</small></span><ArrowRight size={15} /></button>
            <button className="attention-row" onClick={() => onGo("attendance")}><span className="attention-icon attention-blue"><Clock3 size={16} /></span><span><strong>{dashboard?.attendance.late ?? 0} late check-ins</strong><small>Recorded today</small></span><ArrowRight size={15} /></button>
            <button className="attention-row" onClick={() => onGo("employees")}><span className="attention-icon attention-green"><UserRound size={16} /></span><span><strong>{dashboard?.kpis[0]?.value ?? 0} people</strong><small>In your team directory</small></span><ArrowRight size={15} /></button>
          </div>}
        </Panel>
        <Panel title="A good next step" subtitle="Keep the team's records current." className="next-step-panel">
          <div className="next-step-card"><span className="next-step-icon"><WalletCards size={20} /></span><div><strong>{user.role === "HR" ? "Prepare this month’s payroll" : "Review this month’s payroll"}</strong><p>Confirm attendance and approved leave before payroll is finalized.</p><button className="button button-secondary button-small" onClick={() => onGo("payroll")}>Go to payroll <ArrowRight size={14} /></button></div></div>
        </Panel>
      </div>
    )}
    {user.role === "ADMIN" && dashboard?.detail && <div className="dashboard-grid dashboard-insights-grid">
      <Panel title="Team by department" subtitle="Active and probation employees."><BreakdownList items={dashboard.detail.departmentBreakdown ?? []} /></Panel>
      <Panel title="Team by gender" subtitle="Based on what employees have shared."><BreakdownList items={dashboard.detail.genderBreakdown ?? []} /></Panel>
      <Panel title="Time with the company" subtitle="Tenure for the current workforce."><BreakdownList items={dashboard.detail.tenureBreakdown ?? []} /></Panel>
    </div>}
    {user.role === "HR" && dashboard?.detail && <div className="dashboard-grid hr-insights-grid">
      <Panel title="Team health" subtitle={`People metrics · ${dashboard.asOf.slice(0, 7)}`}>
        <div className="health-metrics"><div><small>Attendance rate</small><strong>{percent(dashboard.detail.attendanceRate)}</strong></div><div><small>Late arrivals</small><strong>{percent(dashboard.detail.latePercent)}</strong></div><div><small>Absenteeism</small><strong>{percent(dashboard.detail.absenteeism)}</strong></div><div><small>Approved leave</small><strong>{dashboard.detail.leaveUtilizationDays === null ? "N/A" : `${dashboard.detail.leaveUtilizationDays.toFixed(1)} days / person`}</strong></div></div>
      </Panel>
      <Panel title="Most late arrivals" subtitle={`Employee count · ${dashboard.asOf.slice(0, 7)}`} action={<button className="panel-link" onClick={() => onGo("attendance")}>Review attendance <ArrowRight size={14} /></button>}>
        {dashboard.detail.topLatecomers?.length ? <ol className="latecomer-list">{dashboard.detail.topLatecomers.map((item, index) => <li key={item.employeeId}><span className="latecomer-rank">{index + 1}</span><span><strong>{item.name}</strong><small>{item.employeeCode} · {item.departmentName}</small></span><b>{item.lateCount}</b></li>)}</ol> : <EmptyState title="No late arrivals in this period" description="Late check-ins will appear here when recorded." icon={Clock3} />}
      </Panel>
    </div>}
    {user.role !== "EMPLOYEE" && <div className="dashboard-news-row"><Panel title="Latest company updates" subtitle="Recent announcements shared with your team." action={<button className="panel-link" onClick={() => onGo("announcements")}>All updates <ArrowRight size={14} /></button>}>
      {announcements.length ? <div className="dashboard-news-list">{announcements.slice(0, 3).map((item) => <article key={item.id}><span className="announcement-mark"><CalendarClock size={15} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{item.authorName || "People team"} · {formatNewsDate(item.createdAt)}</small></div></article>)}</div> : <EmptyState title="No company updates yet" description="Published announcements will appear here for your team." icon={CalendarDays} />}
    </Panel></div>}
  </>;
}

function formatNewsDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(date);
}

function BreakdownList({ items }: { items: Array<{ label: string; count: number }> }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return items.length ? <div className="breakdown-list">{items.map((item) => <div className="breakdown-item" key={item.label}><div><span>{item.label}</span><strong>{item.count}</strong></div><span className="breakdown-track"><i style={{ width: `${Math.round((item.count / maximum) * 100)}%` }} /></span></div>)}</div> : <EmptyState title="No people to summarize" description="Add employees to see this breakdown." icon={Users} />;
}

function percent(value: number | null | undefined) {
  return value === null || value === undefined ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function timeAgo(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

