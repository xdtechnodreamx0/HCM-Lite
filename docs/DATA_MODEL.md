# Data model

MongoDB collections are defined by `src/server/db/collections.ts`; indexes are created by `src/server/db/indexes.ts`. Every business record carries `companyId`; services derive that ID from the verified session.

| Collection | Purpose | Key constraints |
|---|---|---|
| `companies` | Company identity, calendar and attendance settings | Unique `setupKey` for single-install initialization |
| `users` | Login identity, role, active state, password hash, session version | Unique normalized email; password hash never returned |
| `employees` | Workforce profile and employment lifecycle | Unique company + employee code; unique company + email |
| `departments`, `designations` | Company reference catalogs | Unique company + name; renames retain IDs for historical records |
| `leaveTypes`, `holidays` | Leave policy and company calendar | Unique company + policy code/date |
| `attendance`, `attendanceCorrections` | Daily check events and reviewed corrections | Unique company + employee + work date |
| `leaveRequests`, `leaveUsage` | Requests and annual approved quota consumption | Scoped overlap lookups; unique employee + type + year usage row |
| `salaryStructures` | Employee compensation inputs | Company and employee ownership checked by service |
| `payrollRuns`, `payslips` | Draft/finalized snapshots and employee PDFs | Unique company + period; unique company + employee + period |
| `announcements`, `notifications` | Company notices and recipient inbox | Company + recipient + newest-first indexes |
| `auditLogs` | Append-only business activity | Company + timestamp index; no edit/delete UI |
| `aiLogs` | Bounded assistant audit metadata | Company + actor + timestamp index; no prompt secrets intended |
| `rateLimits` | Expiring server-side request limits | Unique key and TTL expiry index |

Documents use stable application `id` values in addition to Mongo `_id`; `_id` is excluded from API projections. Monetary values are integer paisa. Attendance event times and audit timestamps are server-created `Date` values; work dates and leave boundaries are company-local ISO calendar dates.

## Integrity notes

- Company scope is applied at each service query; employees are further restricted to their session employee ID.
- The setup unique key prevents two concurrent initial Admin claims.
- Payroll and leave transitions use status filters/conditional updates to prevent repeat finalization or quota refunds.
- Multi-document operations that need compensation use rollback paths; Mongo deployments that support transactions may provide stronger atomicity, but standalone/local deployments are not assumed to support transactions.
