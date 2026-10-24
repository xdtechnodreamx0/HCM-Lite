# API Contract

This contract applies to every Next.js Route Handler under `src/app/api/`.

## Request and response rules

- JSON requests are parsed as untrusted input and validated with the domain Zod schema before any write.
- The verified session supplies company, user, role, and employee identity. A request body never supplies authoritative identity or ownership.
- Success responses are JSON unless the route explicitly returns a CSV or PDF with the correct content type and a safe filename.
- Errors use `{ "error": "...", "code"?: "...", "details"?: ... }` and stable status codes: 401 unauthenticated, 403 forbidden, 404 missing or out of scope, 409 duplicate/conflict, 422 invalid input or business rule, and 429 rate limited.
- Unexpected failures return a generic 500 without stack traces, database details, credentials, or personal records.
- Mutations require same-origin requests, authorization, validation, and an audit entry where they change business data.
- Every query includes the authenticated company ID. Employee requests additionally include the session employee ID; never trust a client-provided company ID or role.
- Lists use allowlisted filters, stable sort order, and bounded pagination. CSV output is formula-safe and excludes secrets and password/session fields.
- Payroll finalization is an Admin-only idempotent state transition. Finalized snapshots are immutable. Payslip endpoints enforce employee ownership server-side.
- AI routes may call only named, read-only domain functions that apply the same role and ownership rules. Model output cannot directly mutate data.

## Route map

| Method and path | Access | Purpose |
|---|---|---|
| `GET/POST /api/setup` | Public before setup; one-time POST | Setup availability and initial company/Admin |
| `GET /api/session` | Public | Initialization state and current safe session summary |
| `POST /api/auth/login`, `/logout`, `/password` | Public / signed-in | Authentication and password lifecycle |
| `GET/POST /api/users`, `PATCH /api/users/:id` | Admin | HR account provisioning, activation, reset |
| `GET/PATCH /api/organization` | Admin/HR read; Admin write | Company policy/settings |
| `GET/POST /api/departments`, `/designations`, `/leave-types`, `/holidays` | Admin manages; HR reads | Organization records |
| `PATCH /api/departments/:id`, `/designations/:id`, `/leave-types/:id`, `/holidays/:id` | Admin | Rename catalogs and update/activate policies/calendar records |
| `GET /api/health` | Public | MongoDB-aware service health for deployment probes |
| `GET/POST /api/employees`, `GET/PATCH /api/employees/:id` | Admin/HR; Employee own | Directory, employee profile and registration |
| `GET /api/attendance`, `POST /api/attendance/check-in`, `/check-out` | Role-scoped | Board/history and self attendance actions |
| `GET/POST /api/corrections`, `PATCH /api/corrections/:id` | Employee requests; HR decides | Attendance correction workflow |
| `GET/POST /api/leaves`, `GET /api/leave-balances`, `PATCH /api/leaves/:id` | Employee own; HR decides; Admin reads | Leave workflow and balances |
| `GET/POST /api/payroll`, `POST /api/payroll/finalize`, `GET /api/payroll/:period/payslip` | HR drafts; Admin finalizes; Employee own PDF | Payroll lifecycle |
| `GET /api/dashboard` | Role-scoped | Persisted role dashboard metrics |
| `GET/POST /api/announcements`, `GET /api/notifications` | Signed-in; Admin/HR post | Communications |
| `GET /api/audit` | Admin | Append-only company audit review |
| `POST /api/ai/chat` | Signed-in, rate limited | Scoped read-only assistant, or honest disabled status |
