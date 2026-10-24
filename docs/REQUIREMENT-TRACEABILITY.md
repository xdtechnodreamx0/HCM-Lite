# Requirement traceability

The prompt's acceptance list is mapped below. “Code present” means an implementation path exists; it does not imply a live database, role matrix, browser, or deployment test passed. See [build status](BUILD_STATUS.md) for evidence limits.

| # | Capability | Main implementation | State |
|---:|---|---|---|
| 1 | Empty one-time company/Admin setup | `src/features/app/components/auth-gate.tsx`; `src/server/services/setup.service.ts`; `src/server/db/indexes.ts` | Code present; concurrent setup relies on unique setup key; live DB unverified |
| 2 | Login/logout, sessions, password expiry/change | `src/server/services/auth.service.ts`; `src/server/auth/sessions.ts`; `src/app/api/auth/` | Code present; live session flow unverified |
| 3 | Admin provisions/deactivates/resets accounts | `src/features/app/components/portal-views.tsx`; `src/server/services/auth.service.ts`; `/api/users` | Code present; role matrix unverified |
| 4 | Company and attendance policy settings | `src/features/app/components/organization-view.tsx`; `src/server/services/organization.service.ts` | Code present; timezone/location behavior unverified live |
| 5 | Department/designation management | `organization-view.tsx`; `organization.service.ts`; `/api/departments`, `/api/designations` | Create and rename implemented; no destructive delete, preserving references |
| 6 | Leave policy/calendar | `organization-view.tsx`; `organization.service.ts`; `/api/leave-types`, `/api/holidays` | Create/update/activate leave types; add/edit holidays; live behavior unverified |
| 7 | Employee create/edit/profile privacy | `src/features/app/components/people-view.tsx`; `src/server/services/employee.service.ts` | Code present; role walkthrough unverified |
| 8 | Filtered, sorted, paginated directory and 360 | `people-view.tsx`; `employee.service.ts`; `/api/employees` | Code present; UI/API integration unverified live |
| 9 | CSV dry run/import/export | `people-view.tsx`; `src/lib/csv.ts`; `employee.service.ts`; `/api/employees/import`, `/export` | Code present; large-file and browser download behavior unverified |
| 10 | Server-time check-in/out and attendance rules | `attendance-view.tsx`; `src/lib/attendance-rules.ts`; `attendance.service.ts` | Code present; clock/geofence behavior unverified live |
| 11 | Attendance board/status filters | `attendance-view.tsx`; `attendance.service.ts` | Code present; role/date cases unverified |
| 12 | Attendance correction workflow | `src/features/app/components/attendance-view.tsx`; `/api/corrections` | Code present; concurrent decisions unverified |
| 13 | Leave apply/cancel/history/balance | `src/features/app/components/leave-view.tsx`; `leave.service.ts` | Code present; calendar edge cases unverified |
| 14 | HR leave decision, overlap, quota, notification | `leave.service.ts`; `src/server/services/notifications.service.ts` | Code present; concurrent decisions unverified |
| 15 | PKR salary structures/composition | `src/lib/currency.ts`; `src/lib/payroll-rules.ts`; employee salary API | Code present; domain examples not rerun |
| 16 | Monthly payroll, deductions, proration, tax, finalization | `src/server/services/payroll.service.ts`; payroll UI/API | Code present; DB atomicity and calculations not verified against live data |
| 17 | Owner-scoped PDF payslip | payroll service; `/api/payroll/[period]/payslip` | Code present; standalone/runtime PDF path unverified |
| 18 | Admin dashboard and audit feed | `src/server/services/dashboard.service.ts`; dashboard UI; audit service | Code present; metrics not verified against populated DB |
| 19 | HR attendance/leave health dashboard | dashboard service/UI | Code present; trends not verified against populated DB |
| 20 | Employee dashboard and self-service | dashboard service/UI | Code present; employee scope not verified live |
| 21 | Read-only scoped assistant tools | `src/server/services/ai.service.ts`; `/api/ai/chat` | Code present; Gemini key/provider not configured |
| 22 | Smart leave prefill and employee confirmation | assistant and leave views; AI service | Code present; provider behavior unverified |
| 23 | Server-derived KPI summaries/fallback | AI service; `/api/ai/status` | Code present; external API behavior unverified |
| 24 | Announcements and notifications | communications/notifications services and views | Code present; delivery unverified live |
| 25 | Append-only audit records and Admin review | `src/server/services/audit.service.ts`; audit UI/API | Code present; persistence and retention unverified live |

## Coverage gaps

No authored unit, integration, or browser tests are present in this checkout. No item above should be reported as independently tested until the corresponding isolated database/browser evidence is recorded.
