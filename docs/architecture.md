# Architecture

## System boundary

One personal private repository contains three npm workspaces. The Node.js backend lives inside the Next.js web workspace, with route handlers as its HTTP boundary. There is no separate `apps/api` service for the MVP.

## Why not top-level frontend and backend folders?

Frontend and backend responsibilities are separated by folders inside the web app. Next.js handles both website routes and HTTP API routes, so one deployment can serve the website and the API used by mobile. Business logic remains isolated from UI code.

| Boundary                                    | Current folders                                                 |
| ------------------------------------------- | --------------------------------------------------------------- |
| Web frontend                                | `apps/web/src/app` except `api`, plus `apps/web/src/components` |
| Mobile frontend                             | `apps/mobile/src`                                               |
| Backend HTTP boundary                       | `apps/web/src/app/api`                                          |
| Backend business logic / AI / jobs          | `apps/web/src/server`                                           |
| Backend database configuration / migrations | `supabase`                                                      |
| Portable contracts used on both sides       | `packages/shared`                                               |

Next.js expects route handlers inside its `app` directory, which explains the API folder there. Keep handlers thin: authentication and request parsing at the boundary, then calls into the server services. Backend credentials and provider code must remain server-only. Sharing a deployment does not mean shipping backend code or secrets to a client.

A separate `apps/api` is also possible within the same private repository. It would own its own server framework, dependencies, runtime, deployment, and API origin; web and mobile would both call it. This gives independent backend scaling/releases and is useful when long-running workers or persistent connections exceed the chosen Next.js hosting runtime. It also adds hosting, networking/CORS, authentication integration, and release coordination. Simply renaming folders does not create that independent service.

For this MVP, keep the proposed Next.js API with clear server ownership and durable database jobs. If measured workloads need a separate worker/API service, extract the services behind the same shared contracts. Separate developers and coding harnesses can already work on frontend/backend using the owned paths in `docs/workstreams.md`.

```text
Web screens ────┐
                ├── shared API contract/client
Mobile screens ─┘             │
                              v
                    Next.js Node.js routes
                              │
                     backend services
                        │           │
                        v           v
                    Supabase    server AI adapter

Supabase scheduler ──> protected job route ──> durable database jobs
```

Web and mobile may use Supabase client SDKs for authentication. Product operations go through the shared backend. User-scoped database clients and row-level security both enforce ownership. Admin access is isolated to narrowly defined account deletion and job operations.

## Folder responsibilities

| Path                           | Owns                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `apps/web/src/app`             | Web routes, layouts, and thin authenticated HTTP handlers                |
| `apps/web/src/components`      | Browser UI                                                               |
| `apps/web/src/lib`             | Browser-safe configuration and auth adapters                             |
| `apps/web/src/server/services` | Journal, reflection, memory, settings, account business rules            |
| `apps/web/src/server/ai`       | Provider adapter, prompts, output validation                             |
| `apps/web/src/server/jobs`     | Claim/process/retry orchestration                                        |
| `apps/mobile/src/app`          | Expo Router screens and layouts                                          |
| `apps/mobile/src/lib`          | Native session storage, config, API client adapter                       |
| `packages/shared/src`          | Portable types, validation, API client, product limits                   |
| `supabase`                     | Local configuration, schema migrations, policies, durable job primitives |
| `tests`                        | Cross-system integration tests and browser flows                         |
| `evals`                        | Fictional evaluation scenarios and an explicit future runner             |

Shared packages expose TypeScript source to app bundlers. The web foundation task adds `transpilePackages` for `@beyond/shared`; Expo's standard monorepo support handles its imports. Avoid custom Metro resolution until a verified problem requires it.

## Initial data model

| Table               | Proposed data and relationship                                                      |
| ------------------- | ----------------------------------------------------------------------------------- |
| `profiles`          | One row per auth user; timezone, reflection schedule, preferences                   |
| `journal_entries`   | Owner ID, text, revision number, timestamps                                         |
| `reflections`       | Owner/entry IDs, source revision, generated letter, user correction, timestamps     |
| `approved_memories` | Owner ID, explicitly approved content, optional source, timestamps                  |
| `reflection_jobs`   | Owner/entry IDs, source revision, due time, status, lease, attempts, error category |

Supabase owns auth records. Use UTC timestamps in storage and an explicit user timezone for schedule display and daylight-saving transitions. Define relationships, cascade behavior, indexes, and access policies in versioned migrations during implementation. Generated database types then belong in `packages/shared/src/types/database.ts`.

## Durable reflection processing

Saving an entry and creating its job must be atomic. A database transaction/RPC should persist the entry and scheduled job together. A job is unique to an entry revision so repeated requests cannot create repeated reflections.

Supabase Cron invokes the protected Node.js job processor over HTTPS; the scheduler credential belongs in its secret store. The processor claims a bounded batch atomically, uses leases for crash recovery, and retries transient failures with backoff and a maximum attempt count. Keep request duration and concurrency within verified hosting/provider limits.

Immediately before saving a result, check that the entry still exists, has the same revision, and remains eligible. An edited entry invalidates earlier jobs; a deleted entry cancels outstanding work. A late response must never recreate deleted data. Use a uniqueness constraint for completed output and test recovery after an interrupted run.

The API/database owner supplies schema, claim/finalize primitives, authorization, and the scheduler. The AI/jobs owner supplies generation and processing orchestration. These owners agree on the interfaces before writing either side.

## Deployment topology

Vercel hosts the website and Node.js API. Supabase hosts Postgres, auth, and scheduling. Expo EAS builds Android/iOS binaries against the same HTTPS API origin. Web/API changes, database migrations, and native releases have separate release steps despite sharing one Git commit history.

References: [Next.js backend support](https://nextjs.org/docs/app/guides/backend-for-frontend), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo SDK compatibility](https://docs.expo.dev/versions/latest/), [Vercel monorepos](https://vercel.com/docs/monorepos).
