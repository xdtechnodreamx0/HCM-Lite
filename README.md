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
