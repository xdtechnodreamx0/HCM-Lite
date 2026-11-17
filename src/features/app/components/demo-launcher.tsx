"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, LoaderCircle, Sparkles, UserRoundCheck } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { apiMessage } from "@/lib/errors";

type DemoAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  department: string;
  portal: string;
};

type DemoAccounts = {
  enabled: boolean;
  company?: { id: string; name: string } | null;
  accounts: DemoAccount[];
};

type SampleAccount = DemoAccount & {
  code: string;
  joined: string;
};

const roleLabel: Record<string, string> = { ADMIN: "Admin", HR: "HR", EMPLOYEE: "Staff" };

// Read-only roster for deployments without demo mode. Keep in sync with scripts/seed-demo.mjs.
const sampleAccounts: SampleAccount[] = [
  {
    id: "sample_admin",
    name: "Nadia Rahman",
    email: "admin@northstar.demo",
    role: "ADMIN",
    title: "Managing Partner",
    department: "People & Operations",
    portal: "Company administration · payroll approvals · workspace settings",
    code: "EMP-1000",
    joined: "Jan 2020",
  },
  {
    id: "sample_hr",
    name: "Iqra Javed",
    email: "hr@northstar.demo",
    role: "HR",
    title: "People Partner",
    department: "People & Operations",
    portal: "People operations · leave decisions · onboarding",
    code: "EMP-1011",
    joined: "Jul 2023",
  },
  {
    id: "sample_employee",
    name: "Sana Malik",
    email: "employee@northstar.demo",
    role: "EMPLOYEE",
    title: "Team Lead",
    department: "Product & Engineering",
    portal: "Personal workspace · attendance · leave · payslips",
    code: "EMP-1003",
    joined: "Jun 2021",
  },
  {
    id: "sample_taimur",
    name: "Taimur Raza",
    email: "taimur@northstar.demo",
    role: "EMPLOYEE",
    title: "Software Engineer",
    department: "Product & Engineering",
    portal: "Personal workspace · attendance · leave · payslips",
    code: "EMP-1004",
    joined: "Feb 2024",
  },
  {
    id: "sample_sarmad",
    name: "Sarmad Baig",
    email: "sarmad@northstar.demo",
    role: "EMPLOYEE",
    title: "Finance Analyst",
    department: "Finance",
    portal: "Personal workspace · attendance · leave · payslips",
    code: "EMP-1014",
    joined: "May 2022",
  },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("");
}

export function DemoLauncher() {
  const router = useRouter();
  const [data, setData] = useState<DemoAccounts | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<DemoAccounts>("/api/demo/accounts")
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(apiMessage(reason)); })
      .finally(() => { if (active) setData((current) => current ?? { enabled: false, accounts: [] }); });
    return () => { active = false; };
  }, []);

  async function openPortal(account: DemoAccount) {
    setBusy(account.id);
    setError("");
    try {
      await apiRequest("/api/auth/demo-login", { method: "POST", body: jsonBody({ accountId: account.id }) });
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(apiMessage(reason));
      setBusy("");
    }
  }

  if (!data) {
    return <div className="demo-launcher-state"><LoaderCircle size={18} className="spin" /><span>Loading the demo team…</span></div>;
  }

  if (!data.enabled) {
    return <div className="demo-launcher demo-launcher-sample" id="live-portals">
      <div className="demo-launcher-head">
        <span><Sparkles size={14} /> SAMPLE ACCOUNTS · READ ONLY</span>
        <small>Northstar Studio · fictional team</small>
      </div>
      <div className="demo-launcher-grid">
        {sampleAccounts.map((account) => <article key={account.id} className="demo-launcher-card">
          <span className="demo-launcher-avatar">{initials(account.name)}</span>
          <span className="demo-launcher-role">{roleLabel[account.role] ?? account.role}</span>
          <strong>{account.name}</strong>
          <small>{account.title} · {account.department}</small>
          <span className="demo-launcher-meta">{account.code} · Joined {account.joined}</span>
          <span className="demo-launcher-email">{account.email}</span>
          <p>{account.portal}</p>
          <span className="demo-launcher-sample-tag"><UserRoundCheck size={12} /> Sample persona</span>
        </article>)}
      </div>
      <div className="demo-launcher-foot"><span><UserRoundCheck size={14} /> These people, emails, and records are invented for the sample workspace. One-click live portals run only on the demo deployment; production workspaces stay clean for real teams.</span></div>
      {error && <div className="inline-alert error-alert demo-launcher-error" role="alert">{error}</div>}
    </div>;
  }

  if (!data.accounts.length) {
    return <div className="demo-launcher-unavailable">
      <span className="demo-launcher-icon"><CircleAlert size={19} /></span>
      <div><strong>The demo workspace has no live accounts yet.</strong><p>Seed the demo database with the demo personas, then refresh this page.</p></div>
      <Link href="/login">Staff sign in <ArrowRight size={14} /></Link>
    </div>;
  }

  return <div className="demo-launcher" id="live-portals">
    <div className="demo-launcher-head">
      <span><Sparkles size={14} /> ONE CLICK · LIVE DEMO WORKSPACE</span>
      <small>{data.company?.name ?? "Northstar Studio"} · no password needed</small>
    </div>
    <div className="demo-launcher-grid">
      {data.accounts.map((account) => <article key={account.id} className="demo-launcher-card">
        <span className="demo-launcher-avatar">{initials(account.name)}</span>
        <span className="demo-launcher-role">{roleLabel[account.role] ?? account.role}</span>
        <strong>{account.name}</strong>
        <small>{account.title}{account.department ? ` · ${account.department}` : ""}</small>
        <p>{account.portal}</p>
        <button className="button button-primary button-small" type="button" disabled={Boolean(busy)} onClick={() => void openPortal(account)}>
          {busy === account.id ? <><LoaderCircle size={14} className="spin" /> Opening…</> : <>Open live portal <ArrowRight size={14} /></>}
        </button>
      </article>)}
    </div>
    <div className="demo-launcher-foot"><span><UserRoundCheck size={14} /> Demo accounts are seeded and marked `demoAccount`; real customers never get one-click access.</span></div>
    {error && <div className="inline-alert error-alert demo-launcher-error" role="alert">{error}</div>}
  </div>;
}
