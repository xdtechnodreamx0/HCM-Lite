"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { apiMessage } from "@/lib/errors";
import { FormError } from "@/features/app/components/ui";

export function ChangePasswordDialog({ open, onClose, notify }: {
  open: boolean;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function close() {
    if (busy) return;
    setCurrentPassword(""); setNewPassword(""); setConfirmed(""); setError("");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmed) { setError("The new passwords do not match."); return; }
    if (newPassword.length < 10) { setError("Choose a new password of at least 10 characters."); return; }
    setBusy(true);
    try {
      await apiRequest("/api/auth/password", { method: "POST", body: jsonBody({ currentPassword, newPassword }) });
      notify("Password updated. Other active sessions have been signed out.");
      setCurrentPassword(""); setNewPassword(""); setConfirmed("");
      onClose();
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="form-modal password-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <button className="icon-button modal-close" aria-label="Close password dialog" onClick={close}><X size={17} /></button>
        <span className="icon-well"><KeyRound size={21} /></span>
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h2 id="change-password-title">Change your password</h2>
        <p>Confirm your current password, then choose a new one. Other devices will need to sign in again.</p>
        <form className="form-stack" onSubmit={submit}>
          <label className="field-label">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label className="field-label">New password<input required type="password" minLength={10} maxLength={100} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><span className="field-hint">At least 10 characters. Do not reuse an old password.</span></label>
          <label className="field-label">Confirm new password<input required type="password" minLength={10} maxLength={100} autoComplete="new-password" value={confirmed} onChange={(event) => setConfirmed(event.target.value)} /></label>
          <FormError>{error}</FormError>
          <div className="form-actions">
            <button className="button button-secondary" type="button" onClick={close} disabled={busy}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
          </div>
        </form>
        <p className="auth-security-note"><ShieldCheck size={14} /> Password changes are written to the company audit trail.</p>
      </section>
    </div>
  );
}
