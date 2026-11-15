# Vercel deployment

The source is in the [public GitHub repository](https://github.com/xdtechnodreamx0/HCM-Lite). Release commits `695ec75` and `52e9157` passed GitHub Actions CI runs `43852151391` and `43852571516` (install, lint, typecheck, 68 tests, build). Vercel deployed `52e9157` Ready as `dpl_AFY1DTxhQuAVWzVGfQPWrBvWKc5X`; the production alias `https://hcmlite-beta.vercel.app` later advanced through docs-only commits with no runtime change.

A provider status confirms the deployment job finished; it does not confirm that the production database, sign-in, email, or AI integrations work. The 2026-11-16 release checks below covered the public boundary. Production SMTP delivery was separately verified by requesting a password reset for the workspace Admin and confirming the message arrived from the configured Gmail sender; completing that reset is still pending the owner's action. The authenticated demo sweep and payroll/payslip checks ran on an SSO-protected production-target deployment pointed at the isolated `hcm_lite_demo` database; that temporary deployment was removed after verification.

## Release verification (2026-11-16)

- `https://hcmlite-beta.vercel.app/api/health` returned `200 {"status":"ok"}`.
- `/api/session` returned `initialized:true`, `demoMode:false`, `emailConfigured:true`, and no signed-in user.
- Nine public pages returned 200: `/`, `/login`, `/demo`, `/signup`, `/signup/company`, `/forgot-password`, invalid reset link, invalid verification link, and `/customer`.
- Seven unauthenticated staff APIs returned 401, including `/api/payroll/2026-10/payslip` (401 rather than 500, proving the function bundle and `pdf-lib` import load).
- A cross-site login returned 403 `Invalid request origin.` and a missing origin returned 403 `Request origin is required.`
- Invalid reset and verification tokens returned the specific 400 messages for an expired link.
- `/api/demo/accounts` returned `enabled:false`.
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(self), microphone=()`, `Cross-Origin-Opener-Policy: same-origin`, and HSTS. CSP is still not set.
- Vercel's runtime-error query reported no runtime errors in the selected window. Hobby-plan runtime log retention did not return per-request function lines.

## Required Vercel variables

In Vercel, open the `hcm_lite` project's **Settings -> Environment Variables**. Add these values for **Production** (and Preview if you want preview deployments to use a separate database):

| Name | Value |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection URI; keep it secret. |
| `SESSION_SECRET` | A fresh random secret of at least 32 characters. |
| `APP_BASE_URL` | Public HTTPS origin used for links in verification/reset emails, with no trailing path. Same-origin API checks also accept the request's actual forwarded host, so a stale value no longer blocks setup or sign-in. |
| `MONGODB_DB` | Optional; defaults to `hcm_lite`. Use a dedicated database name. |
| `GEMINI_API_KEY` | Optional; required for AI answers. Keep it server-side. |
| `GEMINI_MODEL` | Optional; defaults to `gemini-flash-lite-latest`. It falls back through `gemini-3-flash-preview`, `gemini-3.5-flash-lite`, and `gemini-3.5-flash` when a model is retired, overloaded, or out of its per-model daily free quota. |
| `EMAIL_PROVIDER` | Optional; `smtp` or `resend`. When omitted, SMTP is used if fully configured; otherwise Resend is used. |
| `SMTP_HOST` | Optional; SMTP server, for example `smtp.gmail.com`. |
| `SMTP_PORT` | Optional; defaults to `465`. Use `587` with `SMTP_SECURE=false` for STARTTLS. |
| `SMTP_SECURE` | Optional; defaults to true when the port is `465`. |
| `SMTP_USER` | Optional; SMTP username. For Gmail, use the full Gmail address. |
| `SMTP_PASS` | Optional; SMTP password or app password. Keep it secret. |
| `EMAIL_FROM` | Required with either email provider; for SMTP use a sender such as `HCM Lite <you@gmail.com>`. |
| `RESEND_API_KEY` | Optional; requires a verified Resend sending domain for arbitrary recipients. |

To generate a session secret locally in PowerShell, run:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Never paste a database URI, API key, or session secret into GitHub, source files, or a chat. When changing environment variables, trigger a new deployment so the running functions receive them.

If a first-run or sign-in request returns `403 Invalid request origin.`, confirm the public alias is serving the latest deployment. The server compares the browser's `Origin` header with the request's forwarded host and with `APP_BASE_URL`; a stale `http://localhost:3000` value can block every production mutation until the latest build is promoted.

## Verify the published app

1. In Vercel, open the latest deployment and click **Visit** to get the shareable URL.
2. Open `https://YOUR-VERCEL-DOMAIN/api/health`. It should return `{"status":"ok"}`; a failure means the production database connection or required settings still need attention.
3. Open the site and complete the first Admin setup only if the production database is empty. Do not use the demo password or rerun setup against a database that already has company data.
4. Sign in, then check the AI panel. It needs `GEMINI_API_KEY`; the app reports its disabled state when no key is configured.
5. Create an HR login and link it to a staff profile in **User access** if HR should use its own check-in, leave, and payslip. Confirm the employee directory stays read-only for Admin and manageable for HR. Admin-created staff logins receive a one-time temporary password and do not depend on email delivery.
6. If geofenced check-in is required, set office latitude/longitude and a radius in **Organization**. Check-in will then request browser location; the server decides using the Haversine distance and GPS accuracy. The demo company intentionally leaves these coordinates unset.
7. Signup verification and password-reset emails work through SMTP when `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` are set. Until a provider is fully configured, the app does not claim that an email was sent. Resend remains an alternative once a sending domain is verified.

## Database and demo safety

- Use a dedicated production database user with only the permissions the app needs. Configure Atlas network access with a supported, restricted egress setup; do not expose the database broadly.
- Keep local fictional demo accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, `taimur@northstar.demo`, `sarmad@northstar.demo`, password `12345`) on the loopback-only demo service. Never load them into a public production database.
- The demo HR account is linked to the fictional Iqra Javed staff profile and has a seeded pending self-request for Admin review. This demonstrates HR self-service and segregation of duties; do not copy that stance to production without a deliberate policy decision.
- The demo launcher (`/demo`), one-click login, and the seeded customer portal are gated by `DEMO_MODE=true` and seeded demo accounts. Outside demo mode, `/customer` serves a fixed fictional Northstar Studio snapshot so the public customer experience still works without exposing a database. Treat the seeded demo as an explicitly fake workspace; never load its accounts into a public production database.
- Demo verification can use a production-target deployment with `--skip-domain`, `DEMO_MODE=true`, and `MONGODB_DB=hcm_lite_demo`. It must stay behind SSO deployment protection, must never receive the production alias, and should be removed after verification. Never point a demo deployment at the production database.
- Use a separate empty database for previews and manual setup checks. Do not reset or seed a database containing real records.
- Rotate database, session, Gemini, and Resend secrets through their providers if exposed. Changing `SESSION_SECRET` signs out existing users.
- Review database backup/restore support and external AI quotas before relying on those services.

## Local production container

The multi-stage `Dockerfile` builds Next.js standalone output and runs as an unprivileged user on port 3000. Docker Compose binds the app and MongoDB ports to loopback. The demo profile blanks all email-provider variables so a local demo never claims email was sent. For local startup and the isolated demo, follow the commands in the [README](../README.md).
