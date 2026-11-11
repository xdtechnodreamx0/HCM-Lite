# Build status

Updated: 2026-11-11 (Asia/Karachi)

## Current state

The Next.js app, role-scoped portal, MongoDB-backed service layer, Route Handlers, responsive CSS, four appearance modes, live people search, isolated guest demo, account creation and recovery, optional Resend email verification, optional Gemini assistant, HR self-service, and server-verified geofenced check-in are present in this checkout.

Release commit `8e402ed` is deployed. It adds the final workspace polish and the production AI tracing fix on top of account recovery, admin payroll controls, and the public-site refresh. Dedicated `/login` and `/verify-email` routes, honest sign-up/forgot-password notices when email is unconfigured, reset-password flow, in-app change-password dialog, workspace and public footers, and a top-bar user menu with sign-out are included. Admin can create, recalculate, and finalize payroll drafts; HR prepares drafts but cannot finalize. The assistant defaults to Gemini free-tier `gemini-2.5-flash` with ordered fallbacks.

Polish in this release: fixed post-`await` form resets in attendance, communications, and people forms; correct attendance participant names; single-day leave dates; valid leave-code browser `pattern`; styled access-role selects; mobile navigation close control; fifth KPI card span; KPI-note clamp with a full-text tooltip; complete Night and Disco token coverage; stronger small-copy contrast; readable sidebar email wrapping; and no speculative payroll 404s or data loads during a forced password change.

The AI route previously loaded `@google/genai` through `createRequire`, which Vercel output tracing omitted from the function bundle, so `/api/ai/status` returned an empty 500 in production while Docker worked. A static import now bundles the SDK into the traced server chunk. Production `/api/ai/status` returns `401 {"error":"Please sign in."}` instead of 500; with a session and no key it returns `200 {"available":false}`, and the AI view shows “AI not configured” with the input disabled.

## Verification evidence

| Check | Result | Evidence / limits |
|---|---|---|
| `npm run lint` | Passed | 2026-11-11; ESLint exit code 0 with no warnings after the final code changes. |
| `npm run typecheck` | Passed | 2026-11-11; `tsc --noEmit` exit code 0. |
| Unit tests | Passed 57/57 | 2026-11-11; 12 files passed. Coverage includes Gemini model selection/fallback, account-response `no-store` headers, same-origin CSRF, dates/time zones, attendance, geofence, leave, payroll/tax, CSV, dashboard, and currency. |
| `npm run build` | Passed | 2026-11-11; Next.js 16.4.3 production build generated 43 static pages; the Gemini SDK is present in the traced server chunk. |
| Dependency audit | Passed | 2026-11-10; `npm audit` reports 0 vulnerabilities. |
| Docker image and Compose stack | Passed | 2026-11-11; demo image rebuilt from the final tree; app, demo app, and MongoDB containers ran healthy on the loopback-only Compose network. |
| Seeded demo | Passed | 2026-11-11; final reseed produced 3 users, 6 departments, 7 designations, 16 employees, 16 salary structures, 4 leave types, 2 holidays, 480 attendance records, 6 leave requests, 3 announcements, 4 notifications, 1 correction, 2 payroll runs, 3 audit entries, and 0 rate-limit records. All three accounts below accept `12345`. |
| Interaction suite | Passed 83/83 | 2026-11-11; headless Chromium against the rebuilt demo. Zero page errors and zero console errors. View navigation 456–647 ms, API responses 18–80 ms, public pages 69–310 ms. Covered all public routes, all three role workspaces, forms, validation, payroll draft/finalize, leave approval, password change, account recovery, CSV/PDF download, and role boundaries. |
| Final-code gate | Passed 76/76 | 2026-11-11 after the AI fix; 24 role views plus 7 public routes, 10 API checks, and 4 AI checks. Zero console, page, or HTTP problems. View transitions 57–184 ms, API 15–75 ms, public loads 155–455 ms excluding a fixed 600 ms settle wait. |
| Desktop visual audit | Passed | 30 views at 1440×1000; no horizontal overflow, broken images, unnamed buttons, or empty links. The only flags were intentional two-line KPI notes, now with full text in the tooltip. |
| Mobile visual audit | Passed | 24 views at 430 px; no horizontal overflow or clipped text. Remaining small-target flags are inline text links, not primary controls. |
| Theme audit | Passed with known false positives | Night and Disco report zero genuine contrast failures across login, demo, overview, payroll, and attendance. Day and Peaceful remaining reports are gradient/art-panel false positives; the payroll tax note and Peaceful eyebrow/muted contrast were fixed. |
| GitHub repository and CI | Passed | Public repository: `https://github.com/xdtechnodreamx0/HCM-Lite`. Release commit `8e402ed` passed GitHub Actions CI run `43041922055` (install, lint, typecheck, tests, build) in a 49-second checks job. |
| Vercel production runtime | Passed post-deploy | Vercel status for `8e402ed` succeeded at 14:48 UTC and `https://hcmlite-beta.vercel.app` serves it. `/api/health` returns `200 {"status":"ok"}`; `/api/ai/status` returns `401` rather than the previous 500. `/`, `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/reset-password`, and `/demo` all return 200. `/api/session` returns `200 {"initialized":true,...}` with `Cache-Control: no-store, max-age=0` and `Pragma: no-cache`. |
| Production boundary checks | Passed | Empty login, setup, signup, and reset-request POSTs from the real origin return `422 VALIDATION_ERROR`; a foreign `Origin` returns `403`; the demo Admin email on production returns `401`; `/api/session` still reports `initialized:true` with no user before and after. No production data was written, reset, or seeded. |
| Email delivery | Not verified | `RESEND_API_KEY` and `EMAIL_FROM` are absent, so no real email was delivered. Token handling was previously proven with directly inserted tokens; the UI states that email is not configured. |
| Gemini answers | Not verified | No `GEMINI_API_KEY` exists locally, in the demo, or in production. The assistant reports `available:false`, the chat endpoint returns an honest no-key message, and the UI disables the input. Free-tier model choice and fallback are unit-tested; no live model answer is claimed. |
| Browser/E2E suite | Not committed | Playwright is installed and the 83-check suite plus the final 76-check gate were scripted and passed, but no browser spec is committed. Manual steps remain in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). |

## Known external setup

- Production already has a real Admin setup (`initialized:true`). Do not reset, drop, or seed the production database.
- `GEMINI_API_KEY` is absent everywhere. Add it in Vercel with `GEMINI_MODEL=gemini-2.5-flash` to enable the assistant; fallbacks are automatic.
- Resend is unconfigured. Add `RESEND_API_KEY` and a verified `EMAIL_FROM` to enable real verification and password-reset email. Until then the UI says email is not configured and does not pretend a message was sent.
- `APP_BASE_URL` should be set to the exact HTTPS origin in Vercel. Email links fall back to Vercel’s production URL when it is missing or localhost.
- The seeded demo is loopback-only. Its accounts (`admin@northstar.demo`, `hr@northstar.demo`, `employee@northstar.demo`, password `12345`) must never be exposed publicly.
- Production Admin credentials were not available to this audit, so the live production tour stops at public pages and sign-in. Role workspaces were exercised on the isolated demo.

## Next checks

1. Add `GEMINI_API_KEY` in Vercel and verify one real assistant answer, including an authorized-data question and a refusal outside the user’s scope.
2. Add `RESEND_API_KEY` and a verified `EMAIL_FROM`, set `APP_BASE_URL`, then verify one delivered verification email and one delivered reset email.
3. Sign in to production only with the existing real Admin credentials; never reset, drop, or seed the production database.
