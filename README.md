# HCM Lite

People.works is a role-scoped human capital management app for one company. It uses Next.js App Router, TypeScript, MongoDB, and server-side route handlers. The first run creates an empty workspace and its first Admin; it does not create sample employees or payroll.

## Requirements

- Docker Desktop (recommended for the full local app)
- Optional for hot-reload development outside Docker: Node.js 20.19 or newer and npm
- Optional: a Gemini API key to enable the AI assistant

## Run locally with Docker

1. Open this folder in VS Code and start Docker Desktop.
2. Make sure `.env.local` exists. For a fresh checkout, copy `.env.example` to `.env.local` and set a unique `SESSION_SECRET` (at least 32 characters). Never commit `.env.local`.
3. From the VS Code terminal at this folder, run `docker compose up --build -d`.
4. Open `http://127.0.0.1:3000` in your browser. On a new empty database, create the first Admin. On an existing database, sign in with its existing account.
5. To stop the app and database, run `docker compose down`. The named MongoDB volume remains, so your local data is preserved.

The app container connects to the MongoDB service over Docker's private network. Its published app and database ports are bound to loopback so they are available only on your computer.

## Optional real email verification

First Admin setup and new HR/employee login creation send a secure, expiring verification email when both `RESEND_API_KEY` and `EMAIL_FROM` are configured. Create a Resend account, add and verify a sending domain there, create an API key, then put the key and a verified sender such as `People.works <team@yourdomain.com>` in the ignored `.env.local` file. Restart the app with `docker compose up -d --force-recreate app`. Without these two settings, local setup stays password-based and does not pretend that an email was sent. Existing local setup is already complete; changing the settings will not trigger a new verification email for the current Admin.

Never commit `.env.local`, email keys, or API credentials. For a public service, set `APP_BASE_URL` to its exact HTTPS address so verification links point to the deployed site.

The sign-in page links to employee sign-up and password recovery. New sign-ups are inactive employee requests; they cannot select their own role and must be linked to a People profile by Admin/HR. Password-reset links are single-use, expire after 30 minutes, and invalidate existing sessions. Both signup verification and real reset email delivery require `RESEND_API_KEY` plus a verified `EMAIL_FROM` sender; without them, password reset explains the missing setup and new employee requests remain inactive until linked.

## Local demo workspace

The demo uses a separate MongoDB database named `hcm_lite_demo` and a second app on `http://localhost:3001`. It does not read or reset the existing `hcm_lite` company database. Start the database if it is not already running, then run these commands from this folder in a PowerShell terminal:

```powershell
docker compose up -d mongodb
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
$env:MONGODB_DB = "hcm_lite_demo"
npm run seed:demo
Remove-Item Env:MONGODB_URI
Remove-Item Env:MONGODB_DB
docker compose --profile demo up -d --build app-demo
```

Open `http://localhost:3001/demo` for the fictional guest dashboard or `http://localhost:3001` to sign in. Demo usernames are `admin@northstar.demo`, `hr@northstar.demo`, and `employee@northstar.demo`; each uses password `12345`. The guest page’s role cards prefill the selected email on the sign-in screen. These credentials are intentionally weak and are only for a loopback demo; never expose this demo service publicly. The seed script refuses a non-empty database unless it finds its own single marked demo company.

The demo HR login is linked to the fictional staff profile of Iqra Javed, so HR can check in and request leave from the same workspace where it reviews the team. HR cannot approve its own request; a seeded pending HR leave request appears to the Admin for review. This is an explicit segregation-of-duties exception for the demo, not a claim that Admins approve ordinary employee leave. The demo company has no office coordinates set, so check-in does not ask for browser location; when an Admin configures coordinates, the server verifies the reported position with the Haversine distance instead of trusting the browser.

Stop the demo service with `docker compose --profile demo stop app-demo`. Stop the whole local stack with `docker compose down` when finished. MongoDB data remains in the named local volume.

## Appearance, quick help, and AI

Peaceful mode uses softer green colors, a slow ambient background, and restrained shadows. Some people may find that look calmer, but comfort varies and it is not a health treatment. Disco mode adds colorful gradients and slow card/button glow. Both respect the operating system’s reduced-motion preference. Day and Night change the light/dark palette. A short appearance note is available beside the theme selector in the signed-in workspace.

Every signed-in page includes a quick guide and an Ask AI shortcut. The assistant receives the current HCM page label and answers with read-only, role-scoped company tools: Employees can ask only about their own attendance, leave, and pay; HR and Admin can ask approved team/company questions. It does not capture or inspect the computer screen, and it cannot approve requests or modify records. A Gemini key is optional; without it the app displays its honest disabled state. If you configure Gemini, AI prompts and authorized tool results are sent to Google’s Gemini service.

For faster hot-reload development, run `docker compose stop app`, then `docker compose up -d mongodb`, then `npm ci` and `npm run dev -- --hostname 127.0.0.1` in a VS Code terminal. The host development server uses `MONGODB_URI=mongodb://127.0.0.1:27017` from `.env.local`. Stop it with Ctrl+C. Do not run both app modes on port 3000 at the same time.

Setup is permanent for a given database. To start over, point the app to a different empty database rather than deleting records from a shared or production database.

## Main workflows

- **Admin:** configure company/calendar policies, add organization records and user logins, link an HR login to a staff profile, review the company dashboard and audit history, post announcements, and finalize payroll. Admin sees the People directory in read-only mode, matching the brief; HR registers and edits employee records.
- **HR:** manage the employee directory, salary structures, CSV import/export, attendance board, corrections and leave (except their own), draft payroll, and post announcements. An HR login linked to a staff profile can also check in/out, request leave, and download its own payslip.
- **Employee:** change their own phone and address, check in/out, request corrections and leave, use smart leave, view balances and payslips, and read announcements.

Admin cover is limited to an HR teammate’s own pending leave or attendance correction. Employee requests stay with HR, and nobody can decide their own request. Approval and correction decisions require a short comment and are recorded in the audit trail. New leave/correction submissions notify the reviewers, decisions notify the requester, and payroll finalization notifies employees that their payslip is ready.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The Vitest suite contains 43 unit tests in 9 files covering date/time-zone handling, attendance classification, geofence math, leave rules, payroll and tax calculations, CSV safety, dashboard metrics, and PKR currency formatting. `npm run e2e` is wired for Playwright, but no browser spec is committed; use [DEMO_RUNBOOK](docs/DEMO_RUNBOOK.md) for a guided manual walkthrough. See [BUILD_STATUS](docs/BUILD_STATUS.md) for the latest evidence and the remaining runtime limits.

## Production build

`npm run build` creates the Next.js production build. `npm start` runs it on port 3000. The app reads server-only environment variables listed in `.env.example`. `GET /api/health` returns `200` only while MongoDB responds to a ping; it returns a generic `503` without database details when unavailable.

The included Dockerfile builds a standalone production image and runs as a non-root user. The source repository is [public on GitHub](https://github.com/xdtechnodreamx0/HCM-Lite), and GitHub currently reports a successful Vercel deployment check for `main`. A successful deploy check alone does not confirm that production environment variables or the database connection work; follow [DEPLOYMENT](docs/DEPLOYMENT.md) and verify `/api/health` on the Vercel URL.

For Vercel, configure `MONGODB_URI`, `SESSION_SECRET`, and `APP_BASE_URL` in the project’s Environment Variables. `MONGODB_DB` is optional and defaults to `hcm_lite`. Add `GEMINI_API_KEY` to enable AI, and add both `RESEND_API_KEY` and `EMAIL_FROM` to send verification and password-reset emails. Keep all values server-side and redeploy after changing them.

## Security notes

- Never commit `.env`, `.env.local`, or real credentials.
- Keep the Gemini key server-side; model tools are allowlisted and read-only.
- Scope data access by company and session role on the server.
- Configure Atlas network access for the deployment using its current supported egress method; do not expose the database broadly.
- Do not load the private source archive into an agent, build context, or public repository.

See [API contract](docs/API_CONTRACT.md), [data model](docs/DATA_MODEL.md), [demo runbook](docs/DEMO_RUNBOOK.md), and [build status](docs/BUILD_STATUS.md).
