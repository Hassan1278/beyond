# Deployment

## Hosted resources

| Piece             | Where                                                                                             | Status                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Database + Auth   | Supabase org **Beyond**, project `beyond` (ref `wrjlpfnotylrdewvgsgn`, Singapore, Postgres 17)    | All 11 migrations applied; readiness gate passes                                |
| Product API       | Vercel team `smigmi1278-9965`, project `beyond-api`, Root Directory `backend/api`, region `sin1`  | `https://beyond-api-three.vercel.app`                                           |
| Website + journal | Vercel team `smigmi1278-9965`, project `beyond-web`, Root Directory `frontend/web`, region `sin1` | `https://beyond-web-wheat.vercel.app` (app at `/app`)                           |
| AI letter service | Vercel team `smigmi1278-9965`, project `beyond-ai`, Root Directory `ai`, region `sin1`            | `https://beyond-ai-smigmi1278-9965.vercel.app`; provider keys empty until added |

Supabase URL: `https://wrjlpfnotylrdewvgsgn.supabase.co`. Only the publishable key (`sb_publishable_…`) ever goes to the API's normal routes or to clients.

## Database

Apply migrations in filename order, once each, with `supabase db push` or the Supabase GitHub integration; the hosted migration history matches `supabase/migrations/`. Never edit an applied migration.

After applying, verify with the Supabase security and performance advisors, and check that `GET /api/health/ready` on the API returns `200`. It returns `503` until the `beyond-letters-v1` release marker exists.

## Vercel projects

All three projects import `Hassan1278/beyond` from GitHub and use:

- **Root Directory:** `backend/api`, `frontend/web` or `ai`
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
| `beyond-api` | `AI_SERVICE_URL`                       | the AI service origin, `https://beyond-ai-smigmi1278-9965.vercel.app`                       |
|              | `AI_SERVICE_TOKEN`                     | random, sensitive; same value as on `beyond-ai`                                             |
|              | `LETTER_JOB_TRIGGER_SECRET`            | random, sensitive; same value as the Vault secret `beyond_letter_job_trigger`               |
| `beyond-ai`  | `AI_SERVICE_TOKEN`                     | same as on `beyond-api`                                                                     |
|              | `AI_PROVIDER`                          | `auto` (uses whichever key is set; Anthropic first)                                         |
|              | `ANTHROPIC_API_KEY`                    | **empty until you add it** (sensitive). Letters wait in the queue until then                |
|              | `ANTHROPIC_MODEL`                      | `claude-sonnet-5-5`                                                                         |
|              | `OPENAI_API_KEY`, `TRANSCRIBE_MODEL`   | optional: voice transcription (and letters, if no Anthropic key); model `whisper-1`         |

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy the web project after changing them. Server variables (API and AI) take effect on the next deployment too: after adding a key, redeploy `beyond-ai`.

The AI project has no Supabase variables at all.

Account deletion (API only): `ACCOUNT_JOB_TRIGGER_SECRET` and `SUPABASE_SECRET_KEY` (both sensitive), then `ACCOUNT_DELETION_ENABLED=true` and a redeploy. Until all three are present, the delete button stays hidden and the worker returns `503`. The letter worker uses the same `SUPABASE_SECRET_KEY`.

## Schedulers

Both workers are triggered from the database itself, so there is no extra service to run:

- Extensions `pg_cron` and `pg_net` are enabled. `pg_net` belongs in the `extensions` schema (`drop extension pg_net; create extension pg_net with schema extensions;`); its functions always live under `net.*`.
- Supabase Vault holds the trigger bearers as `beyond_account_job_trigger` and `beyond_letter_job_trigger`. They hold the same values as the API's `ACCOUNT_JOB_TRIGGER_SECRET` and `LETTER_JOB_TRIGGER_SECRET`.
- Cron job `beyond-account-cleanup` runs every 5 minutes. It `POST`s `{"limit":5}` to `https://beyond-api-three.vercel.app/api/v1/internal/accounts/process` with its bearer and no `Origin` header.
- Cron job `beyond-letter-writer` runs every minute. It `POST`s `{"limit":3}` to `https://beyond-api-three.vercel.app/api/v1/internal/letters/process` with its bearer. While the AI service has no key, each run checks its health and claims nothing.

Check recent runs with `select status_code, created from net._http_response order by created desc limit 5;` and `select * from cron.job_run_details order by start_time desc limit 5;`. To rotate the secret, update the Vault secret and the Vercel variable together, then redeploy the API. If the API address changes, `cron.alter_job` the URL. This setup is environment-specific and intentionally not a migration.

## Supabase Auth settings (dashboard)

**Authentication → URL Configuration**

- **Site URL:** `https://beyond-web-wheat.vercel.app`
- **Redirect URLs:**
  - `https://beyond-web-wheat.vercel.app/auth/callback`
  - `https://beyond-web-wheat.vercel.app/auth/callback?flow=recovery`
  - `http://localhost:3000/auth/callback` (local development)

**Authentication → Sign In / Providers → Google**

1. In [Google Cloud Console](https://console.cloud.google.com/), create or pick a project.
2. **Google Auth Platform → Branding:** app name `Beyond`, your support email and developer contact email. The app domain fields can stay empty until Beyond has its own domain.
3. **Audience:** user type **External**. While it is in **Testing**, only listed test users can sign in; click **Publish app** to allow everyone. The default `openid`, `email` and `profile` scopes do not need Google verification.
4. **Clients → Create client:** type **Web application**.
   - Authorized JavaScript origins: `https://beyond-web-wheat.vercel.app`
   - Authorized redirect URIs: `https://wrjlpfnotylrdewvgsgn.supabase.co/auth/v1/callback`
5. Copy the client ID and secret into Supabase's Google provider and enable it.

**Email:** Supabase's built-in mailer only sends a few messages per hour. Configure custom SMTP (Authentication → Emails → SMTP settings) before real users sign up.

## Verify a deployment

1. `GET <api>/api/health/live` → `200`. `GET <api>/api/health/ready` → `200`.
2. `GET <api>/api/v1/entries` without a token → `401`. A preflight from an unlisted origin is refused.
3. `GET <api>/api/v1/ai` with a signed-in token reports `letters: true` once a provider key is set.
4. On the website `/app`: sign in, seal a night, and see "Sealed for the night.". With a key, the letter is written within a minute (Read it now). Sign out, sign back in and see it. A second account must not see it.

## Phones

There is no separate native app. On a phone, open `/app` and use **Add to Home Screen**: the manifest opens `/app` full-screen with the app's colours. The session lasts until the app or tab is closed.

## Rollback

Roll back web, API or AI with Vercel's "Promote previous deployment". Never reset the hosted database. If letters misbehave, clear `ANTHROPIC_API_KEY` on `beyond-ai` (or pause the `beyond-letter-writer` cron job): sealing keeps working and letters wait. The letters migration dropped the unused first reflection tables (they were empty), so API builds from before it report not-ready; roll back the API only together with the web app.
