# Decisions and research

Updated 2026-10-25 (Asia/Karachi).

| Decision | Reason / evidence |
|---|---|
| Next.js App Router, strict TypeScript, MongoDB driver, and standalone output | Follows the project charter and supports one deployable app with server-side Route Handlers. See [Next.js CLI/build docs](https://nextjs.org/docs/app/api-reference/cli/next). |
| Custom CSS is the active styling system | The shipped app uses a cohesive `src/app/globals.css`; Tailwind/Turbopack CSS processing was removed during the prior build repair. Keep actual dependencies aligned with this decision. |
| Empty first-run setup, no demo data | Keeps judge and company data authentic; setup uniquely claims the primary installation key. |
| Scoped domain services and allowlisted AI tools | Browser/model inputs are never an authority for company, role, ownership, or writes. |
| `gemini-3.8-flash` is the default optional model | Current official Gemini model documentation lists the stable model and function calling support: [Gemini model docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [SDK docs](https://ai.google.dev/gemini-api/docs/libraries). It remains disabled without a server key. |
| GitHub reference used for product architecture only | Reviewed the MIT-licensed [Open HR project](https://github.com/zeon-studio/open-hr) as a reference for HR product boundaries. No repository source was copied into this app; the UI and domain code here are project-specific. |
| Render + Atlas are deployment targets, not claims of deployment | Network access and account setup require user-controlled credentials and current provider configuration. Restrict Atlas access to documented deployment egress addresses; never open the database to the world. |

## Implementation adjustment

The prompt names Tailwind, while the delivered interface currently uses handwritten CSS and the build was repaired by removing the Tailwind Turbopack loader. This is a documented implementation deviation; the user-facing layout remains responsive custom CSS. Do not add unused styling packages back without a concrete need.
