# Beyond

A private journaling app for web, Android and iOS: write at night, get a letter in the morning. Supabase handles accounts and the Postgres database, a separate API owns all product logic, and the letter-writing AI is an independent service that is not built yet.

## Repository layout

```
frontend/
  web/        Next.js site: marketing pages, presenter demo, the web app shell   (@beyond/web)
  mobile/     Expo app for Android/iOS, embedding the same screens               (@beyond/mobile)
  ui/         Shared app screens, styles, themes and app state                   (@beyond/app-ui)
backend/
  api/        Product API. Routes in src/app/api/**/route.ts, logic in src/server (@beyond/api)
shared/       Request/response schemas and typed API client used everywhere      (@beyond/shared)
supabase/     Database: migrations, pgTAP tests, local config
ai/           Reserved for the independent AI letter service (+ evaluation plan)
tests/        Cross-stack checks: API smoke/acceptance, browser acceptance, design renders
docs/         Architecture, API, database, AI contract, deployment, privacy, setup, demo
```

## Docs

| Doc                                  | Read it for                                                       |
| ------------------------------------ | ----------------------------------------------------------------- |
| [Architecture](docs/architecture.md) | How the pieces connect, and the full route → handler map          |
| [API reference](docs/api.md)         | Every endpoint, its inputs, limits and errors                     |
| [Database](docs/database.md)         | Tables, migrations, how to add schema                             |
| [AI service](docs/ai-service.md)     | **The remaining feature**: exact contract and how to switch it on |
| [Deployment](docs/deployment.md)     | What's live where, environment variables, rollout steps           |
| [Setup](docs/setup.md)               | Running everything locally                                        |
| [Privacy](docs/privacy.md)           | Data handling rules                                               |
| [Demo](docs/demo.md)                 | The fictional presenter mode                                      |

## Quick start

Node `24.20.0` and npm `11.19.0`, one root lockfile.

```sh
npm ci
cp backend/api/.env.example backend/api/.env.local      # then fill in
cp frontend/web/.env.example frontend/web/.env.local    # then fill in
npm run dev:api -- --port 3002
npm run dev:web                                         # http://localhost:3000
```

- `http://localhost:3000/#/`: marketing site
- `http://localhost:3000/#/app`: the real app (needs Supabase + API configured)
- `http://localhost:3000/?demo=1&mode=present#/app`: fictional presenter demo (no backend needed)

Checks (all run in CI):

```sh
npm run lint && npm run typecheck && npm test
npm run test:design && npm run test:palette
npm run build:api && npm run build:web && npm run check:mobile
```

Database tests need Docker: `npm run db:start && npm run db:test`.

## What's built

Sign-up/sign-in, Google sign-in handoff, password recovery and session refresh. Writing, editing and deleting entries with revision conflicts and safe retries. Preferences, explicitly approved memories, to-dos, paginated exports, content clearing and optional account deletion. The backend side of letters is also done: per-entry consent, next-morning scheduling, durable jobs, the HTTP handoff to the AI service, storing letters, corrections and accept/reject of suggested tasks. The designed screens are wired to all of this.

## What's left

1. **AI letter service.** Build it in `ai/` to the contract in [docs/ai-service.md](docs/ai-service.md), then switch it on with four environment variables and a scheduler.
2. **Hosting finishing touches.** Auth email/redirect URLs, Google provider keys, and the account-deletion scheduler. See [deployment](docs/deployment.md).
3. **Native release.** Device testing and store builds for Android/iOS.
4. **Later features.** Voice capture/transcription, and real patterns/Wrapped analysis. Their screens stay empty for real accounts until then.

Packages are private and must not be published to npm.
