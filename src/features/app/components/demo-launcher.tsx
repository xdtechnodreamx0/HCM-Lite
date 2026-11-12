"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, LoaderCircle, Sparkles, UserRoundCheck, UsersRound } from "lucide-react";
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

const roleLabel: Record<string, string> = { ADMIN: "Admin", HR: "HR", EMPLOYEE: "Staff" };

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
    return <div className="demo-launcher-state"><LoaderCircle size={18} className="spin" /><span>Loading the live demo roles…</span></div>;
  }

  if (!data.enabled) {
    return <div className="demo-launcher-unavailable">
      <span className="demo-launcher-icon"><UsersRound size={19} /></span>
      <div><strong>Live role portals are not enabled here.</strong><p>This deployment shows the read-only guest dashboard. On the demo deployment, one-click Admin, HR, and Employee portals appear here.</p></div>
      <Link href="/login">Sign in instead <ArrowRight size={14} /></Link>
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
        <span className="demo-launcher-avatar">{account.name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("")}</span>
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
