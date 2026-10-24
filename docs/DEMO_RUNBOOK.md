# Five-minute demo runbook

Use an isolated empty database and start with the browser at the service origin. Create each account through the Admin interface; do not seed production or use a shared database.

1. On the empty installation, complete one-time company/Admin setup and show the timezone, office start, grace period, weekends, and location policy.
2. As Admin, add a department, designation, leave type, HR account, and announcement.
3. Sign in as HR; create an employee with a salary structure and show directory filters, CSV dry run, employee details, attendance board, and approval queues.
4. Sign in as Employee; change the temporary password if prompted, check in/out, request leave, and inspect balances, announcements, and own payslip history.
5. Return as HR to approve/reject leave and review corrections. Return as Admin to show dashboard metrics, audit trail, and finalize a payroll period once.
6. Open `/api/health` and confirm MongoDB responds before the demo.

The flows above are a guide, not completed manual evidence. Record the test database name, roles exercised, and observed outcomes in `docs/BUILD_STATUS.md` after a real walkthrough. Never include passwords, API keys, or personal employee details in a recording.
