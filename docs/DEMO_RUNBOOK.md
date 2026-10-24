# Five-minute demo runbook

Use the isolated local demo from the README. It seeds `hcm_lite_demo` with synthetic Northstar Studio records and demo-only accounts. Do not seed production or share these demo credentials publicly.

Demo credentials (all use `12345`):

- Admin: `admin@northstar.demo`
- HR: `hr@northstar.demo`
- Employee: `employee@northstar.demo` (Sana Malik)

Open `/demo` for a read-only guest preview. Sign in to the separate demo app on port 3001 to exercise role-based workspaces. The initial records include 16 fictional employees, six departments, recent attendance, leave requests, announcements, and draft/finalized payroll examples. The seed script is idempotent for its marked demo database and refuses unrelated populated databases.

1. Sign in as Admin and review the company calendar, access list, and audit trail.
2. Try directory search, the pending leave and attendance-correction queues, then post a sample announcement as HR.
3. Sign in as Employee and review personal attendance, balances, announcements, and the finalized sample payslip.
4. Try the Ask AI shortcut and quick guide. Add a Gemini API key to enable live answers; role-filtered answers use only permitted data.
5. Try Peaceful and Disco themes. Peaceful uses softer colors and slow motion; comfort varies, and this is not health advice. Reduced-motion settings disable animation.
6. Open `/api/health` and confirm MongoDB responds before the demo. Use signup/reset links only after configuring Resend.

The flows above are a guide, not completed manual evidence. Record the test database name, roles exercised, and observed outcomes in `docs/BUILD_STATUS.md` after a real walkthrough. Never include passwords, API keys, or personal employee details in a recording.
