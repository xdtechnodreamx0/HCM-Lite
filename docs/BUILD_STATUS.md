# Build status

Updated: 2026-11-12 (Asia/Karachi)

## Current state

The Next.js app, role-scoped portal, MongoDB-backed service layer, Route Handlers, responsive CSS, four appearance modes, live people search, isolated demo workspace, account creation and recovery, optional Resend email verification, optional Gemini assistant, HR self-service, and server-verified geofenced check-in are present in this checkout.

Release commits `210eefe` (portal release), `657422d` and `9145955` (AI reliability), `bcd7675` (cold-start budget), and the documentation commits add self-serve company workspaces, 6-digit email verification, profile-only employees, a separate read-only customer demo, and a one-click demo launcher. Company sign-up is available only after the first workspace is initialized and only when Resend is configured; it rolls back every record if verification email delivery fails. The first workspace still uses one-time setup. The customer portal is demo-only, reads a sanitized company snapshot, and grants no staff API access. `DEMO_MODE=true` gates both one-click demo login and the customer portal; production keeps it false.

The demo seed now produces 17 employees and five usable personas: Nadia Rahman (Admin), Iqra Javed (HR), Sana Malik, Taimur Raza, and Sarmad Baig (Employees). All five accept `12345` and are available from `/demo`. A reseed purges the marked demo company first, so the snapshot is exact and repeatable. The snapshot includes two 2026 joiners and one approved leave covering today.

AI uses the `gemini-flash-lite-latest` alias as its configured primary. Each model call has a 12-second SDK deadline and an 11-second attempt budget; the next candidate starts after a 2-second stagger, capped at a 4-second start, so the first healthy model wins instead of waiting out each slow one. The optional fallbacks are `gemini-3-flash-preview`, `gemini-3.5-flash-lite`, and `gemini-3.5-flash`, and the overall request budget is 42 seconds. Policy questions are answered in one model call because the workspace attendance policy is injected server-side; only data questions use the two-stage tool-selection flow. Headcount and leave answers come from authorized server tools; no model output is faked. The AI audit log records the model that answered.

## Verification evidence

| Check | Result | Evidence / limits |
|---|---|---|
| `npm run lint` | Passed | 2026-11-12; ESLint exit code 0. |
| `npm run typecheck` | Passed | 2026-11-12; `tsc --noEmit` exit code 0. |
| Unit tests | Passed 60/60 | 2026-11-12; 12 files passed. Coverage includes Gemini model selection/fallback, account-response `no-store` headers, same-origin CSRF, dates/time zones, attendance, geofence, leave, payroll/tax, CSV, dashboard, and currency. |
| `npm run build` | Passed | 2026-11-12; Next.js 16.4.3 production build generated 50/50 pages and includes every new auth, demo, and customer route. |
| GitHub Actions CI | Passed | Run `43258044304` for `9145955` completed in 57s; install, lint, typecheck, tests, and build all passed. Earlier runs `43221603869` and `43222027710` also passed. |
| Vercel production deployment | Passed | 2026-11-12; commit `9145955` deployed Ready in 19s and `https://hcmlite-beta.vercel.app` serves it. `/api/health` returns `200 {"status":"ok"}`; `/api/demo/accounts` returns `200 {"enabled":false,"accounts":[]}`; `/demo`, `/customer`, `/signup/company`, and `/verify-email` return 200. |
| Production boundary checks | Passed | 2026-11-12; customer sign-in returns `503 DEMO_MODE_DISABLED` and demo login returns `404 DEMO_MODE_DISABLED` from the real origin. `/api/session` reports `initialized:true`, `demoMode:false`, `emailConfigured:true`, the real Admin session, and `Cache-Control: no-store`. Production headcount remains 0; no demo data was written. |
| Docker demo image | Passed | 2026-11-12; rebuilt from the final tree and healthy on loopback `http://localhost:3001` against `hcm_lite_demo`. |
| Seeded demo | Passed | 2026-11-12; final reseed produced 5 users, 6 departments, 8 designations, 17 employees, 17 salary structures, 4 leave types, 2 holidays, 527 attendance records, 9 leave requests, 4 leave-usage rows, 3 announcements, 8 notifications, 1 correction, 2 payroll runs, and 3 audit entries. |
| Demo persona matrix | Passed | All five personas signed in through `/api/auth/demo-login` and returned the expected role and employee ID. Admin `GET /api/users` returned 200; HR and all three Employees returned 403. Every persona could read `/api/leaves` with its own scope. |
| Customer portal | Passed | Name/email sign-in returned headcount 17, 6 teams, 1 person on leave today, 2 new joiners, 8 visible people, and 3 updates. With only the customer cookie, `/api/dashboard` returned 401. Reload preserved the customer session; sign-out cleared it and returned the sign-in screen. |
| Company sign-up and verification | Passed | Isolated local DB `hcm_lite_emailtest`: the first Admin was created with email off, the server was restarted with Resend configured, and company “Atlas Verify” signed up with the account-owner address. A real 6-digit code was delivered, accepted, and the sign-up session became a verified Admin; the test database was then dropped. Without Resend configured, the API returns `503 EMAIL_NOT_CONFIGURED` and `/signup/company` disables submission. |
| Employee creation paths | Passed | HR created a profile-only employee with no login and no temporary password. HR created a login employee and received a one-time temporary password; that login forced a password change, blocked `/api/dashboard` with 403 `PASSWORD_CHANGE_REQUIRED`, then succeeded and cleared the force flag after the change. |
| AI live answers | Passed | Local final build: policy answer 3.5s, Admin headcount 17 in 7.3s, and an Employee company-wide refusal without a model call. Production signed-in: cold policy answer 4.3s, headcount 7.1s (`0 employees`), leave 7.7s (`No employees are on leave today`), all HTTP 200 with correct `toolName`. `/api/ai/status` reports `available:true` and `model:"gemini-flash-lite-latest"` in production. |
| Browser UI checks | Passed | Manual browser audits covered all four appearance modes, responsive layouts, and 30+ captured screenshots across the portal, demo, customer, sign-up, and verification pages. The final interaction sweep passed 83/83 checks, and the final-code gate passed 76/76. |
| Local MCP tooling | Passed | `opencode mcp list` shows `filesystem`, `memory`, and `sequential-thinking` connected; a real filesystem tool call listed `C:\dev` and read `HCM-Lite/package.json`. The broken Docker gateway remains configured as `MCP_DOCKER` with `disabled: true`. |
| Email delivery | Passed with a sender limit | A real “HCM Lite delivery check” message reached the account-owner Gmail; Resend shows `Delivered` and the Gmail inbox contains it. The isolated company sign-up also delivered and accepted a real 6-digit code. Resend’s `onboarding@resend.dev` test sender accepts only the exact account-owner address: plus, dot, and `@googlemail.com` aliases all returned 403. A verified sending domain is required before arbitrary external recipients can receive sign-up or reset mail. |
| Production AI answers | Passed | A signed-in production Admin session returned live policy, headcount, and leave answers from `gemini-flash-lite-latest` (see AI live answers). Employee-scoped production AI is not claimed because the production workspace has no employees; that scope is demo-verified. Password-reset delivery was not separately exercised end to end. |
| Browser/E2E suite | Not committed | Playwright is installed and manual interaction suites passed earlier, but no browser spec is committed. The manual walkthrough remains in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). |

## Known external setup

- Production already has a real Admin setup (`initialized:true`). Do not reset, drop, or seed the production database.
- `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-flash-lite-latest` are configured in Vercel Production. Signed-in production probes returned policy, headcount, and leave answers in 4.3–7.7s. The stagger treats a healthy primary as the normal path; fallbacks still cover a retired, rate-limited, overloaded, or slow model.
- `RESEND_API_KEY` and `EMAIL_FROM="HCM Lite <onboarding@resend.dev>"` are configured locally and in Vercel Production, and `/api/session` reports `emailConfigured:true`. The Resend account has no verified sending domain, so the test sender can deliver only to the exact account-owner address. Verify a domain before inviting external companies or using arbitrary employee addresses.
- `APP_BASE_URL` is not set in Vercel. Email links fall back to Vercel’s stable production URL when it is missing or localhost.
- The seeded demo is loopback-only. Its five accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, `taimur@northstar.demo`, `sarmad@northstar.demo`, password `12345`) must never be exposed publicly. Keep `DEMO_MODE` unset or false in production.
- The production workspace belongs to “Nouman Trader” with Admin “XDTECHNODREAMXD” (`xdtechnodreamx0@gmail.com`) and 0 employees. A signed-in Admin session was available for the production AI checks; production data was read-only and not seeded or reset.

## Next checks

1. Add and verify a Resend sending domain, then set `EMAIL_FROM` to that domain and deliver a production company sign-up code and password-reset email to an external address.
2. Exercise employee-scoped production AI after the production workspace has at least one employee; current employee-scope evidence comes from the demo workspace.
3. Deliver one production password-reset email to the exact account-owner address without necessarily completing the reset.

Never reset, drop, or seed the production database while performing these checks.
