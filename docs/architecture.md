# Architecture

## Status and superseding decision

This describes the authorized architecture target, not completed product functionality. Step001 is the historical documentation-only architecture commit `93e473b`; its absence of API source/tests is not the current inventory. Step002 has the limited foundation described below, without product auth, persistence, SQL migrations, database RPC implementations, AI service or cloud setup. The architecture supersedes the all-in-one web/API deployment; `apps/web` and `apps/mobile` are untouched, and their unused API/server placeholders remain legacy and must not be removed in backend-only work.

One monorepo will contain independently deployed and tested frontends, a product API, and an AI HTTP service. The user has already authorized architecture-first work followed by backend/environment implementation with small validated local commits. Workspace manifests, scripts, dependencies and lockfile changes stay coordinated within that authorization; frontend work, `services/ai` implementation and hosted actions are outside the backend owner's scope.

### Implemented status: step002 foundation only

- `apps/api` now has Next.js configuration with shared-package transpilation, Node health handlers, a server-only writing-config loader, strict config/origin parsing, bounded readiness and safe HTTP envelopes. Only `GET /api/health/live` and `GET /api/health/ready` are implemented routes; all `/api/v1` product routes and auth/active-profile checks remain planned.
- Liveness returns `200` with `{ data: { status: 'alive' } }` without configuration, DB or AI calls. Readiness loads writing config and POSTs `{}` to `/rest/v1/rpc/api_schema_ready` with a 1500 ms timeout. It returns `200` only for an actual successful RPC response containing JSON boolean `true` within the deadline; otherwise it returns a generic `503` `not_ready` error. No SQL or RPC definition exists, so connectivity or unit fixtures cannot establish writing readiness/acceptance.
- Shared schemas implement strict writing INPUT objects only: creation requires UUID `idempotency_key`, explicit literal `false` `reflection_opt_in`, and nonblank text of 1..20000 UTF-16 code units, preserving whitespace exactly and rejecting NUL/unpaired surrogates. PATCH requires the same text validation and integer `expected_revision` 1..2147483647; params require a UUID. Health/error envelope schemas also exist. Persistence/replay/revision enforcement, resource output schemas, clients and AI contracts remain deferred.
- Writing config requires a Supabase origin using HTTPS except HTTP loopback (`localhost`, `127.*` or `[::1]`), a `sb_publishable_` key, and a comma-separated exact canonical browser-origin allowlist. Origins require HTTPS except local loopback development; no wildcard, credentials, path, trailing slash, query or fragment. Origin parsing is implemented, not product CORS/preflight middleware or authentication.
- Adjacent executable unit tests and root `dev:api`, `lint:backend`, `typecheck:backend`, `test:backend`, `build:api`, `test:api:smoke` scripts exist; root `vitest.config.ts` defines the Node `backend` project for API/shared tests with `passWithNoTests: false`. API root-lock integration is complete with only API metadata/workspace link added and existing pins unchanged. Main locally verified the pinned runtime and validated backend lint/types/unit tests, the Next.js `16.3.8` production build with only dynamic health routes, and `tests/api-health-smoke.mjs` (`200` live / unconfigured `503` ready, both no-store safe envelopes); see `docs/backend-changes.txt` for details. CI configures backend lint/types/unit/build/smoke after dependency/format checks, but remote CI has not run. Full isolated npm install completed; clean `npm ci` was blocked by host bulk-delete protection, leaving clean-install reproducibility unverified. No vulnerability audit or real database/writing acceptance is claimed.
- Auth, product endpoints, persistence, migrations/RLS/grants/RPCs, jobs/scheduling, deletion and real Auth/Postgres acceptance are still unimplemented. AI implementation stays with its separate owner; target architecture and gates below are unchanged.

## System boundary and ownership

| Target path                    | Responsibility                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `apps/web`                     | Website only; legacy API/server placeholders remain until an authorized migration                       |
| `apps/mobile`                  | Expo / React Native Android and iOS client                                                              |
| `apps/api/src/app/api`         | API-only Next.js route handlers using the Node.js runtime; no product UI                                |
| `apps/api/src/server/services` | Product rules: entries, reflections, memories, actions/todos, settings, deletion                        |
| `apps/api/src/server/jobs`     | Queue orchestration, claims, leases/fencing, retry/recovery, AI HTTP calls, finalization                |
| `apps/api/src/server`          | Verified auth, environment, user-scoped database access, isolated privileged jobs/account operations    |
| `services/ai`                  | Independent HTTP service reserved for the AI owner: prompts, providers, optional RAG and transcription  |
| `packages/shared/src`          | Portable contracts, validation, API client and limits; no framework/runtime-only imports or credentials |
| `supabase`                     | Database configuration, future migrations, RLS, grants, validated RPCs and storage policies             |
| `tests`                        | Cross-system acceptance tests, including a fake independent AI HTTP service for tests only              |
| `evals`                        | Fictional AI evaluation scenarios and a future AI-owner runner                                          |

Keep API handlers thin and backend modules server-only. The product API owns auth, authorization/RLS, database writes, queues/jobs, finalization and deletion. The AI service never receives database admin keys and never directly saves product data, creates todos or approves memories. Backend work may define shared HTTP contracts and test fixtures, but must not implement `services/ai`.

```text
Web / mobile -- verified bearer token --> apps/api -- user-scoped access --> Supabase
                                             |
Scheduler -- protected trigger --> API jobs -- authenticated HTTP --> services/ai
                                             |                         |
                                      validated finalize          provider / optional RAG
```

Shared TypeScript contracts remain portable. The API foundation now configures shared-package transpilation; the web owner handles its separate configuration later, and Expo keeps standard monorepo support. No frontend configuration or native dependency upgrade is authorized here.

## Identity, origins and health

Target product identity (not implemented): Supabase handles passwords, sign-in, reset and session refresh. Both first-party clients will send a Supabase bearer access token to `/api/v1` product routes on the independent API origin. The API freshly verifies the token with Supabase Auth and checks an active profile; decoded claims or a client-supplied owner ID are not sufficient. User-scoped database operations, RLS, grants and validated RPCs enforce the same active-owner boundary even outside the API. CORS allows exact configured browser origins, not wildcard origins; CORS is not authentication. Do not cache private responses.

The implemented `/api/health/live` handler is public and cheap. The implemented `/api/health/ready` handler performs bounded configuration and required `api_schema_ready` RPC checks, without contacting AI; it fails closed with `503` unless the actual RPC succeeds with boolean `true`. The SQL/RPC definition remains deferred. Neither route exposes secrets, user data or detailed configuration. Protected dependency/queue status is deferred. The target writing flow must remain usable during AI downtime; saves themselves are not implemented yet.

## Proposed data model

| Table               | Proposed data and relationship                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | Auth-user identity; active/deleting lifecycle, IANA timezone, morning time and tone preferences                                                                                               |
| `journal_entries`   | Owner, mutable text/revision/state, UTC timestamps, creation idempotency key and separately stored immutable original validated creation payload while live; minimal tombstone after deletion |
| `reflection_jobs`   | Owner/entry/revision, due time, status, attempts, lease/fencing token, backoff and safe error category                                                                                        |
| `reflections`       | Owner/entry/source revision, generated letter, action suggestions/provenance, separate user correction                                                                                        |
| `approved_memories` | Explicitly approved owned content and source links when derived from an entry/reflection                                                                                                      |
| `todos`             | Owned standalone or explicitly accepted reflection-derived action; unique owner/reflection/suggestion reference                                                                               |

Add private media metadata and job-kind support when voice is implemented, not in this step. Supabase owns auth records. Store timestamps in UTC. Versioned migrations must define foreign keys, indexes, grants, RLS and input/ownership checks in RPCs; do not assume the API is the only possible database caller. Generated database types will belong in `packages/shared/src/types/database.ts`.

Creation uses unique `(owner_id, idempotency_key)`. LIVE entries store the immutable ORIGINAL validated creation payload separately from mutable fields; creation equality compares against that payload only. Equivalent retries return the CURRENT persisted entry state without reverting edits or duplicating jobs; different original payloads return `409`. Edits require an expected revision and never change the stored original payload. Check an owner's retired key before payload comparison: reuse always returns `409`. Deletion clears the original payload and all content/consent, retaining only minimum IDs, owner/key and `deleted_at`. Ordinary deleted-resource reads return `404`. All product APIs, RLS visibility and RPC resource results exclude tombstones; internal key checks never return deleted content.

## Durable jobs and scheduling gates

The first acceptance gate is writing with real local Supabase Auth/Postgres: save/read/edit/delete, two-user isolation, replay and revision semantics. A non-opted-in save creates no reflection job and works while AI is unavailable. Only an opted-in entry and its eligible job are persisted atomically in a validated transaction/RPC. Scheduling remains disabled until its resolver is tested; enabling opt-in is not a prerequisite for the writing gate.

Prototype tones are `friend`, `mentor`, `future`, `diary`; morning choices are `07:00`, `07:30`, `08:00`, with a validated IANA timezone. Before enabling opt-in, test a server resolver for the next local calendar morning at the selected time, UTC conversion, daylight-saving gaps/overlaps and day boundaries. Preference changes affect future jobs, not already scheduled ones; editing invalidates the old revision and uses the current preferences for a newly opted-in revision. No forced demo delivery in production.

Before any AI processing, implement bounded atomic claims, leases, fencing tokens checked at finalization, retry backoff/maximum attempts and lease-expiry/crash recovery. Jobs/output are unique to the entry revision. Finalization rechecks active owner, live entry, source revision, eligibility and current fencing token in the database. Edits/deletion invalidate old work; late responses cannot restore content. Supabase scheduling later calls a protected API trigger; the API owns processing and database primitives, while the AI owner owns generation behind HTTP.

`POST /v1/reflections:generate` uses a versioned server-to-server credential. The API supplies entry, revision, tone and bounded authorized context; the AI returns letter, action suggestions and provenance. Validate output before finalization. Use a fake independent AI HTTP service only in tests, never as a production fallback. No provider/model is selected. Actions require explicit acceptance/rejection; accepting atomically records a durable decision and creates an owned todo unique to the suggestion, never an automatic todo. Repeated acceptance returns the same surviving todo in its current state. Explicit todo deletion preserves the decision while its source survives, so repeat acceptance returns `409` rather than recreating it. Corrections remain separate from the generated letter; memory approval is also separate.

## Voice, optional context and deletion

Voice is a later second core input proof: private Supabase Storage plus owned metadata and transcription jobs, separate transcription consent, then user-reviewed transcript into the same text-entry flow. No UI edits or native package upgrades are authorized by this backend task. RAG is optional; if added, the API must authorize bounded user-scoped sources and define source provenance, retention/removal and deletion before use. Full patterns and Life Film are deferred; any later counts must come from real authorized data, never fabricated statistics.

The proposed privacy-first source-deletion rule removes dependent reflections, source-linked approved memories and reflection-derived todos and cancels jobs; standalone todos remain. Clear entry content before retaining minimal replay-prevention tombstones. Account deletion first gates the profile as deleting, blocks all product/claim/finalize paths and durably retries product/storage/context cleanup before deleting Supabase Auth. No runtime deletion tests exist yet. Provider/backups retention must be disclosed; do not promise end-to-end encrypted AI or perfect safety. See `docs/data-handling.md`.

## Deployment and environment target

Deploy `apps/web` and API-only `apps/api` independently, with separate tests and environment scopes. Vercel is the planned host for each Next.js project; the AI owner chooses a suitable independent HTTP deployment for `services/ai`. Supabase provides Auth/Postgres and later private Storage/scheduling; Expo EAS supplies native binaries. Maintain one root lockfile and Node.js `24.20.0` / npm `11.19.0`.

The existing `apps/api/.env.example` contains writing-only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CORS_ALLOWED_ORIGINS`. The implemented parser requires HTTPS except HTTP loopback and exact canonical comma-separated origins, with local loopback HTTP as the development exception. Config loading/readiness requires neither AI credentials nor AI reachability, but readiness also requires the still-unimplemented database-schema RPC. Future writing startup has the same config ownership. Later feature configuration is optional until its feature is enabled: isolated `SUPABASE_SECRET_KEY` for jobs/account operations only, `JOB_TRIGGER_SECRET` for protected job invocation, and `AI_SERVICE_URL`/`AI_SERVICE_TOKEN` for AI processing. Validate later configuration at the corresponding feature boundary, not as a writing startup/readiness prerequisite. Provider credentials belong only to the separately owned AI service. Frontend environment examples remain unchanged and need a separately authorized migration to the independent `/api/v1` origin/client behavior; see `docs/setup.md`. Hosted actions are not authorized by local backend/environment work.

References: [Next.js backend support](https://nextjs.org/docs/app/guides/backend-for-frontend), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo SDK compatibility](https://docs.expo.dev/versions/latest/), [Vercel monorepos](https://vercel.com/docs/monorepos).
