# Deployment preparation

The target in the project brief is a Dockerized Render web service with MongoDB Atlas. No service, credentials, or public URL is configured by this repository. Treat these as preparation steps, not a completed deployment.

## Build and run

The multi-stage `Dockerfile` builds Next.js standalone output and runs as an unprivileged user on port 3000. Configure the platform health path as `/api/health`; it checks MongoDB and returns a generic `503` when the database cannot be reached. Required runtime environment:

- `MONGODB_URI`: Atlas connection URI
- `MONGODB_DB`: dedicated database name
- `SESSION_SECRET`: fresh random value of at least 32 characters
- `APP_BASE_URL`: exact HTTPS service origin
- `GEMINI_API_KEY`: optional; keep server-side only
- `GEMINI_MODEL`: optional; defaults to `gemini-3.8-flash`
- `RESEND_API_KEY` and `EMAIL_FROM`: optional pair for real first-Admin verification emails. `EMAIL_FROM` must be a sender on a domain verified with Resend.

If enabling email, configure both Resend values together. First Admin setup and newly created HR/employee accounts get a 30-minute verification link, and cannot sign in until it is used. Resend requests are rate limited and the verification token is stored only as a hash. The email provider is optional; setting only one of the two values is a configuration error.

Before publishing, run lint, typecheck, and production build, then build the Docker image and test `/api/health` against a disposable Atlas database. Add only the deployment's currently documented outbound IP ranges to the Atlas IP access list. Never use `0.0.0.0/0`.

## Operations

- Create a dedicated least-privilege database user; store credentials in Render's secret environment settings.
- Use a separate empty database for a judge/demo workspace. Complete Admin setup through the UI, then create real demo accounts there.
- Verify the service URL and health response after deploy. Warm-up/availability must be observed rather than assumed.
- Confirm Atlas backup/restore support for the selected tier before relying on it. Export business data before a planned reset; never run a reset against a production URI.
- Rotate the Mongo credential, session secret, and optional Gemini key through their providers if exposed. Session-secret rotation invalidates existing sessions.
- Review provider pricing and Gemini quotas before enabling external calls; no paid tier is assumed.

## Current blocker

This workspace has no configured Atlas URI, Render account/service, Gemini key, or verified public deployment. The deployment steps above cannot be completed or claimed live without those external resources.
