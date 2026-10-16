# Beyond

A private journal for the web and every phone: write tonight, nothing replies, a letter arrives in the morning.

The marketing site is at `/`. The journal app is at `/app`; on a phone it can be added to the home screen. Supabase handles accounts and Postgres. A separate API owns all product logic. An independent AI service writes the letters and stores nothing.

## Repository layout

```
frontend/
  web/        Next.js: marketing site (src/site), journal app at /app (src/journal)   (@beyond/web)
backend/
  api/        Product API. Routes in src/app/api/**/route.ts, logic in src/server       (@beyond/api)
ai/           Letter service: letters, Patterns notes, voice transcription              (@beyond/ai)
shared/       Request/response schemas and the typed API client                          (@beyond/shared)
supabase/     Database: migrations, pgTAP tests, local config
tests/        Cross-stack checks: API/letters/browser acceptance, journal flow, palette
docs/         Architecture, API, database, AI contract, deployment, privacy, setup, demo
```

## Docs

| Doc                                  | Read it for                                          |
| ------------------------------------ | ---------------------------------------------------- |
| [Architecture](docs/architecture.md) | How the pieces connect, and the route → handler map  |
| [API reference](docs/api.md)         | Every endpoint, its inputs, limits and errors        |
| [Database](docs/database.md)         | Tables, migrations, how to add schema                |
| [AI service](docs/ai-service.md)     | The letter contract and how to switch the keys on    |
| [Deployment](docs/deployment.md)     | What's live where, environment variables, schedulers |
| [Landing page](docs/landing-page.md) | How `/` is built, and why it shows the journal's own components |
| [Setup](docs/setup.md)               | Running everything locally                           |
| [Privacy](docs/privacy.md)           | Data handling rules                                  |
| [Demo](docs/demo.md)                 | Showing Beyond with Kit's fictional journal          |

## Quick start

Node `24.20.0` and npm `11.19.0`, one root lockfile.

```sh
npm ci
cp backend/api/.env.example backend/api/.env.local      # then fill in
cp frontend/web/.env.example frontend/web/.env.local    # then fill in
cp ai/.env.example ai/.env.local                        # keys optional
npm run dev:api -- --port 3002
npm run dev:ai                                          # http://127.0.0.1:3003
npm run dev:web                                         # http://localhost:3000
```

- `http://localhost:3000/` is the marketing site.
- `http://localhost:3000/app` is the journal (sign in with a Supabase account).

Checks (all run in CI):

```sh
npm run lint && npm run typecheck && npm test
npm run test:palette
npm run build:api && npm run build:ai && npm run build:web
npm run test:design      # drives /app in Chromium against a fake backend (build web first)
```

Database tests need Docker: `npm run db:start && npm run db:test`.

## What's built

**Accounts.** Email and password, Google sign-in, password reset.

**Writing and letters.**

- Write or speak a night and seal it.
- A letter is written in the voice and language you chose. It quotes your exact words and ends with three small to-dos you can tick or skip.
- Letters arrive at your chosen time, or right away if you allow it.
- Kept letters build Patterns: month, year and Identity, with month and year notes written on request.
- Memory shows what letters learned or what you told Beyond. You can edit, forget or pause it.

**Your data.** Download a copy, delete your journal, or delete your account. A safety check while writing, plus Hong Kong support contacts.

**Behind it.** Everything runs on the real backend. The AI service is built and wired; its provider keys are empty until you add them.

## What's left

1. **Add the AI keys** in the `beyond-ai` Vercel project (see [AI service](docs/ai-service.md#turning-it-on)). Until then, letters wait in the queue.
2. **Email.** Custom SMTP before more than a handful of sign-ups. Supabase's built-in mailer is rate-limited.
3. **Review the AI provider's retention terms** before real users write.

Packages are private and must not be published to npm.
