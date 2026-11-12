# Five-minute demo runbook

Use the isolated local demo from the README. It seeds `hcm_lite_demo` with synthetic Northstar Studio records and demo-only accounts. Do not seed production or share these demo credentials publicly.

Demo credentials (all use `12345`):

- Admin: `admin@northstar.demo` (Nadia Rahman)
- HR: `hr@northstar.demo` (linked to Iqra Javed)
- Employee: `employee@northstar.demo` (Sana Malik)
- Employee: `taimur@northstar.demo` (Taimur Raza)
- Employee: `sarmad@northstar.demo` (Sarmad Baig)

Open `/demo` for the one-click persona launcher; each card signs in to that person’s real workspace. Open `/customer` for the separate customer portal: enter any name and email to see a read-only, sanitized snapshot of the demo company. The initial records include 17 fictional employees, six departments, recent attendance, leave requests (including one approved leave today), announcements, 2026 joiners, and draft/finalized payroll examples. A reseed resets the marked demo workspace to this exact snapshot and refuses unrelated populated databases. The demo company has no office coordinates configured, so check-in does not request browser location; geofencing is demonstrated only after an Admin sets coordinates.

1. Sign in as Admin and review the company calendar, user access, company-wide leave history, and audit trail. Open the seeded notification about Iqra Javed’s pending HR leave request.
2. As Admin, link or inspect the HR account’s staff profile in **User access**; the People directory is intentionally read-only for Admin.
3. Sign in as HR and try directory search, salary tools, the pending leave and attendance-correction queues. Use **My check-in** and **My leave requests** to show HR self-service; the HR self-request cannot be approved by HR.
4. Sign back in as Admin and decide the pending HR leave request. This is the documented Admin-cover exception, not the normal employee approval path.
5. Sign in as Employee and review personal attendance, balances, announcements, notifications, and the finalized sample payslip. Submit a leave or correction request to show the reviewer notification.
6. Open `/demo`, then use one-click sign-in for Admin, HR, and an Employee to show how each persona lands in a different workspace. Open `/customer`, enter any name and email, and confirm the read-only badge, company snapshot, and sign-out. Confirm a customer session cannot call `/api/dashboard`.
7. As HR, create one profile-only employee and one login employee. Show that the login path returns a one-time temporary password; signing in with it forces a password change before the portal opens.
8. Try the Ask AI shortcut and quick guide. With a Gemini key configured, ask Admin for headcount and ask an Employee for their annual leave balance, then ask the Employee for company-wide headcount to show the refusal. Without a key, confirm the honest disabled state.
9. Try Peaceful and Disco themes. Peaceful uses softer colors and slow motion; comfort varies, and this is not health advice. Reduced-motion settings disable animation.
10. Open `/api/health` and confirm MongoDB responds before the demo. Open `/signup/company` and confirm that, without Resend, it explains the missing setup and disables submission. Use signup/reset links only after configuring Resend.

The flows above are a guide, not completed manual evidence. Record the test database name, roles exercised, and observed outcomes in `docs/BUILD_STATUS.md` after a real walkthrough. Never include passwords, API keys, or personal employee details in a recording.
