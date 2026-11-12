# Build status

Updated: 2026-11-12 (Asia/Karachi)

## Current state

The Next.js app, role-scoped portal, MongoDB-backed service layer, Route Handlers, responsive CSS, four appearance modes, live people search, isolated demo workspace, account creation and recovery, optional Resend email verification, optional Gemini assistant, HR self-service, and server-verified geofenced check-in are present in this checkout.

Release commits `210eefe` (portal release) and `657422d` (AI fix) add self-serve company workspaces, 6-digit email verification, profile-only employees, a separate read-only customer demo, and a one-click demo launcher. Company sign-up is available only after the first workspace is initialized and only when Resend is configured; it rolls back every record if verification email delivery fails. The first workspace still uses one-time setup. The customer portal is demo-only, reads a sanitized company snapshot, and grants no staff API access. `DEMO_MODE=true` gates both one-click demo login and the customer portal; production keeps it false.

The demo seed now produces 17 employees and five usable personas: Nadia Rahman (Admin), Iqra Javed (HR), Sana Malik, Taimur Raza, and Sarmad Baig (Employees). All five accept `12345` and are available from `/demo`. A reseed purges the marked demo company first, so the snapshot is exact and repeatable. The snapshot includes two 2026 joiners and one approved leave covering today.

AI now uses Gemini's 10-second minimum SDK deadline, a 3-second hedge for the configured primary, a 10-second fallback stage, and the existing 15-second overall budget. Live local checks on the final image returned Admin headcount in 2.8s, an Employee's annual leave balance in 2.9s, and a deterministic company-wide refusal in 0.1s. Headcount and leave answers come from authorized server tools; no model output is faked.

## Verification evidence

| Check | Result | Evidence / limits |
|---|---|---|
| `npm run lint` | Passed | 2026-11-12; ESLint exit code 0. |
| `npm run typecheck` | Passed | 2026-11-12; `tsc --noEmit` exit code 0. |
| Unit tests | Passed 60/60 | 2026-11-12; 12 files passed. Coverage includes Gemini model selection/fallback, account-response `no-store` headers, same-origin CSRF, dates/time zones, attendance, geofence, leave, payroll/tax, CSV, dashboard, and currency. |
| `npm run build` | Passed | 2026-11-12; Next.js 16.4.3 production build generated 50/50 pages and includes every new auth, demo, and customer route. |
| GitHub Actions CI | Passed | Run `43221603869` for `657422d` completed in 53s: install, lint, typecheck, tests, and build all passed. |
| Vercel production deployment | Passed | 2026-11-12; `https://hcmlite-beta.vercel.app` serves the new build. `/api/health` returns `200 {"status":"ok"}`; `/api/demo/accounts` returns `200 {"enabled":false,"accounts":[]}`; `/demo`, `/customer`, `/signup/company`, and `/verify-email` return 200. |
| Production boundary checks | Passed | 2026-11-12; company sign-up returns `503 EMAIL_NOT_CONFIGURED`, customer sign-in returns `503 DEMO_MODE_DISABLED`, and demo login returns `404 DEMO_MODE_DISABLED` from the real origin. `/api/session` reports `initialized:true`, `demoMode:false`, `emailConfigured:false`, no user, and `Cache-Control: no-store`. No production records were written. |
| Docker demo image | Passed | 2026-11-12; rebuilt from the final tree and healthy on loopback `http://localhost:3001` against `hcm_lite_demo`. |
| Seeded demo | Passed | 2026-11-12; final reseed produced 5 users, 6 departments, 8 designations, 17 employees, 17 salary structures, 4 leave types, 2 holidays, 527 attendance records, 9 leave requests, 4 leave-usage rows, 3 announcements, 8 notifications, 1 correction, 2 payroll runs, and 3 audit entries. |
| Demo persona matrix | Passed | All five personas signed in through `/api/auth/demo-login` and returned the expected role and employee ID. Admin `GET /api/users` returned 200; HR and all three Employees returned 403. Every persona could read `/api/leaves` with its own scope. |
| Customer portal | Passed | Name/email sign-in returned headcount 17, 6 teams, 1 person on leave today, 2 new joiners, 8 visible people, and 3 updates. With only the customer cookie, `/api/dashboard` returned 401. Reload preserved the customer session; sign-out cleared it and returned the sign-in screen. |
| Company sign-up gate | Passed | Local and production APIs return `503 EMAIL_NOT_CONFIGURED` without Resend. `/signup/company` shows the unavailable warning and disables submission. `/verify-email?email=...` prefills the address and exposes the 6-digit code form. |
| Employee creation paths | Passed | HR created a profile-only employee with no login and no temporary password. HR created a login employee and received a one-time temporary password; that login forced a password change, blocked `/api/dashboard` with 403 `PASSWORD_CHANGE_REQUIRED`, then succeeded and cleared the force flag after the change. |
| AI live answers | Passed locally | Admin headcount returned 17 in 2.8s; Employee annual leave returned 14 days in 2.9s; Employee company-wide headcount was refused in 0.1s without a model call. `/api/ai/status` reports `available:true` on the local demo. |
| Browser UI checks | Passed | Accessibility snapshots verified the customer sign-in, dashboard, and sign-out flow; the `/demo` persona cards; the company sign-up unavailable state; and the prefilled verification-code form. Screenshot capture was unavailable because the desktop browser tab was not visible. |
| Local MCP tooling | Passed | `opencode mcp list` shows `filesystem`, `memory`, and `sequential-thinking` connected; a real filesystem tool call listed `C:\dev` and read `HCM-Lite/package.json`. The broken Docker gateway remains configured as `MCP_DOCKER` with `disabled: true`. |
| Email delivery | Not verified | `RESEND_API_KEY` and `EMAIL_FROM` are absent, so no real verification or reset email was delivered. The UI and API report the missing setup instead of pretending to send. |
| Production AI answers | Not verified | No authenticated production session or Vercel access was available, so no live production AI answer is claimed. `/api/ai/status` still requires a signed-in user. |
| Browser/E2E suite | Not committed | Playwright is installed and manual interaction suites passed earlier, but no browser spec is committed. The manual walkthrough remains in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). |

## Known external setup

- Production already has a real Admin setup (`initialized:true`). Do not reset, drop, or seed the production database.
- `GEMINI_API_KEY` is not configured in Vercel. Add it there to enable the assistant. On 2026-11-12 the full Flash models were frequently overloaded; `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` answered reliably, and the fallback chain tries siblings when a model is unavailable, rate-limited, or slow.
- Resend is unconfigured. Add `RESEND_API_KEY` and a verified `EMAIL_FROM` to enable company sign-up, verification codes, and password-reset email. Until then company sign-up stays unavailable and employee requests remain inactive until linked.
- `APP_BASE_URL` should be set to the exact HTTPS origin in Vercel. Email links fall back to Vercel’s production URL when it is missing or localhost.
- The seeded demo is loopback-only. Its five accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, `taimur@northstar.demo`, `sarmad@northstar.demo`, password `12345`) must never be exposed publicly. Keep `DEMO_MODE` unset or false in production.
- Production Admin credentials were not available to this audit, so the live production tour stops at public pages and public API checks. Role workspaces were exercised on the isolated demo.

## Next checks

1. Add `RESEND_API_KEY` and a verified `EMAIL_FROM`, set `APP_BASE_URL`, then complete one real company sign-up with a delivered 6-digit code and one delivered password-reset email.
2. Add `GEMINI_API_KEY` in Vercel and verify one authorized answer, one employee-scoped answer, and one refusal outside the user’s scope with an authenticated production session.
3. Recheck the production Admin’s existing workspace after deployment; never reset, drop, or seed the production database.
