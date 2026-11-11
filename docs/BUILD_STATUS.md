# Build status

Updated: 2026-11-11 (Asia/Karachi)

## Current state

The Next.js app, role-scoped portal, MongoDB-backed service layer, Route Handlers, responsive CSS, four appearance modes, live people search, isolated guest demo, account creation and recovery, optional Resend email verification, optional Gemini assistant, HR self-service, and server-verified geofenced check-in are present in this checkout.

This working tree also contains the completed account and presentation upgrade: dedicated `/login` and `/verify-email` routes, a rewritten sign-up request form that reports honestly when email delivery is not configured, forgot-password and reset-password flows, an in-app change-password dialog, a workspace and public-site footer, a topbar user menu with sign-out for every role, and a broad visual refresh. Admin payroll now allows Admin to create, recalculate, and finalize drafts; the previous “an HR teammate can prepare a draft” messaging is gone. The optional assistant defaults to the Gemini free-tier model `gemini-2.5-flash` and falls back through `gemini-2.0-flash` and `gemini-1.5-flash` if the configured model is unavailable for the key.

The public production alias is `https://hcmlite-beta.vercel.app`. Before this change was deployed, `/api/health` returned `200 {"status":"ok"}` and `/api/session` returned `200 {"initialized":true,"user":null,"company":null}` with `Cache-Control: public, max-age=0, must-revalidate`; `/login` returned 404. That proves production still serves the earlier build, that the production database is reachable, and that a real Admin setup already exists. Production must not be reset or re-seeded. The post-deploy checks are listed below.

## Verification evidence

| Check | Result | Evidence / limits |
|---|---|---|
| `npm run lint` | Passed | 2026-11-11; ESLint completed with exit code 0 and no warnings after the final code changes. |
| `npm run typecheck` | Passed | 2026-11-11; `tsc --noEmit` completed with exit code 0. |
| Unit tests | Passed | 2026-11-11; `npm test` ran 57 tests across 12 files, all passed. New coverage includes Gemini free-tier model selection/fallback and `no-store` account-response headers, alongside the existing same-origin CSRF, dates/time zones, attendance, geofence, leave, payroll/tax, CSV, dashboard, and currency tests. |
| `npm run build` | Passed | 2026-11-11; Next.js 16.4.3 production build completed and generated 43 static pages. Routes include `/login`, `/verify-email`, `/signup`, `/forgot-password`, `/reset-password`, and `/demo`. |
| Dependency audit | Passed | 2026-11-10; `npm audit` reports 0 vulnerabilities after removing the unused `mongodb-memory-server` dev dependency and pinning the TypeScript-ESLint minimatch override to a patched release. |
| Docker image and Compose stack | Passed | 2026-11-11; the isolated demo image rebuilt from the final tree and the app, demo app, and MongoDB containers reported healthy on the loopback-only Compose network. |
| Seeded demo | Passed | 2026-11-11; drop-and-reseed of the isolated `hcm_lite_demo` database produced 3 user logins, 6 departments, 7 designations, 16 employees, 16 salary structures, 4 leave types, 2 holidays, 480 attendance records, 6 leave requests, 3 announcements, 4 notifications, 1 correction, 2 payroll runs, and 3 audit entries. |
| Role-by-role live walkthrough | Passed 29/29 | 2026-11-11; headless Chromium against the rebuilt demo at `http://localhost:3001`. Admin: sign-in, no ask-HR payroll copy, footer present, draft payroll finalized with “Finalized & locked”, approved Admin cover for the HR teammate’s own leave, wrong current password rejected by the change-password dialog, sign-out back to the sign-in page. HR: Admin-approved own leave visible, approved a team leave request, attendance view loaded, “Only Admin can finalize this payroll” boundary shown. Employee: sign-in, “My profile” menu entry and profile view, own password changed then re-login with the new password, finalized payslip visible, payslip PDF downloaded (`payslip-EMP-1003-2026-11.pdf`, 1,617 bytes), leave request form loaded. All three role consoles and the public pages were free of console/page errors. |
| Public account flows | Passed with honest limits | Sign-up recorded the request and displayed that email delivery is not configured, so no email was sent. Forgot-password displayed the same honest provider notice. A real verification token inserted directly into the demo database was consumed by `/verify-email`, and `emailVerifiedAt` persisted. A real reset token drove `/reset-password` to update the password, and sign-in with the new password succeeded. |
| Email delivery | Not verified | Resend is not configured (`RESEND_API_KEY` and `EMAIL_FROM` absent), so no real email was delivered. Token handling was proven with directly inserted tokens, not inbox delivery. |
| Gemini assistant | Disabled; not verified | No `GEMINI_API_KEY` is available in the local, demo, or production environment, so the assistant correctly reports an unavailable state. The free-tier default and fallback chain are unit-tested; no live model answer was produced or claimed. |
| GitHub repository and CI | Pending for this commit | Public repository: `https://github.com/xdtechnodreamx0/HCM-Lite`. Earlier commits passed CI. This commit’s workflow result is recorded after the push; see the deployment notes below. |
| Vercel production runtime | Pre-deploy snapshot; re-check pending | On 2026-11-11 the alias returned `200 {"status":"ok"}` from `/api/health`, `200 {"initialized":true,...}` from `/api/session`, and 404 from `/login`, with a public cache policy. The deployed build therefore predates this change. After deployment, `/login` must return 200, `/api/session` must send `Cache-Control: no-store, max-age=0`, the root must show the sign-in experience, empty POSTs must return `422`, and a foreign `Origin` must still return `403`. |
| Browser/E2E suite | Not committed | Playwright is installed locally and the 29-check walkthrough above was scripted, but no browser spec is committed. Manual demo steps are in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). |

## Known external setup

- Production already has a real Admin setup (`initialized:true`). Do not reset, drop, or seed the production database.
- `GEMINI_API_KEY` is absent everywhere. Add it in Vercel with `GEMINI_MODEL=gemini-2.5-flash` to enable the assistant; the server falls back to the other free-tier models automatically.
- Resend is unconfigured. Add `RESEND_API_KEY` and a verified `EMAIL_FROM` to enable real verification and password-reset email. Until then the UI states that email is not configured and does not pretend a message was sent.
- `APP_BASE_URL` may still be the old localhost value in Vercel. The server now falls back to Vercel’s production URL for email links, but setting it to the exact HTTPS origin is still recommended.
- The seeded demo is intentionally loopback-only. Its accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, password `12345`) must never be exposed publicly.

## Next checks

1. Confirm the pushed commit passes the GitHub Actions workflow (install, lint, typecheck, tests, build).
2. Confirm Vercel deployed that commit to `https://hcmlite-beta.vercel.app`.
3. Verify `/login` returns 200, `/signup`, `/forgot-password`, `/verify-email`, and `/demo` return 200, `/api/session` sends `no-store`, empty auth POSTs return `422`, and a foreign `Origin` returns `403`.
4. Sign in only if the existing production Admin credentials are available; never reset the production database.
5. After adding real keys in Vercel, verify one AI answer and one delivered verification or reset email before describing either integration as live.
