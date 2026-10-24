# HCM Lite

People.works is a role-scoped human capital management app for one company. It uses Next.js App Router, TypeScript, MongoDB, and server-side route handlers. The first run creates an empty workspace and its first Admin; it does not create sample employees or payroll.

## Requirements

- Docker Desktop (recommended for the full local app)
- Optional for hot-reload development outside Docker: Node.js 20.9 or newer and npm
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

Open `http://localhost:3001/demo` for the fictional guest dashboard or `http://localhost:3001` to sign in. Demo usernames are `admin@northstar.demo`, `hr@northstar.demo`, and `employee@northstar.demo`; each uses password `12345`. These credentials are intentionally weak and are only for a loopback demo; never expose this demo service publicly. The seed script refuses a non-empty database unless it finds its own single marked demo company.

Stop the demo service with `docker compose --profile demo stop app-demo`. Stop the whole local stack with `docker compose down` when finished. MongoDB data remains in the named local volume.

## Appearance, quick help, and AI

Peaceful mode uses softer green colors, a slow ambient background, and restrained shadows. Some people may find that look calmer, but comfort varies and it is not a health treatment. Disco mode adds colorful gradients and slow card/button glow. Both respect the operating system’s reduced-motion preference. Day and Night change the light/dark palette. A short appearance note is available beside the theme selector in the signed-in workspace.

Every signed-in page includes a quick guide and an Ask AI shortcut. The assistant receives the current HCM page label and answers with read-only, role-scoped company tools: Employees can ask only about their own attendance, leave, and pay; HR and Admin can ask approved team/company questions. It does not capture or inspect the computer screen, and it cannot approve requests or modify records. A Gemini key is optional; without it the app displays its honest disabled state. If you configure Gemini, AI prompts and authorized tool results are sent to Google’s Gemini service.

For faster hot-reload development, run `docker compose stop app`, then `docker compose up -d mongodb`, then `npm ci` and `npm run dev -- --hostname 127.0.0.1` in a VS Code terminal. The host development server uses `MONGODB_URI=mongodb://127.0.0.1:27017` from `.env.local`. Stop it with Ctrl+C. Do not run both app modes on port 3000 at the same time.

Setup is permanent for a given database. To start over, point the app to a different empty database rather than deleting records from a shared or production database.

## Main workflows

- **Admin:** configure company/calendar policies, add organization records and users, review dashboards and audit history, and finalize payroll.
- **HR:** manage the employee directory and salary structures, review attendance/corrections and leave, draft payroll, and post announcements.
- **Employee:** change their own profile fields, check in/out, request corrections and leave, view balances and payslips, and read announcements.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

`npm test` and `npm run e2e` are configured, but this checkout currently has no authored test cases. See [BUILD_STATUS](docs/BUILD_STATUS.md) for the checks actually run and the outstanding runtime verification.

## Production build

`npm run build` creates the Next.js production build. `npm start` runs it on port 3000. The app reads server-only environment variables listed in `.env.example`. `GET /api/health` returns `200` only while MongoDB responds to a ping; it returns a generic `503` without database details when unavailable.

The included Dockerfile builds a standalone production image and runs as a non-root user. See [DEPLOYMENT](docs/DEPLOYMENT.md) before using Render/Atlas. No public deployment is configured from this checkout.

## Security notes

- Never commit `.env`, `.env.local`, or real credentials.
- Keep the Gemini key server-side; model tools are allowlisted and read-only.
- Scope data access by company and session role on the server.
- Restrict Atlas network access to the deployment's documented outbound IP ranges. Do not add `0.0.0.0/0`.
- Do not load the private source archive into an agent, build context, or public repository.

See [API contract](docs/API_CONTRACT.md), [data model](docs/DATA_MODEL.md), [demo runbook](docs/DEMO_RUNBOOK.md), and [build status](docs/BUILD_STATUS.md).
