# Decisions and research

Updated 2026-11-10 (Asia/Karachi).

| Decision | Reason / evidence |
|---|---|
| Next.js App Router, strict TypeScript, MongoDB driver, and standalone output | Follows the project charter and supports one deployable app with server-side Route Handlers. See [Next.js CLI/build docs](https://nextjs.org/docs/app/api-reference/cli/next). |
| Custom CSS is the active styling system | The shipped app uses a cohesive `src/app/globals.css`; Tailwind/Turbopack CSS processing was removed during the prior build repair. Keep actual dependencies aligned with this decision. |
| Empty first-run setup, no demo data | Keeps judge and company data authentic; setup uniquely claims the primary installation key. |
| Scoped domain services and allowlisted AI tools | Browser/model inputs are never an authority for company, role, ownership, or writes. |
| `gemini-3.8-flash` is the default optional model | Current official Gemini model documentation lists the stable model and function calling support: [Gemini model docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [SDK docs](https://ai.google.dev/gemini-api/docs/libraries). It remains disabled without a server key. |
| GitHub reference used for product architecture only | Reviewed the MIT-licensed [Open HR project](https://github.com/zeon-studio/open-hr) as a reference for HR product boundaries. No repository source was copied into this app; the UI and domain code here are project-specific. |
| Vercel is the connected deployment target; MongoDB remains an external managed service | GitHub reports a completed Vercel deployment for `main`, while database and API integrations still require private environment variables and runtime checks. Configure supported restricted database egress; never expose the database broadly. |
| People directory permissions follow the brief matrix | Admin sees employee records read-only; HR registers, edits, imports, exports, and sets salaries. The previous Admin create/import controls were removed even though Admin can provision logins. This keeps PII and salary editing with the people-operations role and avoids presenting Admin as a superuser for every module. |
| HR self-service requires a linked staff profile | A HR login with `employeeId` can check in/out, request leave, view balances, and download its own payslip; a HR login without a profile gets an explicit “not linked yet” state instead of a broken form. This supports the brief’s HR “Own” check-in/leave cells without inventing a second employee record. |
| No self-approval; Admin cover for HR self-requests only | HR cannot decide its own leave or correction. If HR self-service is used, an active Admin may decide that HR-linked request as an explicit segregation-of-duties exception. Admin remains read-only for ordinary employee requests, and both decision paths are audited. |
| Geofence is server-verified and optional | When Admin sets office latitude/longitude, the browser sends coordinates plus GPS accuracy and the server applies Haversine distance, radius, and accuracy checks before writing attendance. The browser cannot mark a check-in successful on its own. Camera/face detection was not faked; without a real face-detection implementation the app stays with web check-in plus optional location. |
| Reviewers and employees receive in-app notifications | New leave/correction submissions notify the responsible reviewer role, decisions notify the requester, and payroll finalization notifies employees with linked logins. Notification inserts are best-effort so a notification failure does not turn an already-saved business action into a misleading error. |
| Organization catalogs use inline editors | Department, designation, leave-type, and holiday edits stay on the page with visible validation and cancel controls. Replacing `window.prompt` avoids blocking browser dialogs and keeps the interaction testable and consistent with the visual system. |
| Demo data is isolated and marked | The seed only writes to `hcm_lite_demo`, refuses a non-empty unmarked database, and keeps weak demo credentials loopback-only. The demo company leaves geofencing off so judges can exercise check-in without granting a location prompt, while the feature remains available when an Admin configures coordinates. |
| Email and Gemini remain optional with honest disabled states | Resend and Gemini require server-side keys. Without them, the UI explains what is missing and never claims an email or AI answer was produced. This is preferable to canned AI text or simulated delivery in a judged demo. |

## Implementation adjustment

The prompt names Tailwind, while the delivered interface currently uses handwritten CSS and the build was repaired by removing the Tailwind Turbopack loader. This is a documented implementation deviation; the user-facing layout remains responsive custom CSS. Do not add unused styling packages back without a concrete need.
