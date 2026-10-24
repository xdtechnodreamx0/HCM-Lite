"use client";

import { useState, type FormEvent } from "react";
import { Bell, FileClock, Megaphone, Plus, ShieldCheck } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { AnnouncementRecord, NotificationRecord, SessionPayload } from "@/lib/domain-types";
import { apiMessage } from "@/lib/errors";
import { EmptyState, FormError, PageHeading, Panel, PrimaryButton, StatusPill, formatDate } from "@/features/app/components/ui";

export function AnnouncementsView({ announcements, notifications, role, refresh, notify }: {
  announcements: AnnouncementRecord[];
  notifications: NotificationRecord[];
  role: NonNullable<SessionPayload["user"]>["role"];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const canPost = role === "ADMIN" || role === "HR";
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/announcements", { method: "POST", body: jsonBody({ title: String(values.get("title")), body: String(values.get("body")) }) });
      event.currentTarget.reset(); setShowForm(false); await refresh(); notify("Announcement published to your company.");
    } catch (reason) { setError(apiMessage(reason)); }
    finally { setSaving(false); }
  }
  async function markRead(item: NotificationRecord) {
    if (item.read) return;
    try { await apiRequest(`/api/notifications/${item.id}/read`, { method: "PATCH" }); await refresh(); }
    catch (reason) { setError(apiMessage(reason)); }
  }
  return <>
    <PageHeading eyebrow="KEEP IN THE LOOP" title="Announcements" description="Company updates and the notifications that matter to you." action={canPost && <button className="button button-primary" onClick={() => setShowForm((value) => !value)}><Plus size={15} /> New announcement</button>} />
    {showForm && canPost && <Panel title="Write an update" subtitle="Keep it useful, warm and easy to act on."><form className="form-stack announcement-form" onSubmit={publish}><label className="field-label">Headline<input required name="title" minLength={3} maxLength={100} placeholder="What’s happening?" /></label><label className="field-label">Message<textarea required name="body" minLength={5} maxLength={1200} rows={4} placeholder="Share a clear update with your team." /></label><FormError>{error}</FormError><PrimaryButton disabled={saving}>{saving ? "Publishing…" : "Publish announcement"}<Megaphone size={15} /></PrimaryButton></form></Panel>}
    <div className="module-grid comms-grid">
      <Panel title="Company updates" subtitle="Visible to everyone in this workspace." className="span-two">
        {announcements.length ? <div className="announcement-feed">{announcements.map((item) => <article className="announcement-card" key={item.id}><span className="announcement-mark"><Megaphone size={16} /></span><div><div className="announcement-head"><h3>{item.title}</h3><time>{formatDate(item.createdAt)}</time></div><p>{item.body}</p><small>Posted by {item.authorName || "Your people team"}</small></div></article>)}</div> : <EmptyState title="No announcements yet" description={canPost ? "Share your first company update with the team." : "Updates from your Admin or HR team will appear here."} icon={Megaphone} />}
      </Panel>
      <Panel title="Your notifications" subtitle="Private to your account." className="span-two">
        {notifications.length ? <div className="notification-list">{notifications.map((item) => <article className={`notification-row ${item.read ? "notification-read" : ""}`} key={item.id}><span className="notification-icon"><Bell size={16} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.createdAt)}</small></div>{item.read ? <StatusPill value="Read" /> : <button className="button button-quiet button-small" onClick={() => void markRead(item)}>Mark read</button>}</article>)}</div> : <EmptyState title="You’re all caught up" description="Leave decisions, payroll notices and team updates will show up here." icon={Bell} />}
      </Panel>
    </div>
  </>;
}

export function AuditView({ rows }: { rows: Array<Record<string, unknown>> }) {
  return <>
    <PageHeading eyebrow="TRUST & ACCOUNTABILITY" title="Audit trail" description="A read-only record of important changes across your company." action={<span className="role-view-chip"><ShieldCheck size={14} />Admin only · append-only</span>} />
    <Panel title="Recent activity" subtitle="Newest actions appear first. This history cannot be edited from the app." className="audit-panel">
      {rows.length ? <div className="audit-list">{rows.map((row) => <article className="audit-row" key={String(row.id)}><span className="audit-icon"><FileClock size={16} /></span><div className="audit-main"><strong>{String(row.action).replaceAll(".", " ")}</strong><p>{String(row.entity)}{row.entityId ? ` · ${String(row.entityId)}` : ""}</p><small>{String(row.actorEmail)} · {String(row.actorRole)}</small></div><time>{formatDate(String(row.createdAt), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time><details className="audit-details"><summary>Change details</summary><pre>{JSON.stringify({ before: row.before ?? null, after: row.after ?? null }, null, 2)}</pre></details></article>)}</div> : <EmptyState title="No audited changes yet" description="New account, attendance, leave and payroll actions will be recorded here." icon={FileClock} />}
    </Panel>
  </>;
}
