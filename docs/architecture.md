# Architecture

```
               ┌──────────── frontend/ ────────────┐
               │ web (Next)    mobile (Expo)       │  both render the same screens from frontend/ui
               └──────┬───────────────┬────────────┘
     Supabase Auth ◄──┤  bearer token │
     (sign-in, refresh)               ▼
               ┌──────────── backend/api ──────────┐
               │ routes: src/app/api/**/route.ts   │  verify token → active profile → live session
               │ logic:  src/server/*.ts           │
               └──────┬───────────────────┬────────┘
                      │ user-scoped RPCs  │ (optional, server-only)
                      ▼                   ▼
               supabase/ (Postgres)     ai/ letter service  ← not built yet
```

`shared/` holds the request/response schemas and the typed API client used by the frontend, the backend and (later) the AI service.

## Frontend

| Folder            | What it is                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `frontend/ui`     | All app screens, styles, themes and the app state/controller (`src/state/store.tsx`)                |
| `frontend/web`    | Next.js site: marketing pages (`src/site`), presenter (`src/presenter`), hash router, auth callback |
| `frontend/mobile` | Expo app that embeds `frontend/ui` through Expo DOM, with native sign-in, SecureStore and sharing   |

Web routes are hash-based (`src/router.tsx`): `#/` marketing, `#/how`, `#/privacy`, `#/beta` …, `#/app` the real app, and `?demo=1#/app` the fictional presenter demo. Production journal text is never stored in the browser; web keeps only the Auth session in sessionStorage, mobile keeps it in encrypted SecureStore chunks.

## Backend routes

Each URL is a folder under `backend/api/src/app/api/` containing a `route.ts` that delegates to `src/server/`.

| Route                                         | Handler (`src/server/`)                  |
| --------------------------------------------- | ---------------------------------------- |
| `GET /api/health/live`, `/api/health/ready`   | `health-check.ts`, `health.ts`           |
| `/api/v1/entries`, `/entries/:id`             | `writing-runtime.ts`                     |
| `/api/v1/settings`                            | `product-runtime.ts`                     |
| `/api/v1/memories`, `/memories/:id`           | `product-runtime.ts`                     |
| `/api/v1/todos`, `/todos/:id`                 | `product-runtime.ts`                     |
| `/api/v1/account`, `/account/data`            | `account-runtime.ts`                     |
| `/api/v1/account/export`                      | `export-runtime.ts`                      |
| `/api/v1/entries/:id/reflection`              | `reflection-runtime.ts`                  |
| `/api/v1/reflections`, `/:id`, `/:id/actions` | `reflection-runtime.ts`                  |
| `POST /api/v1/internal/reflections/process`   | `reflection-runtime.ts` (scheduler only) |
| `POST /api/v1/internal/accounts/process`      | `account-runtime.ts` (scheduler only)    |

Shared plumbing: `http.ts` (responses, CORS, request IDs, no-store), `transport.ts` (bounded body reading), `budget.ts` (rate limits), `config.ts` (environment). Full contracts are in [API reference](api.md).

Every product request freshly verifies the Supabase bearer, requires an active profile and a live owned Auth session, and derives ownership server-side. CORS allows exact configured origins only; it is not authentication. Normal routes use only the public Supabase key; admin credentials are used only by the optional scheduler workers.

## Database

See [database](database.md). RLS and validated `security definer` RPCs enforce ownership even if the API were bypassed.

## AI

See [AI service](ai-service.md). The backend already handles consent, next-morning scheduling, leases, retries, validation, storage and privacy cleanup. The service only turns one entry into one letter.

## Data rules

Writes are revisioned; retries replay the original payload and return the current resource; deleted content cannot be resurrected. Editing or deleting an entry cancels its letter work and removes derived letters/tasks. Pausing or changing memory cancels queued context. AI never approves memories or creates to-dos on its own. More detail: [privacy](privacy.md).
