# Deployment

## Hosted resources

| Piece             | Where                                                                                             | Status                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Database + Auth   | Supabase org **Beyond**, project `beyond` (ref `wrjlpfnotylrdewvgsgn`, Singapore, Postgres 17)    | All 10 migrations applied; readiness gate passes |
| Product API       | Vercel team `smigmi1278-9965`, project `beyond-api`, Root Directory `backend/api`, region `sin1`  | Created; `https://beyond-api-three.vercel.app`   |
| Website + web app | Vercel team `smigmi1278-9965`, project `beyond-web`, Root Directory `frontend/web`, region `sin1` | Created; `https://beyond-web-wheat.vercel.app`   |
| AI letter service | `ai/`, see [AI service](ai-service.md)                                                            | Not built                                        |

Supabase URL: `https://wrjlpfnotylrdewvgsgn.supabase.co`. Only the publishable key (`sb_publishable_…`) ever goes to the API's normal routes or to clients.

## Database

Apply migrations in filename order, once each, with `supabase db push` or the Supabase GitHub integration; the hosted migration history matches `supabase/migrations/`. Never edit an applied migration.

After applying, verify with the Supabase security and performance advisors, and check that `GET /api/health/ready` on the API returns `200`. It returns `503` until the `connected-text-v1` release marker exists.

## Vercel projects

Both projects import `Hassan1278/beyond` from GitHub and use:

- **Root Directory:** `backend/api` or `frontend/web`
- **Include files outside the Root Directory:** on
- **Node.js:** 24.x
- Install/build come from each app's `vercel.json`: npm 11.19.0, root `npm ci`, `npm run build`, region `sin1`

Pushes to `main` deploy to production; pull requests get previews. Previews share the production database only if you give them production variables, so leave preview variables unset (unconfigured previews show a setup screen) or point them at a Supabase branch.

### Environment variables

| Project      | Variable                               | Value                                                                                       |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `beyond-api` | `SUPABASE_URL`                         | `https://wrjlpfnotylrdewvgsgn.supabase.co`                                                  |
|              | `SUPABASE_PUBLISHABLE_KEY`             | the project's `sb_publishable_…` key                                                        |
|              | `CORS_ALLOWED_ORIGINS`                 | the web production origin, `https://beyond-web-wheat.vercel.app` (exact, no trailing slash) |
| `beyond-web` | `NEXT_PUBLIC_SUPABASE_URL`             | same Supabase URL                                                                           |
|              | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same publishable key                                                                        |
|              | `NEXT_PUBLIC_API_URL`                  | the API production origin, `https://beyond-api-three.vercel.app`                            |

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy the web project after changing them.

Optional, API only:

- Account deletion: `ACCOUNT_JOB_TRIGGER_SECRET` (set, sensitive), `SUPABASE_SECRET_KEY` (the project's `sb_secret_…` key, sensitive; added by the owner in the Vercel dashboard), then `ACCOUNT_DELETION_ENABLED=true` and a redeploy. Until all three are present the delete button stays disabled and the worker returns `503`.
- Letters: see [AI service](ai-service.md#turning-it-on).

### Account cleanup scheduler

The cleanup worker is triggered from the database itself, so there is no extra service to run:

- Extensions `pg_cron` and `pg_net` are enabled. `pg_net` belongs in the `extensions` schema (`drop extension pg_net; create extension pg_net with schema extensions;`); its functions always live under `net.*`.
- Supabase Vault holds the trigger bearer as `beyond_account_job_trigger` (same value as the API's `ACCOUNT_JOB_TRIGGER_SECRET`).
- Cron job `beyond-account-cleanup` runs every 5 minutes and `POST`s `{"limit":5}` to `https://beyond-api-three.vercel.app/api/v1/internal/accounts/process` with that bearer and no `Origin` header.

Check recent runs with `select status_code, created from net._http_response order by created desc limit 5;` and `select * from cron.job_run_details order by start_time desc limit 5;`. To rotate the secret, update the Vault secret and the Vercel variable together, then redeploy the API. If the API address changes, `cron.alter_job` the URL. This setup is environment-specific and intentionally not a migration.

## Supabase Auth settings (dashboard)

**Authentication → URL Configuration**

- **Site URL:** `https://beyond-web-wheat.vercel.app`
- **Redirect URLs:**
  - `https://beyond-web-wheat.vercel.app/auth/callback`
  - `https://beyond-web-wheat.vercel.app/auth/callback?flow=recovery`
  - `http://localhost:3000/auth/callback` (local development)
  - `beyond:///auth/callback` (native app; this is what `Linking.createURL('/auth/callback', { scheme: 'beyond' })` produces)

**Authentication → Sign In / Providers → Google**

1. In [Google Cloud Console](https://console.cloud.google.com/), create or pick a project.
2. **Google Auth Platform → Branding:** app name `Beyond`, your support email and developer contact email. The app domain fields can stay empty until Beyond has its own domain.
3. **Audience:** user type **External**. While it is in **Testing**, only listed test users can sign in; click **Publish app** to allow everyone. The default `openid`, `email` and `profile` scopes do not need Google verification.
4. **Clients → Create client:** type **Web application**.
   - Authorized JavaScript origins: `https://beyond-web-wheat.vercel.app`
   - Authorized redirect URIs: `https://wrjlpfnotylrdewvgsgn.supabase.co/auth/v1/callback`
5. Copy the client ID and secret into Supabase's Google provider and enable it. The same client serves web and the native app, because both go through Supabase's callback.

**Email:** Supabase's built-in mailer only sends a few messages per hour. Configure custom SMTP (Authentication → Emails → SMTP settings) before real users sign up.

## Verify a deployment

1. `GET <api>/api/health/live` → `200`. `GET <api>/api/health/ready` → `200`.
2. `GET <api>/api/v1/entries` without a token → `401`. A preflight from an unlisted origin is refused.
3. On the website `#/app`: sign up, confirm the email, write, edit, reload, sign out, then sign back in and see the entry. A second account must not see it.

## Mobile

Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL` (the API origin) before an EAS build. Bundle identifiers are provisional; confirm them before store registration. JS exports in CI do not prove a native build; test on devices.

## Rollback

Roll back web/API with Vercel's "Promote previous deployment". Migrations are additive, so older API versions keep working against the newer schema. Never reset the hosted database. If letters misbehave, set `REFLECTIONS_ENABLED=false` and redeploy the API; writing keeps working.
