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

Optional, API only, leave unset until each worker is scheduled and tested:

- Account deletion: `ACCOUNT_DELETION_ENABLED=true`, `SUPABASE_SECRET_KEY`, `ACCOUNT_JOB_TRIGGER_SECRET`, plus a scheduler calling `POST /api/v1/internal/accounts/process`.
- Letters: see [AI service](ai-service.md#turning-it-on).

## Supabase Auth settings (dashboard)

Authentication → URL Configuration:

- **Site URL:** the web production origin.
- **Redirect URLs:** `<web origin>/auth/callback` and `<web origin>/auth/callback?flow=recovery`, plus `http://localhost:3000/auth/callback` for local development and `beyond://auth/callback` for the native app.

Authentication → Providers: email/password is on by default. Supabase's built-in mailer is rate-limited, so configure custom SMTP before real users sign up. For Google sign-in, add the Google OAuth client ID/secret and add Supabase's callback URL to the Google console.

## Verify a deployment

1. `GET <api>/api/health/live` → `200`. `GET <api>/api/health/ready` → `200`.
2. `GET <api>/api/v1/entries` without a token → `401`. A preflight from an unlisted origin is refused.
3. On the website `#/app`: sign up, confirm the email, write, edit, reload, sign out, then sign back in and see the entry. A second account must not see it.

## Mobile

Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL` (the API origin) before an EAS build. Bundle identifiers are provisional; confirm them before store registration. JS exports in CI do not prove a native build; test on devices.

## Rollback

Roll back web/API with Vercel's "Promote previous deployment". Migrations are additive, so older API versions keep working against the newer schema. Never reset the hosted database. If letters misbehave, set `REFLECTIONS_ENABLED=false` and redeploy the API; writing keeps working.
