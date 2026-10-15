# Architecture

```
            ┌───────────── frontend/web (Next.js, one Vercel project) ─────────────┐
            │  /            marketing site (hash pages, fictional demo pieces)     │
            │  /app         the journal app (prototype design, real accounts)      │
            │  /auth/callback  email links and Google sign-in land here            │
            └──────┬──────────────────────────────┬────────────────────────────────┘
  Supabase Auth ◄──┤ sign-in, refresh             │ bearer token (shared API client)
                   ▼                              ▼
            ┌───────────── backend/api ─────────────────────────────┐
            │ routes: src/app/api/**/route.ts → logic: src/server   │  verify token → active profile → live session
            └──────┬──────────────────────────────┬─────────────────┘
                   │ user-scoped RPCs             │ bearer AI_SERVICE_TOKEN, one prepared input
                   ▼                              ▼
            supabase/ (Postgres + RLS)        ai/ letter service ──► model provider
                   ▲                              (no DB access, stores nothing)
   pg_cron ────────┘ calls the API's worker routes every minute (letters) / 5 min (account cleanup)
```

`shared/` holds the request/response schemas and the typed API client used by the web app and the backend. The AI service is independent and has its own copy of its input checks.

## Frontend (`frontend/web`)

| Path                | What it is                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `src/app/(site)`    | Root layout and page for the marketing site                                               |
| `src/site`, `data`  | Site pages and copy; `#/how`, `#/privacy`, `#/beta` … (hash routes)                       |
| `src/demo`          | Fictional demo pieces used on the site (Try one night, Patterns); memory-only             |
| `src/app/(journal)` | Root layout for `/app` and `/auth/callback`                                               |
| `src/journal`       | The journal app: `app.js` + `journal.css` (the app's own code), `backend.ts` (Auth + API) |

The journal app is the prototype's single-page app, ported with its wording and motion, and since PR #12 laid out as **Tonight · Letters · Identity · Patterns · Settings** (screenshots in [`docs/screenshots/pc-redesign`](screenshots/pc-redesign)). Old links still work (`#profile` → Letters, `#you` → Settings). Its storage and AI calls were replaced:

- Settings, nights, letters, to-dos, memory, notes, voice, export and deletion go through `backend.ts`, which wraps Supabase Auth and the shared API client.
- Journal text is held in memory only.
- The Supabase session lives in sessionStorage.
- Display choices (write or speak, speech language, demo mode) live in localStorage.

## Backend routes

| Route                                                                    | Handler (`src/server/`) |
| ------------------------------------------------------------------------ | ----------------------- |
| `GET /api/health/live`, `/api/health/ready`                              | `health-check.ts`       |
| `/api/v1/entries`, `/entries/:id`                                        | `writing-runtime.ts`    |
| `/api/v1/settings`, `/memories`, `/memories/:id`, `/todos`, `/todos/:id` | `product-runtime.ts`    |
| `/api/v1/account`, `/account/data`                                       | `account-runtime.ts`    |
| `/api/v1/account/export`                                                 | `export-runtime.ts`     |
| `/api/v1/letters`, `/letters/:id`, `/letters/:id/retry`                  | `letter-runtime.ts`     |
| `/api/v1/notes`, `/api/v1/ai`, `/api/v1/transcribe`                      | `letter-runtime.ts`     |
| `POST /api/v1/internal/letters/process` (scheduler only)                 | `letter-runtime.ts`     |
| `POST /api/v1/internal/accounts/process` (scheduler only)                | `account-runtime.ts`    |

Shared plumbing:

- `http.ts`: responses, request IDs, no-store
- `transport.ts`: bounded bodies, CORS, RPC calls
- `budget.ts`: rate limits
- `config.ts`: environment

Full contracts are in the [API reference](api.md).

Every product request freshly verifies the Supabase bearer, requires an active profile and a live owned Auth session, and derives ownership server-side. CORS allows exact configured origins only; it is not authentication. Normal routes use only the public Supabase key. The secret key is used only by the scheduled workers.

## Database

See [database](database.md). RLS and validated `security definer` RPCs enforce ownership even if the API were bypassed.

## AI

See [AI service](ai-service.md). The backend and database own consent (sealing), the queue, leases, retries, daily limits, storage and privacy cascades. The service only turns one prepared input into one checked letter or note.

## Data rules

- Writes are revisioned; retries replay the original payload and return the current resource; deleted content cannot be resurrected.
- Editing or deleting a night removes its letter.
- Changing, forgetting or pausing memory cancels a letter being written with the old context.
- Keeping a letter private removes notes built on it and stops its learned memories being used.
- Forgotten memories are never learned again.

More detail: [privacy](privacy.md).
