import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";
import { getEmailProvider } from "@/lib/env";
import { collections } from "@/server/db/collections";
import { hashPassword } from "@/server/auth/passwords";
import { rateLimit } from "@/server/security/rate-limit";
import { writeAudit } from "@/server/services/audit.service";

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

async function sendVerificationEmail(input: { email: string; name: string; company: string; token: string }) {
  const provider = getEmailProvider();
  if (!provider) return false;
  const link = `${provider.baseUrl.replace(/\/$/, "")}/?verify=${encodeURIComponent(input.token)}`;
  const name = escapeHtml(input.name);
  const company = escapeHtml(input.company);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f4;font-family:Arial,sans-serif;color:#26342c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 12px"><tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e3ebe4;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 34px;background:#1d4438;color:#fff;font-size:18px;font-weight:bold">people<span style="color:#83c292">.</span>works</td></tr><tr><td style="padding:34px"><p style="margin:0 0 8px;color:#688271;font-size:11px;letter-spacing:2px">VERIFY YOUR WORK EMAIL</p><h1 style="margin:0 0 14px;font-size:25px;line-height:1.25">Confirm your email, ${name}.</h1><p style="margin:0 0 24px;color:#64736a;font-size:15px;line-height:1.7">Confirm this email address for your People.works account at <strong>${company}</strong>. If your company is reviewing a new employee request, an Admin or HR teammate must also link your employee profile before you can sign in.</p><p style="margin:0 0 25px"><a href="${link}" style="display:inline-block;padding:13px 19px;border-radius:9px;background:#327a5b;color:#fff;text-decoration:none;font-weight:bold">Verify email address</a></p><p style="margin:0;color:#7b8980;font-size:12px;line-height:1.7">This link expires in 30 minutes. If you did not expect this message, you can ignore it.</p><p style="margin:22px 0 0;color:#9aa59d;font-size:11px;line-height:1.7;word-break:break-all">Button not working? Copy this link:<br>${link}</p></td></tr></table><p style="color:#9aa59d;font-size:11px">A secure message from People.works</p></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: provider.from, to: [input.email], subject: `Verify your People.works email`, html, text: `Hi ${input.name},\n\nConfirm this email to activate your People.works login for ${input.company}: ${link}\n\nAfter confirming, sign in with the password you created or the temporary password your team shared with you. This link expires in 30 minutes.` }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (!response?.ok) {
    console.error("Verification email could not be delivered by the configured provider.");
    throw new AppError(502, "We could not send the verification email. Check your email provider settings and try again.", "EMAIL_DELIVERY_FAILED");
  }
  return true;
}

async function sendPasswordResetEmail(input: { email: string; name: string; company: string; token: string }) {
  const provider = getEmailProvider();
  if (!provider) return false;
  const link = `${provider.baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(input.token)}`;
  const name = escapeHtml(input.name);
  const company = escapeHtml(input.company);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f4;font-family:Arial,sans-serif;color:#26342c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 12px"><tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e3ebe4;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 34px;background:#1d4438;color:#fff;font-size:18px;font-weight:bold">people<span style="color:#83c292">.</span>works</td></tr><tr><td style="padding:34px"><p style="margin:0 0 8px;color:#688271;font-size:11px;letter-spacing:2px">PASSWORD RESET</p><h1 style="margin:0 0 14px;font-size:25px;line-height:1.25">Choose a new password, ${name}.</h1><p style="margin:0 0 24px;color:#64736a;font-size:15px;line-height:1.7">A password reset was requested for your People.works account at <strong>${company}</strong>. Use the secure button below to choose a new password.</p><p style="margin:0 0 25px"><a href="${link}" style="display:inline-block;padding:13px 19px;border-radius:9px;background:#327a5b;color:#fff;text-decoration:none;font-weight:bold">Reset password</a></p><p style="margin:0;color:#7b8980;font-size:12px;line-height:1.7">This single-use link expires in 30 minutes. If you did not request a reset, ignore this message; your current password remains unchanged.</p><p style="margin:22px 0 0;color:#9aa59d;font-size:11px;line-height:1.7;word-break:break-all">Button not working? Copy this link:<br>${link}</p></td></tr></table><p style="color:#9aa59d;font-size:11px">A secure message from People.works</p></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: provider.from, to: [input.email], subject: "Reset your People.works password", html, text: `Hi ${input.name},\n\nReset your People.works password for ${input.company}: ${link}\n\nThis single-use link expires in 30 minutes. If you did not request a reset, ignore this email.` }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (!response?.ok) {
    console.error("Password reset email could not be delivered by the configured provider.");
    throw new AppError(502, "We could not send the password reset email. Check your email provider settings and try again.", "EMAIL_DELIVERY_FAILED");
  }
  return true;
}

export async function issuePasswordResetEmail(user: { id: string; companyId: string; email: string; name: string; company: string }) {
  if (!getEmailProvider()) return false;
  await rateLimit(`password-reset:send:${user.id}`, 3, 60 * 60 * 1000);
  const token = randomBytes(32).toString("base64url");
  const db = await collections();
  const tokenHash = hashToken(token);
  await db.users.updateOne({ id: user.id, companyId: user.companyId, active: true }, { $set: {
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
  } });
  try {
    await sendPasswordResetEmail({ ...user, token });
  } catch (error) {
    await db.users.updateOne({ id: user.id, companyId: user.companyId, passwordResetTokenHash: tokenHash }, { $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" } });
    throw error;
  }
  return true;
}

export async function requestPasswordReset(email: string, ip: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = createHash("sha256").update(normalizedEmail).digest("hex");
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  await Promise.all([
    rateLimit(`password-reset:email:${emailHash}`, 4, 60 * 60 * 1000),
    rateLimit(`password-reset:ip:${ipHash}`, 15, 60 * 60 * 1000),
  ]);
  const provider = getEmailProvider();
  const db = await collections();
  const user = provider ? await db.users.findOne({ email: normalizedEmail, active: true }) : null;
  if (user && !(user.emailVerificationRequired && !user.emailVerifiedAt)) {
    const company = await db.companies.findOne({ id: user.companyId }, { projection: { name: 1 } });
    await issuePasswordResetEmail({ id: user.id, companyId: user.companyId, email: user.email, name: user.name, company: String(company?.name ?? "your company") });
  }
  return { accepted: true, emailConfigured: Boolean(provider) };
}

export async function completePasswordReset(token: string, nextPassword: string, ip: string) {
  if (token.length < 24 || token.length > 200) throw new AppError(400, "This password reset link is invalid or has expired.", "PASSWORD_RESET_LINK_INVALID");
  if (nextPassword.length < 10 || nextPassword.length > 100) throw new AppError(422, "Choose a password between 10 and 100 characters.");
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  await rateLimit(`password-reset:complete:${ipHash}`, 10, 60 * 60 * 1000);
  const db = await collections();
  const tokenHash = hashToken(token);
  const user = await db.users.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, active: true });
  if (!user) throw new AppError(400, "This password reset link is invalid or has expired.", "PASSWORD_RESET_LINK_INVALID");
  const result = await db.users.updateOne(
    { id: user.id, companyId: user.companyId, passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } },
    { $set: { passwordHash: await hashPassword(nextPassword), forcePasswordChange: false, sessionVersion: Number(user.sessionVersion ?? 0) + 1, passwordChangedAt: new Date() }, $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" } },
  );
  if (result.modifiedCount !== 1) throw new AppError(400, "This password reset link is invalid or has expired.", "PASSWORD_RESET_LINK_INVALID");
  await writeAudit({ companyId: String(user.companyId), action: "user.password.reset", entity: "user", entityId: String(user.id) });
  return { reset: true };
}

export async function issueEmailVerification(user: { id: string; companyId: string; email: string; name: string; company: string }) {
  if (!getEmailProvider()) return false;
  const token = randomBytes(32).toString("base64url");
  const db = await collections();
  await db.users.updateOne({ id: user.id, companyId: user.companyId }, { $set: {
    emailVerificationRequired: true,
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
  } });
  await sendVerificationEmail({ ...user, token });
  return true;
}

export async function verifyEmailToken(token: string) {
  if (token.length < 24 || token.length > 200) throw new AppError(400, "This verification link is invalid or has expired.", "VERIFICATION_LINK_INVALID");
  const db = await collections();
  const user = await db.users.findOne({
    emailVerificationRequired: true,
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpiresAt: { $gt: new Date() },
  });
  if (!user) throw new AppError(400, "This verification link is invalid or has expired.", "VERIFICATION_LINK_INVALID");
  await db.users.updateOne({ id: user.id, companyId: user.companyId }, { $set: { emailVerifiedAt: new Date() }, $unset: { emailVerificationTokenHash: "", emailVerificationExpiresAt: "" } });
  return { verified: true };
}

export async function resendEmailVerification(email: string, ip: string) {
  const db = await collections();
  const emailHash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  const { rateLimit } = await import("@/server/security/rate-limit");
  await Promise.all([rateLimit(`verify:email:${emailHash}`, 4, 60 * 60 * 1000), rateLimit(`verify:ip:${ipHash}`, 20, 60 * 60 * 1000)]);
  const user = await db.users.findOne({ email: email.trim().toLowerCase(), emailVerificationRequired: true, emailVerifiedAt: { $exists: false } });
  if (!user) return { accepted: true };
  const company = await db.companies.findOne({ id: user.companyId }, { projection: { name: 1 } });
  await issueEmailVerification({ id: user.id, companyId: user.companyId, email: user.email, name: user.name, company: String(company?.name ?? "your company") });
  return { accepted: true };
}
