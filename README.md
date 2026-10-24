# HCM Lite

People.works is a role-scoped human capital management app for one company. It uses Next.js App Router, TypeScript, MongoDB, and server-side route handlers. The first run creates an empty workspace and its first Admin; it does not create sample employees or payroll.

## Requirements

- Node.js 20.9 or newer and npm
- A MongoDB database (local MongoDB or MongoDB Atlas)
- A session secret with at least 32 characters
- Optional: a Gemini API key to enable the AI assistant

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI`, `MONGODB_DB`, and `SESSION_SECRET` in `.env.local`. Generate a fresh secret locally; do not reuse this sample text or commit the file.
4. Set `APP_BASE_URL` to the exact origin used in your browser, usually `http://localhost:3000`.
5. Optional: set `GEMINI_API_KEY`. Without it, the app shows an honest unavailable state and the rest of HCM works.
6. Start with `npm run dev` and open `http://localhost:3000`.
7. Complete the one-time Admin setup form. Then create HR/Employee accounts from **User access** or create employee accounts from **People**.

Use a disposable development database for local experimentation. Setup is permanent for a given database; to start over, point the app to a different empty database rather than deleting records from a shared or production database.

For local MongoDB, `docker compose up -d` starts a development-only instance bound to `127.0.0.1:27017` with a persistent local volume. Set `MONGODB_URI=mongodb://127.0.0.1:27017` and `MONGODB_DB=hcm_lite` in `.env.local`.

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
