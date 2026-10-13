# Working in Beyond

Hassan owns this repository. He has authorized committing, pushing, opening and merging pull requests to `main`, and configuring/deploying the hosted Beyond Supabase project and the Vercel `beyond-api`/`beyond-web` projects. Force pushes, resetting the hosted database, deleting hosted users and native store releases still need his explicit say-so.

Read [README](README.md), [architecture](docs/architecture.md) and the doc for the area you are changing before editing.

## Layout

`frontend/` (web, mobile, ui), `backend/api`, `shared/`, `supabase/` (database), `ai/` (reserved), `tests/`, `docs/`. Keep that separation: UI code never imports backend code; the backend never imports UI; both share only `shared/`.

## Rules

- Preserve the existing design. Undesigned/unbuilt features stay empty for real accounts. Fictional data is only for explicit demo/presenter/marketing modes and tests; never fall back to demo content for real accounts.
- `ai/` belongs to the AI service owner. The backend implements only the HTTP contract and job lifecycle in [docs/ai-service.md](docs/ai-service.md). Never give the AI service database or admin credentials.
- Product handlers use a freshly verified Supabase bearer and the public key, derive ownership server-side, enforce active profiles and live Auth sessions (RLS + RPCs), exact-origin CORS and no-store responses. CORS is not authentication.
- Security-definer RPCs use an empty search path and validated arguments. Never expose original payloads, idempotency keys, context metadata, quotas or queues to clients. Preserve revisions, original-payload retries, current-resource replay and content-free tombstones.
- Exports, content clearing and deletion require recent sign-in. Worker routes use independent trigger secrets, bounded batches and fenced leases. Extend privacy cascades whenever adding owned storage or context.
- Entry edits cancel old reflection work; memory changes/pause cancel queued context; forgetting a source removes derived content. Accepting an action creates at most one todo. No automatic memory approval.
- Journal text lives only in memory and the backend: never browser local/session storage or offline caches. Web sessions use sessionStorage; native sessions use encrypted, byte-bounded SecureStore chunks.
- Node `24.20.0`, npm `11.19.0`, root workspaces, exact pins, one lockfile. Expo native modules must match SDK57; never force peer resolution. Commit env examples with dummy values only.
- Database changes are new, additive migrations with pgTAP coverage. Never edit an applied migration or reset the hosted project.
- Run lint/types/unit/design/build checks; real Supabase/browser acceptance runs in CI. Say plainly which checks could not run. JS exports do not prove a native build.
- Use fictional content in tests. Local Supabase uses API 55321 / DB 55322 / Mailpit 55324. Fixture harnesses must refuse hosted targets. Never log credentials, private payloads, passwords or upstream errors.
- Don't spawn subagents unless asked. Keep Hassan informed and end with what is left (AI, configuration, device, frontend).
