# API contract

See [CONTRACT.md](CONTRACT.md) for the full route and security contract. This file records implementation-wide response and ownership rules.

- Route Handlers live under `src/app/api`; validation and business rules live in `src/server/services`.
- Parse request JSON as `unknown` and validate it with Zod before writes. Reject unknown keys for settings and other patch contracts where schemas are strict.
- The signed session is authoritative for company, user, role and employee ownership. A request body cannot choose them.
- Success is JSON except CSV/PDF downloads. Errors are sanitized `{ error, code?, details? }` payloads.
- Mutations require same-origin/CSRF validation, explicit role checks, and an audit record for business changes.
- Lists use allowlisted filters and bounded pagination. CSV exports omit credentials and escape formula-leading cells.
- Payroll finalization is Admin-only and idempotent; payslips enforce owner scope in the service and route.
- AI may call only server-defined read-only tools; it cannot write data or choose authorization scope.

The implementation includes `/api/health` for MongoDB-aware deployment checks and `PATCH /api/departments/:id`, `/api/designations/:id` for Admin catalog renames.
