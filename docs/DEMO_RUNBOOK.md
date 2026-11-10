# Five-minute demo runbook

Use the isolated local demo from the README. It seeds `hcm_lite_demo` with synthetic Northstar Studio records and demo-only accounts. Do not seed production or share these demo credentials publicly.

Demo credentials (all use `12345`):

- Admin: `admin@northstar.demo`
- HR: `hr@northstar.demo` (linked to Iqra Javed)
- Employee: `employee@northstar.demo` (Sana Malik)

Open `/demo` for a read-only guest preview. Its role cards prefill the selected email on sign-in. Sign in to the separate demo app on port 3001 to exercise role-based workspaces. The initial records include 16 fictional employees, six departments, recent attendance, leave requests, announcements, and draft/finalized payroll examples. The seed script is idempotent for its marked demo database and refuses unrelated populated databases. The demo company has no office coordinates configured, so check-in does not request browser location; geofencing is demonstrated only after an Admin sets coordinates.

1. Sign in as Admin and review the company calendar, user access, company-wide leave history, and audit trail. Open the seeded notification about Iqra Javed’s pending HR leave request.
2. As Admin, link or inspect the HR account’s staff profile in **User access**; the People directory is intentionally read-only for Admin.
3. Sign in as HR and try directory search, salary tools, the pending leave and attendance-correction queues. Use **My check-in** and **My leave requests** to show HR self-service; the HR self-request cannot be approved by HR.
4. Sign back in as Admin and decide the pending HR leave request. This is the documented Admin-cover exception, not the normal employee approval path.
5. Sign in as Employee and review personal attendance, balances, announcements, notifications, and the finalized sample payslip. Submit a leave or correction request to show the reviewer notification.
6. Try the Ask AI shortcut and quick guide. Add a Gemini API key to enable live answers; role-filtered answers use only permitted data. Without a key, confirm the honest disabled state.
7. Try Peaceful and Disco themes. Peaceful uses softer colors and slow motion; comfort varies, and this is not health advice. Reduced-motion settings disable animation.
8. Open `/api/health` and confirm MongoDB responds before the demo. Use signup/reset links only after configuring Resend.

The flows above are a guide, not completed manual evidence. Record the test database name, roles exercised, and observed outcomes in `docs/BUILD_STATUS.md` after a real walkthrough. Never include passwords, API keys, or personal employee details in a recording.
