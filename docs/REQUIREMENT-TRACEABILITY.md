# Requirement traceability

The brief’s acceptance list is mapped below. “Implemented” means an end-to-end implementation path exists; “unit-tested” means the pure rule or calculation is covered by the committed Vitest suite. Neither label implies a live database, browser, provider, or production test passed. See [build status](BUILD_STATUS.md) for evidence limits.

| # | Capability | Main implementation | State |
|---:|---|---|---|
| 1 | Empty one-time company/Admin setup | `src/features/app/components/auth-gate.tsx`; `src/server/services/setup.service.ts`; `src/server/db/indexes.ts` | Implemented; concurrent setup relies on a unique setup key; final live DB walkthrough pending |
| 2 | Login/logout, sessions, password expiry/change | `src/server/services/auth.service.ts`; `src/server/auth/sessions.ts`; `src/app/api/auth/` | Implemented; earlier role smoke check passed; final live session walkthrough pending |
| 3 | Admin provisions/deactivates/resets accounts | `src/features/app/components/people-view.tsx` (`UsersView`); `src/server/services/auth.service.ts`; `/api/users` | Implemented; Admin can link/unlink an HR staff profile; employee logins stay linked; live matrix check pending |
| 4 | Company and attendance policy settings | `organization-view.tsx`; `organization.service.ts` | Implemented; office coordinates/radius configured here; server geofence is unit-tested; live browser check pending |
| 5 | Department/designation management | `organization-view.tsx`; `organization.service.ts`; `/api/departments`, `/api/designations` | Implemented with inline create/rename; no destructive delete, preserving references |
| 6 | Leave policy/calendar | `organization-view.tsx`; `organization.service.ts`; `/api/leave-types`, `/api/holidays` | Implemented with inline editors; create/update/activate leave types and add/edit holidays; live behavior pending |
| 7 | Employee create/edit/profile privacy | `people-view.tsx`; `employee.service.ts` | Implemented; Admin read-only, HR manages records, Employee edits only phone/address; live walkthrough pending |
| 8 | Filtered, sorted, paginated directory and 360 | `people-view.tsx`; `employee.service.ts`; `/api/employees` | Implemented; server-side search/status/department/sort/paging; populated browser check pending |
| 9 | CSV dry run/import/export | `people-view.tsx`; `src/lib/csv.ts`; `employee.service.ts`; `/api/employees/import`, `/export` | Implemented for HR; formula-safe CSV and dry-run errors are unit-tested; large-file/browser download check pending |
| 10 | Server-time check-in/out and attendance rules | `attendance-view.tsx`; `src/lib/attendance-rules.ts`; `src/lib/geo.ts`; `attendance.service.ts` | Implemented; server timestamps, grace/half-day rules, optional geofence; rules and Haversine math unit-tested; live clock/GPS check pending |
| 11 | Attendance board/status filters | `attendance-view.tsx`; `attendance.service.ts` | Implemented for Admin/HR; date and department filters; live role/date check pending |
| 12 | Attendance correction workflow | `attendance-view.tsx`; `/api/corrections` | Implemented; employee/HR requests, HR decisions, Admin cover for HR self-requests, no self-approval, requester notification; live concurrency check pending |
| 13 | Leave apply/cancel/history/balance | `leave-view.tsx`; `leave.service.ts` | Implemented for Employee and linked HR; overlapping/quota/holiday rules unit-tested; live calendar edge cases pending |
| 14 | HR leave decision, overlap, quota, notification | `leave.service.ts`; `notifications.service.ts` | Implemented; HR decides employee requests, Admin decides only HR-linked self-requests, decisions notify the requester; live concurrency check pending |
| 15 | PKR salary structures/composition | `src/lib/currency.ts`; `src/lib/payroll-rules.ts`; employee salary API | Implemented; HR manages salary, Admin views; payroll/currency calculations unit-tested |
| 16 | Monthly payroll, deductions, proration, tax, finalization | `payroll.service.ts`; payroll UI/API | Implemented; HR drafts, Admin finalizes and locks; payroll/tax rules unit-tested; DB atomicity not verified live |
| 17 | Owner-scoped PDF payslip | payroll service; `/api/payroll/[period]/payslip` | Implemented; service and route enforce owner scope; PDF runtime not verified in the final pass |
| 18 | Admin dashboard and audit feed | `dashboard.service.ts`; `dashboard-view.tsx`; audit service | Implemented; date/department filters and server range validation; dashboard metrics unit-tested; populated-DB verification pending |
| 19 | HR attendance/leave health dashboard | dashboard service/UI | Implemented; filtered KPIs, trend, latecomers, and server summary; metrics unit-tested; live trends pending |
| 20 | Employee dashboard and self-service | dashboard service/UI | Implemented; personal hours, late count, leave, last payslip; employee scope not verified live |
| 21 | Read-only scoped assistant tools | `ai.service.ts`; `/api/ai/chat` | Implemented with server role scope and allowlisted tools; an HR-linked profile can use own-data tools; Gemini key not configured |
| 22 | Smart leave prefill and employee confirmation | assistant and leave views; AI service | Implemented for Employee and linked HR; JSON draft is validated and the user must confirm; provider behavior unverified |
| 23 | Server-derived KPI summaries/fallback | AI service; `/api/ai/status` | Implemented; summary receives the current dashboard filters and uses server data; external API behavior unverified |
| 24 | Announcements and notifications | communications/notifications services and views | Implemented; review requests, decisions, and finalized payslips create in-app notifications; live delivery check pending |
| 25 | Append-only audit records and Admin review | `audit.service.ts`; audit UI/API | Implemented; decisions and business changes are audited; persistence and retention check pending |
| 26 | Signup, company signup, sign-in, email verification, and password reset | `public-auth-views.tsx`; `/api/auth/`; `tenant.service.ts` | Implemented; additional company workspaces require Resend and a verified Admin address; no delivery claimed without it |
| 27 | Admin-controlled role assignment and pending employee signups | `auth.service.ts`; user access view | Implemented; role changes enforce employee linkage and last-Admin protection; earlier local role smoke check passed |
| 28 | Fictional demo launcher, five role personas, and read-only customer portal | `/demo`; `/customer`; `scripts/seed-demo.mjs`; Docker Compose demo profile | Implemented; one-click sign-in reaches each persona’s real workspace; the customer portal reads only a sanitized snapshot and cannot call staff APIs; keep the demo loopback-only |
| 29 | Day, night, peaceful, and disco appearance modes | `theme-provider.tsx`; `globals.css` | Implemented; respects reduced-motion preference; visual browser review not recorded |
| 30 | Persistent quick guides and contextual role-aware assistant entry points | `hcm-portal.tsx`; `assistant-view.tsx`; `/api/ai/chat` | Implemented; assistant uses page context and server role scope; live answers require Gemini |
| 31 | Real-time employee directory search, help text, and guest updates | `people-view.tsx`; `/api/employees`; `/demo` | Implemented; earlier guest page returned HTTP 200; populated search browser walkthrough pending |
| 32 | Mobile-friendly navigation, workspace footer, and visual motion | `globals.css`; portal and guest page components | Implemented; responsive layout builds; device/browser visual review pending |
| 33 | HR self-service with segregation of duties | `authorization.ts`; `leave.service.ts`; `attendance.service.ts`; `UsersView` profile linking | Implemented; linked HR can act on own records, cannot self-approve, and Admin can decide only an HR teammate’s self-request; live walkthrough pending |

## Coverage gaps

The repository now includes 43 authored Vitest unit tests across dates, attendance rules, geofence math, leave rules, payroll, tax, CSV, dashboard metrics, and currency. There is no committed Playwright/browser suite, and the final pass could not run Docker or a seeded MongoDB walkthrough because the Docker daemon was unavailable. No item above should be reported as independently browser-tested until that evidence is recorded. Production Vercel runtime, Resend delivery, and Gemini answers also remain unverified without configured credentials.
