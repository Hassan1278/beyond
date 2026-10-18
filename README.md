# Beyond

A private journal for the web and every phone: write tonight, nothing replies, a letter arrives in the morning.

> **Hackathon project.** Beyond was built by a student team for a hackathon. It is a working prototype on real infrastructure, not a finished product.

## Try it

**Live: [beyond-web-wheat.vercel.app](https://beyond-web-wheat.vercel.app)**

- **Website:** [beyond-web-wheat.vercel.app](https://beyond-web-wheat.vercel.app)
- **Journal app:** [beyond-web-wheat.vercel.app/app](https://beyond-web-wheat.vercel.app/app). Create an account (or use Google), go through the short welcome, write a night and seal it. In Demo mode, **Skip to morning** opens the letter once it's written, usually within a minute. On a phone, use **Add to Home Screen**.

Please write fictional things when trying it: the AI provider sees what you seal.

## How it works

The marketing site is at `/`. The journal app is at `/app`; on a phone it can be added to the home screen. Supabase handles accounts and Postgres. A separate API owns all product logic. An independent AI service writes the letters (Claude, through OpenRouter) and stores nothing.

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

- A short welcome on first sign-in: what brings you here, who writes your letters, privacy, your name.
- Write or speak a night in a notebook-style journal and seal it. English, Cantonese and Mandarin, in any mix.
- The next morning a letter arrives in the voice you chose: one flowing letter built around your own words, one question to think about and one small step. Doing the step earns a gold seal.
- Identity is the home page: the directions your nights point to, today's step and your to-dos.
- Growth shows your nights over the month and year. Memory shows what letters learned or what you told Beyond; you can edit, forget or pause it.
- Demo mode (the default) adds Kit, a fictional student's journal, and sample nights to try. Normal mode is just your own journal.

**Your data.** Download a copy, delete your journal, or delete your account. A safety check while writing, plus Hong Kong support contacts.

**Behind it.** Everything runs on the real backend: accounts, the database, the letter service and voice transcription are live.

## Beyond the hackathon

1. **Email.** Custom SMTP before more than a handful of sign-ups. Supabase's built-in mailer is rate-limited.
2. **Review the AI provider's retention terms** before real users write.
3. **Switch the default to Normal mode**, so new accounts start with only their own journal.

Packages are private and must not be published to npm.
