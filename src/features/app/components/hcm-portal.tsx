"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, Building2, CalendarDays, ChevronDown, CircleHelp,
  FileClock, LayoutDashboard, LogOut, Menu, Megaphone, MessageCircle, Search, Sparkles,
  ShieldCheck, Users, WalletCards, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import type {
  AnnouncementRecord, AttendanceRecord, CorrectionRecord, DashboardPayload,
  EmployeeRecord, LeaveRecord, NotificationRecord, OrganizationPayload,
  PayrollRunRecord, SessionPayload, UserRecord,
} from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { AuthGate, PasswordChangeGate } from "@/features/app/components/auth-gate";
import { PortalView } from "@/features/app/components/portal-views";
import { ThemeDescription, ThemePicker } from "@/features/app/components/theme-provider";

type ViewId = "overview" | "organization" | "users" | "employees" | "attendance" | "leave" | "payroll" | "announcements" | "audit" | "assistant" | "profile";
type PortalData = {
  dashboard: DashboardPayload | null;
  organization: OrganizationPayload | null;
  employees: EmployeeRecord[];
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  corrections: CorrectionRecord[];
  payroll: PayrollRunRecord[];
  announcements: AnnouncementRecord[];
  notifications: NotificationRecord[];
  audit: Array<Record<string, unknown>>;
  users: UserRecord[];
};

const EMPTY_DATA: PortalData = {
  dashboard: null, organization: null, employees: [], attendance: [], leaves: [],
  corrections: [], payroll: [], announcements: [], notifications: [], audit: [], users: [],
};

const navigation: Record<string, Array<{ id: ViewId; label: string; icon: LucideIcon }>> = {
  ADMIN: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "users", label: "User access", icon: ShieldCheck },
    { id: "employees", label: "People", icon: Users },
    { id: "attendance", label: "Attendance", icon: Activity },
    { id: "leave", label: "Leave", icon: CalendarDays },
    { id: "payroll", label: "Payroll", icon: WalletCards },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "audit", label: "Audit trail", icon: FileClock },
    { id: "assistant", label: "AI assistant", icon: MessageCircle },
  ],
  HR: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "employees", label: "People", icon: Users },
    { id: "attendance", label: "Attendance", icon: Activity },
    { id: "leave", label: "Leave", icon: CalendarDays },
    { id: "payroll", label: "Payroll", icon: WalletCards },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "assistant", label: "AI assistant", icon: MessageCircle },
  ],
  EMPLOYEE: [
    { id: "overview", label: "My overview", icon: LayoutDashboard },
    { id: "attendance", label: "My attendance", icon: Activity },
    { id: "leave", label: "My leave", icon: CalendarDays },
    { id: "payroll", label: "My payslips", icon: WalletCards },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "assistant", label: "AI assistant", icon: MessageCircle },
    { id: "profile", label: "My profile", icon: Users },
  ],
};

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try { return await apiRequest<T>(path); } catch { return fallback; }
}

export function HcmPortal() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [data, setData] = useState<PortalData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [assistantContext, setAssistantContext] = useState<ViewId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [quickResults, setQuickResults] = useState<EmployeeRecord[]>([]);
  const [quickSearchBusy, setQuickSearchBusy] = useState(false);
  const [peopleSearchSeed, setPeopleSearchSeed] = useState<{ query: string; key: number } | null>(null);

  const loadData = useCallback(async (role: string) => {
    setRefreshing(true);
    const requests: Array<Promise<unknown>> = [
      safeGet<DashboardPayload>("/api/dashboard", null as unknown as DashboardPayload),
      safeGet<{ items: EmployeeRecord[] }>("/api/employees?page=1&pageSize=100", { items: [] }),
      safeGet<AttendanceRecord[]>("/api/attendance", []),
      safeGet<LeaveRecord[]>("/api/leaves", []),
      safeGet<CorrectionRecord[]>("/api/corrections", []),
      safeGet<AnnouncementRecord[]>("/api/announcements", []),
      safeGet<NotificationRecord[]>("/api/notifications", []),
      safeGet<PayrollRunRecord[]>("/api/payroll", []),
    ];
    if (role !== "EMPLOYEE") {
      requests.push(safeGet<OrganizationPayload>("/api/organization", null as unknown as OrganizationPayload));
    }
    if (role === "ADMIN") {
      requests.push(safeGet<UserRecord[]>("/api/users", []));
      requests.push(safeGet<Array<Record<string, unknown>>>("/api/audit", []));
    }
    const results = await Promise.all(requests);
    const [dashboard, employeeResult, attendance, leaves, corrections, announcements, notifications, payrollResult] = results;
    const employeeItems = (employeeResult as { items: EmployeeRecord[] }).items;
    let cursor = 8;
    const organization = role !== "EMPLOYEE" ? results[cursor++] as OrganizationPayload : null;
    const payroll = payrollResult as PayrollRunRecord[];
    const users = role === "ADMIN" ? results[cursor++] as UserRecord[] : [];
    const audit = role === "ADMIN" ? results[cursor] as Array<Record<string, unknown>> : [];
    setData({
      dashboard: dashboard as DashboardPayload | null,
      employees: employeeItems,
      attendance: attendance as AttendanceRecord[],
      leaves: leaves as LeaveRecord[],
      corrections: corrections as CorrectionRecord[],
      announcements: announcements as AnnouncementRecord[],
      notifications: notifications as NotificationRecord[],
      organization, payroll, users, audit,
    });
    setRefreshing(false);
  }, []);

  const refreshSession = useCallback(async () => {
    setLoadError("");
    try {
      const current = await apiRequest<SessionPayload>("/api/session");
      setSession(current);
      if (current.user) await loadData(current.user.role);
    } catch (reason) {
      setLoadError(apiMessage(reason));
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshSession(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") !== "assistant") return;
    const timer = window.setTimeout(() => {
      setAssistantContext("overview");
      setActiveView("assistant");
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session?.user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const query = globalSearch.trim();
    if (query.length < 2 || session?.user?.role === "EMPLOYEE") return;
    let active = true;
    const timer = window.setTimeout(() => {
      setQuickSearchBusy(true);
      const params = new URLSearchParams({ query, page: "1", pageSize: "5", status: "all", sortBy: "name", sortDirection: "asc" });
      void apiRequest<{ items: EmployeeRecord[] }>(`/api/employees?${params.toString()}`)
        .then((result) => { if (active) setQuickResults(result.items); })
        .catch(() => { if (active) setQuickResults([]); })
        .finally(() => { if (active) setQuickSearchBusy(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [globalSearch, session?.user?.role]);

  const currentUser = session?.user ?? null;
  const nav = useMemo(() => currentUser ? navigation[currentUser.role] ?? [] : [], [currentUser]);
  const currentLabel = nav.find((item) => item.id === activeView)?.label ?? "Overview";

  async function logOut() {
    try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch { /* The local view still clears. */ }
    setData(EMPTY_DATA);
    setSession((current) => current ? { ...current, user: null } : null);
    setActiveView("overview");
    setToast("You have signed out.");
  }

  function completeAuth() { void refreshSession(); }

  if (loading) {
    return <main className="loading-screen"><span className="loading-mark"><Building2 size={22} /></span><span>Opening your workspace…</span></main>;
  }
  if (loadError) {
    return <main className="connection-screen"><span className="icon-well"><CircleHelp size={24} /></span><h1>We couldn’t reach your workspace.</h1><p>{loadError}</p><p className="muted">Check MongoDB and the required environment variables, then retry.</p><button className="button button-primary" onClick={() => { setLoading(true); void refreshSession(); }}>Try again</button></main>;
  }
  if (!session?.initialized || !currentUser) {
    return <AuthGate initialized={session?.initialized ?? false} onReady={completeAuth} />;
  }
  if (currentUser.forcePasswordChange) {
    return <PasswordChangeGate name={currentUser.name} onDone={completeAuth} onLogout={() => { void logOut(); }} />;
  }

  return (
    <div className="app-frame">
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Building2 size={19} /></span>
          <span className="brand-word">people<span className="brand-dot">.</span>works</span>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <span className="company-avatar">{session.company?.name?.slice(0, 1).toUpperCase() ?? "W"}</span>
          <span className="workspace-name"><strong>{session.company?.name ?? "Your company"}</strong><small>{roleName(currentUser.role)} workspace</small></span>
          <ChevronDown size={14} className="muted-icon" />
        </div>
        <div className="side-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? "nav-active" : ""}`} onClick={() => { if (id === "assistant" && activeView !== "assistant") setAssistantContext(activeView); setActiveView(id); setMobileOpen(false); }}>
              <Icon size={17} strokeWidth={1.85} /><span>{label}</span>
              {id === "leave" && currentUser.role !== "EMPLOYEE" && data.dashboard?.pendingLeaves ? <span className="nav-count">{data.dashboard.pendingLeaves}</span> : null}
              {id === "announcements" && data.notifications.some((item) => !item.read) ? <span className="nav-unread" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><CircleHelp size={16} /></span><strong>Need a hand?</strong><p>Get quick, role-aware help for this workspace.</p><button onClick={() => { setAssistantContext(activeView); setActiveView("assistant"); }}>Open help <span>↗</span></button></div>
          <div className="sidebar-theme-row"><span>Appearance</span><ThemePicker compact /></div>
          <ThemeDescription />
          <div className="side-user">
            <span className="user-avatar">{initials(currentUser.name)}</span>
            <span className="user-meta"><strong>{currentUser.name}</strong><small>{currentUser.email}</small></span>
            <button className="icon-button logout-button" title="Sign out" aria-label="Sign out" onClick={() => { void logOut(); }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{currentLabel}</strong></div>
          <div className="topbar-actions">
            <span className="topbar-date">{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: session.company?.timezone ?? "Asia/Karachi" }).format(new Date())}</span>
            {currentUser.role !== "EMPLOYEE" && <div className="global-search-wrap"><form className="global-search" role="search" onSubmit={(event) => { event.preventDefault(); if (globalSearch.trim()) { setPeopleSearchSeed({ query: globalSearch.trim(), key: Date.now() }); setActiveView("employees"); setQuickResults([]); } }}><Search size={15} /><input aria-label="Search your people directory" placeholder="Search people…" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} /><kbd>↵</kbd></form>{globalSearch.trim().length >= 2 && <div className="global-search-results" aria-label="People search results">{quickSearchBusy ? <div className="quick-search-message">Searching your company directory…</div> : quickResults.length ? quickResults.map((person) => <button key={person.id} type="button" className="quick-result" onClick={() => { setPeopleSearchSeed({ query: person.name, key: Date.now() }); setActiveView("employees"); setGlobalSearch(""); setQuickResults([]); }}><span className="quick-avatar">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.designationName || "Team member"} · {person.departmentName || "Company"}</small></span><ChevronDown size={13} /></button>) : <div className="quick-search-message">No matching people. Press Enter to open the directory.</div>}</div>}</div>}
            <ThemePicker compact />
            <button className="icon-button notification-button" aria-label="Open announcements" onClick={() => setActiveView("announcements")}>
              <Bell size={18} />{data.notifications.some((item) => !item.read) && <span className="notification-ping" />}
            </button>
            <button className="topbar-profile" onClick={() => currentUser.role === "EMPLOYEE" ? setActiveView("profile") : setActiveView("organization")}>
              <span className="user-avatar avatar-small">{initials(currentUser.name)}</span><span>{currentUser.name.split(" ")[0]}</span><ChevronDown size={14} />
            </button>
          </div>
        </header>
        <section className="content-area">
          {refreshing && <div className="sync-indicator" role="status"><span /> Syncing latest records</div>}
          <QuickGuide view={activeView} role={currentUser.role} onAsk={() => { setAssistantContext(activeView); setActiveView("assistant"); }} />
          <PortalView
            view={activeView}
            user={currentUser}
            company={session.company}
            data={data}
            peopleSearchSeed={peopleSearchSeed}
            assistantContext={assistantContext}
            refresh={() => currentUser ? loadData(currentUser.role) : Promise.resolve()}
            notify={setToast}
            goTo={setActiveView}
          />
          <footer className="workspace-footer"><span>People.works <i>·</i> {session.company?.name ?? "Private workspace"}</span><span><ShieldCheck size={13} /> Company-scoped access <i>·</i> Local workspace</span></footer>
        </section>
        <button className="floating-assistant" type="button" aria-label="Ask People.works AI for help about this page" onClick={() => { if (activeView !== "assistant") setAssistantContext(activeView); setActiveView("assistant"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Sparkles size={16} /><span>Ask AI</span></button>
        {toast && <div className="toast-message" role="status"><span className="toast-check">✓</span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={14} /></button></div>}
      </main>
    </div>
  );
}

function QuickGuide({ view, role, onAsk }: { view: ViewId; role: string; onAsk: () => void }) {
  const guide: Record<ViewId, { title: string; detail: string }> = {
    overview: { title: "Quick guide", detail: role === "EMPLOYEE" ? "Use your overview to check this week, your leave balance, and recent team updates." : "Start with today’s people, attendance, and leave indicators; choose a section in the sidebar to take action." },
    organization: { title: "Company setup", detail: "Review your office calendar, departments, designations, and leave policies before adding more people." },
    users: { title: "Account access", detail: "Create HR or Admin logins here. New employee sign-ups stay pending until you add a People profile using the same email." },
    employees: { title: "People directory", detail: "Search by name, email, or employee code. Open a profile to review the details permitted for your role." },
    attendance: { title: "Attendance", detail: role === "EMPLOYEE" ? "Check in when your workday starts and check out when it ends. Use a correction request if a punch needs review." : "Filter the attendance board by date or department, then review pending correction requests." },
    leave: { title: "Leave requests", detail: role === "EMPLOYEE" ? "Choose a leave type, select work dates, and add a short reason. Your request stays pending until HR reviews it." : "Review pending requests, check the dates and reason, then add a short decision note." },
    payroll: { title: "Payroll", detail: role === "HR" ? "Prepare a draft for the period, inspect deductions, and finalize only after review." : role === "ADMIN" ? "Review payroll status and audit history. HR prepares the payroll draft and finalizes it after review." : "Open a finalized payslip to review your own pay details." },
    announcements: { title: "Team updates", detail: role === "EMPLOYEE" ? "Read company updates and follow links for the actions your team shared." : "Publish a clear title and short message; updates appear in the employee workspace and notifications." },
    audit: { title: "Audit trail", detail: "Use this read-only history to review who changed a company record and when." },
    assistant: { title: "Role-aware help", detail: "Ask about this page or your workspace. The assistant uses only data your account can access; it does not capture your computer screen." },
    profile: { title: "Your profile", detail: "Keep your phone and address current. You can edit only your own contact details here." },
  };
  const message = guide[view];
  return <aside className="page-guide" aria-label="Quick instructions"><span className="page-guide-icon"><CircleHelp size={16} /></span><div><strong>{message.title}</strong><p>{message.detail}</p></div><button type="button" onClick={onAsk}>Ask AI about this <span>↗</span></button></aside>;
}

function roleName(role: string) {
  return role === "ADMIN" ? "Admin" : role === "HR" ? "People team" : "Employee";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
