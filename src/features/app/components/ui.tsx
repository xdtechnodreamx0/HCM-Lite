import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Inbox } from "lucide-react";
import { formatPkr } from "@/lib/currency";

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = "", title, subtitle, action }: {
  children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode;
}) {
  return <section className={`panel ${className}`}>
    {(title || subtitle || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
    {children}
  </section>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: {
  title: string; description: string; icon?: LucideIcon; action?: ReactNode;
}) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={19} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function StatusPill({ value }: { value: string }) {
  const key = value.toLowerCase().replaceAll(" ", "_");
  return <span className={`status-pill status-${key}`}><span className="status-dot" />{value.replaceAll("_", " ")}</span>;
}

export function PrimaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button button-primary ${className}`} {...props}>{children}</button>;
}

export function SecondaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button button-secondary ${className}`} {...props}>{children}</button>;
}

export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
}

export function FormError({ children }: { children?: ReactNode }) {
  return children ? <div className="inline-alert error-alert" role="alert">{children}</div> : null;
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  return children ? <div className="inline-alert success-alert" role="status">{children}</div> : null;
}

export function MetricCard({ label, value, note, icon: Icon, tone = "" }: {
  label: string; value: string | number; note: string; icon?: LucideIcon; tone?: string;
}) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span>{Icon && <span className="metric-icon"><Icon size={17} /></span>}</div><strong>{value}</strong><small>{note}</small></article>;
}

export function TableEmpty({ columns, title = "Nothing to show yet", message = "New records will appear here when your team starts using this workspace." }: {
  columns: number; title?: string; message?: string;
}) {
  return <tr><td colSpan={columns}><EmptyState title={title} description={message} /></td></tr>;
}

export function Monogram({ name, className = "" }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return <span className={`person-monogram ${className}`}>{initials || "—"}</span>;
}

export function formatMoney(paisa: number | null | undefined) {
  return typeof paisa === "number" && Number.isFinite(paisa) ? formatPkr(paisa) : "—";
}

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", options).format(date);
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ProgressBar({ value, maximum, label }: { value: number; maximum: number; label: string }) {
  const percentage = maximum > 0 ? Math.min(100, Math.max(0, (value / maximum) * 100)) : 0;
  return <div className="progress-row"><div><span>{label}</span><strong>{value} / {maximum}</strong></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={value}><span style={{ width: `${percentage}%` }} /></div></div>;
}

export function RowLink({ children }: { children: ReactNode }) {
  return <span className="row-link">{children}<ArrowUpRight size={13} /></span>;
}
