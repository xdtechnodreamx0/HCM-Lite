# Vercel deployment

The source is in the [public GitHub repository](https://github.com/xdtechnodreamx0/HCM-Lite). Code commit `8b1799a` passed GitHub Actions CI run `43022180849` (install, lint, typecheck, tests, build), and Vercel deployed it to the production alias. A provider status confirms the deployment job finished; it does not confirm that the production database, sign-in, email, or AI integrations work. Verify those at the current Vercel project URL.

## Required Vercel variables

In Vercel, open the `hcm_lite` project’s **Settings → Environment Variables**. Add these values for **Production** (and Preview if you want preview deployments to use a separate database):

| Name | Value |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection URI; keep it secret. |
| `SESSION_SECRET` | A fresh random secret of at least 32 characters. |
| `APP_BASE_URL` | Public HTTPS origin used for links in verification/reset emails, with no trailing path. Same-origin API checks also accept the request's actual forwarded host, so a stale value no longer blocks setup or sign-in. |
| `MONGODB_DB` | Optional; defaults to `hcm_lite`. Use a dedicated database name. |
| `GEMINI_API_KEY` | Optional; required for AI answers. Keep it server-side. |
| `GEMINI_MODEL` | Optional; defaults to the `gemini-2.5-flash` free tier, with `gemini-2.0-flash` and `gemini-1.5-flash` fallbacks if that model is unavailable for the key. |
| `RESEND_API_KEY` | Optional; required for real verification and reset emails. |
| `EMAIL_FROM` | Optional with Resend; a sender on a domain verified with Resend. Configure it together with `RESEND_API_KEY`. |

To generate a session secret locally in PowerShell, run:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Never paste a database URI, API key, or session secret into GitHub, source files, or a chat. When changing environment variables, trigger a new deployment so the running functions receive them.

If a first-run or sign-in request returns `403 Invalid request origin.`, confirm the public alias is serving the latest deployment. The server compares the browser's `Origin` header with the request's forwarded host and with `APP_BASE_URL`; a deployment that predates that behavior only checked `APP_BASE_URL`, so a stale `http://localhost:3000` value blocked every production mutation. Promoting the latest `main` build fixes it even before the environment variable is corrected.

## Verify the published app

1. In Vercel, open the latest deployment and click **Visit** to get the shareable URL.
2. Open `https://YOUR-VERCEL-DOMAIN/api/health`. It should return `{"status":"ok"}`; a failure means the production database connection or required settings still need attention.
3. Open the site and complete the first Admin setup only if the production database is empty. Do not use the demo password or rerun setup against a database that already has company data.
4. Sign in, then check the AI panel. It needs `GEMINI_API_KEY`; the app reports its disabled state when no key is configured.
5. Create an HR login and link it to a staff profile in **User access** if HR should use its own check-in, leave, and payslip. Confirm the employee directory stays read-only for Admin and manageable for HR.
6. If geofenced check-in is required, set office latitude/longitude and a radius in **Organization**. Check-in will then request browser location; the server decides using the Haversine distance and GPS accuracy. The demo company intentionally leaves these coordinates unset.
7. Signup verification and password-reset emails need both Resend variables and a verified sender domain. Until configured, the app does not claim that an email was sent.

## Database and demo safety

- Use a dedicated production database user with only the permissions the app needs. Configure Atlas network access with a supported, restricted egress setup; do not expose the database broadly.
- Keep local fictional demo accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, password `12345`) on the loopback-only demo service. Never load them into a public production database.
- The demo HR account is linked to the fictional Iqra Javed staff profile and has a seeded pending self-request for Admin review. This demonstrates HR self-service and segregation of duties; do not copy that stance to production without a deliberate policy decision.
- The demo guest page prefills a role email on sign-in, so treat it as an explicitly fake workspace. Keep the demo service on port 3001 and never expose it through a public alias.
- Use a separate empty database for previews and manual setup checks. Do not reset or seed a database containing real records.
- Rotate database, session, Gemini, and Resend secrets through their providers if exposed. Changing `SESSION_SECRET` signs out existing users.
- Review database backup/restore support and external AI quotas before relying on those services.

## Local production container

The multi-stage `Dockerfile` builds Next.js standalone output and runs as an unprivileged user on port 3000. Docker Compose binds the app and MongoDB ports to loopback. For local startup and the isolated demo, follow the commands in the [README](../README.md).
