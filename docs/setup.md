# Setup

Use Node 24.20.0 and npm 11.19.0. Install workspaces from the root with `npm ci`; keep one root lockfile. See [architecture](architecture.md) for how the pieces fit.

Copy each `.env.example` to `.env.local` in its workspace and fill it in:

- `frontend/web`: public Supabase URL and key, and the API URL.
- `backend/api`: the same Supabase values, plus `CORS_ALLOWED_ORIGINS`. Optionally the AI service and worker secrets.
- `ai`: `AI_SERVICE_TOKEN`, plus provider keys if you have them.

Never commit local environment files.

For local Supabase with Docker:

```sh
npm run db:start
npx supabase status
npm run db:test
```

The configured project is `beyond`; ports are API 55321, DB 55322, Mailpit 55324. Do not expose this stack as production. Apply migrations to the hosted project only as a separate authorized deployment step.

Run the three services:

```sh
npm run dev:api -- --port 3002
npm run dev:ai                     # http://127.0.0.1:3003
npm run dev:web                    # http://localhost:3000
```

- Open `http://localhost:3000/app`, and include that exact origin in the API's CORS list.
- Without Supabase settings, `/app` says it isn't connected; it never shows fictional data in place of an account.
- Without provider keys, the AI service reports "not configured" and sealed letters wait.
- To run the letter worker locally, POST `{"limit":3}` to `/api/v1/internal/letters/process` with `Authorization: Bearer $LETTER_JOB_TRIGGER_SECRET`.

In Supabase Auth, configure a site URL and allow `/auth/callback` and `/auth/callback?flow=recovery` on the web origin. Enable email/password, and Google with its provider credentials. Email confirmation and recovery links must be opened in the same browser that started the flow (PKCE).

Checks:

```sh
npm run check:deps
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:palette
npm run build:api && npm run build:ai
NEXT_PUBLIC_SUPABASE_URL=https://sb.example.test NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture \
  NEXT_PUBLIC_API_URL=https://api.example.test npm run build:web
npm run test:design    # Chromium drives /app against a fake Auth and API
```

Real local acceptance needs a running local stack and production builds of the API and AI service:

```sh
npm run test:api:writing
```

It starts the AI service against a stub model on loopback and runs letters end to end. For the connected browser test, install Playwright Chromium and run `node tests/build-connected-web.mjs` while local Supabase is running. Then set `TEST_CONNECTED_BROWSER=true`. The runner refuses non-local targets and cleans up only the fictional users it created. CI runs all of this. Never aim these harnesses at a hosted project.
