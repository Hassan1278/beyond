# Working in Beyond

Hassan owns this repository. He has authorized committing, pushing, opening and merging pull requests to `main`, and configuring/deploying the hosted Beyond Supabase project and the Vercel `beyond-api`/`beyond-web`/`beyond-ai` projects. Force pushes, resetting the hosted database and deleting hosted users still need his explicit say-so.

Read [README](README.md), [architecture](docs/architecture.md) and the doc for the area you are changing before editing.

## Layout

`frontend/web` (site and the journal app at `/app`), `backend/api`, `ai/` (letter service), `shared/`, `supabase/` (database), `tests/`, `docs/`. Keep that separation: UI code never imports backend or AI code; the backend never imports UI or AI code; they share only `shared/`. The AI service talks to the backend only over its HTTP contract.

## Rules

- Preserve the existing design. The journal app keeps the prototype's views, wording and styles: `frontend/web/src/journal/app.js` and `journal.css` stay in the prototype's layout so later changes can be carried over line by line. Fictional data is only for explicit demo/marketing modes and tests; never fall back to demo or template content for real accounts.
- The AI service gets one prepared input per call and returns checked output. Never give it database or admin credentials, identity, or anything beyond [docs/ai-service.md](docs/ai-service.md). Never log journal text or provider errors. Empty provider keys mean "not configured", never a fake letter.
- Product handlers use a freshly verified Supabase bearer and the public key, derive ownership server-side, enforce active profiles and live Auth sessions (RLS + RPCs), exact-origin CORS and no-store responses. CORS is not authentication.
- Security-definer RPCs use an empty search path and validated arguments. Never expose original payloads, idempotency keys, context metadata, forgotten-memory hashes, quotas or queues to clients. Preserve revisions, original-payload retries, current-resource replay and content-free tombstones.
- Exports, content clearing and deletion require recent sign-in. Worker routes use independent trigger secrets, bounded batches and fenced leases. Extend privacy cascades whenever adding owned storage or context.
- Sealing a night is the consent for its letter. Editing or deleting a night removes its letter; memory edits, forgetting or pausing cancel in-flight context; keeping a letter private removes notes built on it. A letter may learn at most two checked memories, each visible, editable and forgettable; forgotten ones are never relearned.
- Journal text lives only in memory and the backend: never browser local/session storage or offline caches. Web sessions use sessionStorage.
- Node `24.20.0`, npm `11.19.0`, root workspaces, exact pins, one lockfile. Never force peer resolution. Commit env examples with dummy values only.
- Database changes are new, additive migrations with pgTAP coverage. Never edit an applied migration or reset the hosted project.
- Run lint/types/unit/build checks and the journal browser flow (`npm run test:design`); real Supabase/browser acceptance runs in CI. Say plainly which checks could not run.
- Use fictional content in tests. Local Supabase uses API 55321 / DB 55322 / Mailpit 55324. Fixture harnesses must refuse hosted targets. Never log credentials, private payloads, passwords or upstream errors.
- Don't spawn subagents unless asked. Keep Hassan informed and end with what is left (keys, configuration, frontend).
