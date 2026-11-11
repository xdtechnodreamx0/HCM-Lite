import Link from "next/link";
import {
  ArrowUpRight, Building2, HeartHandshake, LockKeyhole, ShieldCheck, Sparkles,
} from "lucide-react";

const repository = "https://github.com/xdtechnodreamx0/HCM-Lite";

type FooterVariant = "public" | "auth" | "workspace";

export function SiteFooter({ variant = "public", companyName, note }: {
  variant?: FooterVariant;
  companyName?: string | null;
  note?: string;
}) {
  return (
    <footer className={`site-footer site-footer-${variant}`} aria-label="Site footer">
      <div className="site-footer-glow" aria-hidden="true" />
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="footer-brand">
            <span className="brand-mark"><Building2 size={18} strokeWidth={2.2} /></span>
            <span>people<span className="brand-dot">.</span>works</span>
          </Link>
          <p>Calm, accountable people operations — from the first check-in to the final payslip.</p>
          <div className="footer-trust">
            <span><ShieldCheck size={13} /> Role-scoped by design</span>
            <span><LockKeyhole size={13} /> Server-verified actions</span>
          </div>
        </div>

        <nav className="site-footer-columns" aria-label="Footer navigation">
          <div className="site-footer-column">
            <h3>Workspace</h3>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Request employee access</Link>
            <Link href="/demo">Guest dashboard</Link>
            <Link href="/forgot-password">Reset password</Link>
          </div>
          <div className="site-footer-column">
            <h3>Explore</h3>
            <Link href="/demo">Guest dashboard</Link>
            <Link href="/verify-email">Email verification</Link>
            <a href={`${repository}/blob/main/README.md#main-workflows`} target="_blank" rel="noreferrer">Main workflows <ArrowUpRight size={12} /></a>
            <a href={`${repository}/blob/main/docs/DEMO_RUNBOOK.md`} target="_blank" rel="noreferrer">Demo runbook <ArrowUpRight size={12} /></a>
          </div>
          <div className="site-footer-column">
            <h3>Project &amp; trust</h3>
            <a href={repository} target="_blank" rel="noreferrer">Source code <ArrowUpRight size={12} /></a>
            <a href={`${repository}/blob/main/docs/BUILD_STATUS.md`} target="_blank" rel="noreferrer">Build status <ArrowUpRight size={12} /></a>
            <a href={`${repository}/blob/main/docs/API_CONTRACT.md`} target="_blank" rel="noreferrer">API contract <ArrowUpRight size={12} /></a>
            <a href={`${repository}/blob/main/README.md#security-notes`} target="_blank" rel="noreferrer">Security notes <ArrowUpRight size={12} /></a>
          </div>
        </nav>
      </div>

      {note && <p className="site-footer-note">{note}</p>}

      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} People.works · HCM Lite{companyName ? ` · ${companyName}` : ""}</span>
        <span className="site-footer-signoff">
          <HeartHandshake size={13} /> Built for people-first teams
          <i aria-hidden="true">·</i>
          <Sparkles size={13} /> Private by default
        </span>
      </div>
    </footer>
  );
}
