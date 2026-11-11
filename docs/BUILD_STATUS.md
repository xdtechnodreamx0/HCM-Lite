# Build status

Updated: 2026-11-11 (Asia/Karachi)

## Current state

The full Next.js app, role-scoped portal, MongoDB-backed service layer, Route Handlers, responsive CSS, four appearance modes, live people search, isolated guest demo, account recovery, optional Resend email verification, optional Gemini assistant, HR self-service, and server-verified geofenced check-in are present in this checkout. Final code commit `ed7895c` passed GitHub Actions CI run `42871142415`, and Vercel reported `Deployment has completed` for the same commit.

The public production alias is `https://hcmlite-beta.vercel.app`. On 2026-11-11 it returned `{"status":"ok"}` from `/api/health`, `{"initialized":false,"user":null,"company":null}` from `/api/session`, and `403 {"error":"Invalid request origin."}` from every mutation. The deployment was still running an older build whose CSRF check only compared the browser `Origin` with `APP_BASE_URL`; the project value is still `http://localhost:3000`, so setup, sign-in, and signup were all rejected. The same alias was also serving the older `HcmPortal` shell rather than the latest `main` build, so promoting the latest deployment is required in addition to the code fix.

The fix in `src/server/auth/csrf.ts` now accepts the request's actual forwarded host (`x-forwarded-host` / `x-forwarded-proto`, falling back to `Host`) as a same-origin target, while still accepting `APP_BASE_URL`. A stale localhost value can no longer block a real Vercel alias, and foreign origins are still rejected in production.

The permission model follows the brief’s matrix: Admin manages company setup, user logins, audit, announcements, and payroll finalization; HR registers and edits employees, manages salary structures and CSV tools, and decides employee attendance/leave requests; Employees act only on their own records. Admin sees the People directory read-only. The two deliberate exceptions are HR self-service (HR needs a linked staff profile to use its own check-in/leave) and Admin cover for an HR teammate’s own pending request; neither role can decide its own request.

## Verification evidence

| Check | Result | Evidence / limits |
|---|---|---|
| Source inventory | Reviewed | App, routes, services, configuration, tests, and prompt pack reviewed. `.env.local` is ignored and was not committed. |
| `npm run typecheck` | Passed | 2026-11-10; `tsc --noEmit` completed with exit code 0 after the final code changes. |
| `npm run lint` | Passed | 2026-11-10; ESLint completed with exit code 0 and no warnings after the final code changes. |
| Unit tests | Passed | 2026-11-11; `npm test` ran 51 tests across 10 files, all passed. Coverage includes the same-origin CSRF regression (real Vercel host with a localhost `APP_BASE_URL`), dates/time zones, attendance rules, geofence math, leave rules, payroll/tax, CSV safety, dashboard metrics, and currency. |
| `npm run build` | Passed | 2026-11-11; Next.js 16.4.3 production build completed, generated 41 static pages, and listed all page/API routes. |
| Dependency audit | Passed | 2026-11-10; `npm audit` reports 0 vulnerabilities after removing the unused `mongodb-memory-server` dev dependency and pinning the TypeScript-ESLint minimatch override to a patched release. |
| Local app + MongoDB | Previously passed, not rerun | On 2026-10-25, Compose reported app, demo app, and MongoDB healthy; `/api/health` returned `200 {"status":"ok"}`. Docker Desktop’s daemon was unavailable during the 2026-11-10 final pass, so this was not repeated. |
| Guest demo and role smoke check | Previously passed | On 2026-10-25, `/demo` returned HTTP 200 and Admin, HR, and Employee sign-ins reached their dashboards on the isolated demo database. This was a narrow check, not full workflow coverage. |
| HR self-service and Admin cover | Unit-tested rules; live walkthrough pending | Service guards reject self-approval and limit Admin decisions to HR-linked employees. The demo seed includes a linked HR profile, a pending HR leave request, HR usage data, and an Admin notification. Browser walkthrough still requires a running database. |
| Geofenced check-in | Unit-tested math; live browser check pending | When Admin sets office latitude/longitude, the browser sends coordinates and accuracy, and the server applies the Haversine radius/accuracy rules before writing the record. The demo leaves coordinates unset to avoid a location prompt. |
| Notification flow | Implemented; not verified against a live database | New leave/correction requests notify the appropriate reviewer role, decisions notify the requester, and payroll finalization notifies employees with a linked login. |
| MongoDB domain flows | Not verified live in the final pass | Local database ping passed previously, but a seeded end-to-end employee/leave/payroll walkthrough was not possible without the Docker daemon. |
| Gemini | Disabled locally | The authenticated demo status previously returned `available: false`; no Gemini key is configured in that environment. Production key status is unknown. |
| Docker image and Compose stack | Previously passed, not rerun | The production and demo containers built and reported healthy on 2026-10-25. The daemon was unavailable on 2026-11-10, so the final image build was not repeated. |
| GitHub repository and CI | Passed | Public repository: `https://github.com/xdtechnodreamx0/HCM-Lite`. Final code commit `ed7895c` passed CI run `42871142415` (install, lint, typecheck, tests, build), and Vercel reported `Deployment has completed`. The workflow now also runs `npm test`. |
| Vercel production runtime | Partially verified, fix pending promotion | `https://hcmlite-beta.vercel.app/api/health` returns `200 {"status":"ok"}` and `/api/session` returns `initialized:false`, so the production database is reachable and empty. The alias is still on an older build with `APP_BASE_URL=http://localhost:3000` and rejects mutations with `403 Invalid request origin.`. The CSRF fix and regression tests are committed in this pass; the alias must be promoted to the new deployment before setup/sign-in can be rechecked. |
| Email verification and password-reset delivery | Implemented, not configured | Resend-backed HTML email and expiring hashed tokens are implemented. A Resend key and verified sender are still required; no email was sent during this work. |
| Browser/E2E suite | Not authored | Playwright is configured, but no browser spec is committed. Manual demo steps are in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). |

## Known external setup

The local `.env.local` and Docker Compose configuration are present. The production database is reachable and uninitialized (`initialized:false`), so the first Admin setup still needs to be completed with the real company and Admin details; do not use the demo password. Correct `APP_BASE_URL` to the public HTTPS origin during that pass so email links point to the right host, although the new CSRF logic no longer depends on it. The local Gemini key is absent, real email delivery needs Resend configuration, and Docker Desktop must be running for a live Mongo walkthrough. The seeded demo is intentionally loopback-only and must never be exposed publicly.

## Next checks

1. Promote the latest `main` build to `https://hcmlite-beta.vercel.app`, confirm the new shell and CSRF behavior, then complete first Admin setup with real company details.
2. Sign in with that Admin account and verify `/api/session`, dashboard loading, and role-scoped navigation.
3. Start Docker Desktop, run the isolated demo seed from the README, and record a role-by-role walkthrough in this file.
4. Exercise employee leave/correction submission, HR decisions, HR self-request Admin cover, geofenced check-in with a configured office radius, and finalized-payslip notifications against the seeded database.
5. Configure Resend and Gemini only with real server-side credentials, then verify email delivery and representative AI questions; do not fabricate either result when credentials are absent.
