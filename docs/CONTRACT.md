# API Contract

This contract applies to every Next.js Route Handler under `src/app/api/`.

## Request and response rules

- JSON requests are parsed as untrusted input and validated with the domain Zod schema before any write.
- The verified session supplies company, user, role, and employee identity. A request body never supplies authoritative identity or ownership.
- Success responses are JSON unless the route explicitly returns a CSV or PDF with the correct content type and a safe filename.
- Errors use `{ "error": "...", "code"?: "...", "details"?: ... }` and stable status codes: 401 unauthenticated, 403 forbidden, 404 missing or out of scope, 409 duplicate/conflict, 422 invalid input or business rule, and 429 rate limited.
- Unexpected failures return a generic 500 without stack traces, database details, credentials, or personal records.
- Mutations require same-origin requests, authorization, validation, and an audit entry where they change business data.
- Every query includes the authenticated company ID. Employee and HR self-service requests additionally include the session employee ID; never trust a client-provided company ID, role, or employee ID.
- HR self-service requires a login linked to an employee profile. HR cannot decide its own leave/correction; Admin may decide only an HR-linked employee’s self-request as a segregation-of-duties exception.
- Lists use allowlisted filters, stable sort order, and bounded pagination. CSV output is formula-safe and excludes secrets and password/session fields.
- Payroll finalization is an Admin-only idempotent state transition. Finalized snapshots are immutable. Payslip endpoints enforce employee ownership server-side.
- When office coordinates are configured, check-in validates the submitted location server-side with the Haversine distance, configured radius, and accuracy limit. A successful browser response is never treated as proof of presence.
- AI routes may call only named, read-only domain functions that apply the same role and ownership rules. Model output cannot directly mutate data.

## Route map

| Method and path | Access | Purpose |
|---|---|---|
| `GET/POST /api/setup` | Public before setup; one-time POST | Setup availability and initial company/Admin |
| `GET /api/session` | Public | Initialization state and current safe session summary |
| `POST /api/auth/login`, `/logout`, `/password` | Public / signed-in | Authentication and password lifecycle |
| `POST /api/auth/signup/company`, `POST /api/auth/verify-code` | Public; company sign-up requires configured email | Additional company workspace, then 6-digit or link verification before portal access |
| `GET /api/demo/accounts`, `POST /api/auth/demo-login` | Public; `DEMO_MODE=true` and seeded `demoAccount` only | Demo persona list and one-click demo login |
| `GET/POST/DELETE /api/customer/session` | Public; `DEMO_MODE=true` and seeded demo company only | Read-only customer session and sanitized snapshot; grants no staff API access |
| `GET/POST /api/users`, `PATCH /api/users/:id` | Admin | HR/Admin login provisioning, activation, role, staff-profile link, reset |
| `GET/PATCH /api/organization` | Admin/HR read; Admin write | Company policy/settings |
| `GET/POST /api/departments`, `/designations`, `/leave-types`, `/holidays` | Admin manages; HR reads | Organization records |
| `PATCH /api/departments/:id`, `/designations/:id`, `/leave-types/:id`, `/holidays/:id` | Admin | Rename catalogs and update/activate policies/calendar records |
| `GET /api/health` | Public | MongoDB-aware service health for deployment probes |
| `GET/POST /api/employees`, `GET/PATCH /api/employees/:id` | Admin/HR; Employee own | Directory, employee profile and registration |
| `GET /api/attendance`, `POST /api/attendance/check-in`, `/check-out` | Role-scoped; `?mine=1` for linked HR | Board/history and self attendance actions with optional server-verified location |
| `GET/POST /api/corrections`, `PATCH /api/corrections/:id` | Employee/HR own requests; HR decides; Admin covers HR self-requests | Attendance correction workflow |
| `GET/POST /api/leaves`, `GET /api/leave-balances`, `PATCH /api/leaves/:id` | Employee/HR own; HR decides; Admin covers HR self-requests and reads company history | Leave workflow and balances |
| `GET/POST /api/payroll`, `POST /api/payroll/finalize`, `GET /api/payroll/:period/payslip` | HR drafts; Admin finalizes; Employee own PDF | Payroll lifecycle |
| `GET /api/dashboard` | Role-scoped | Persisted role dashboard metrics |
| `GET/POST /api/announcements`, `GET /api/notifications` | Signed-in; Admin/HR post | Communications |
| `GET /api/audit` | Admin | Append-only company audit review |
| `POST /api/ai/chat` | Signed-in, rate limited | Scoped read-only assistant, or honest disabled status |
