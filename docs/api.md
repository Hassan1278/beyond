# Draft API contract

This combines the limited current foundation with the authorized product API target. Step001 is the historical documentation-only architecture commit `93e473b`, not the current source inventory. Step002 contains API-only Next.js Node.js health handlers/configuration and portable shared INPUT/health/error schemas with adjacent executable unit tests. Product routes and database behavior remain planned. `apps/web` API/server placeholders remain legacy, unused and untouched; `services/ai` implementation remains reserved for the AI owner.

### Implemented status: health routes, not product routes

Only public `GET /api/health/live` and `GET /api/health/ready` have real dynamic Node handlers. Liveness returns `200` with `{ data: { status: 'alive' } }` without config, database or AI calls. Readiness validates writing configuration, then POSTs `{}` to `/rest/v1/rpc/api_schema_ready` with the publishable key and a 1500 ms deadline. Only a successful actual RPC response with JSON boolean `true` within the deadline yields `200` with `{ data: { status: 'ready' } }`; missing/invalid config, missing RPC, errors, timeouts and other results yield generic `503` `not_ready`. Both routes use `Cache-Control: no-store` and generated UUID `X-Request-Id`; error bodies contain matching `request_id`. No SQL migration or RPC implementation has been added.

Config parsing requires HTTPS Supabase origins except HTTP loopback (`localhost`, `127.*`, `[::1]`), a `sb_publishable_` key and comma-separated exact canonical browser origins. Browser origins require HTTPS except local loopback development, with no wildcard, credentials, path, trailing slash, query or fragment. This is config/allowlist parsing, not product CORS/preflight middleware or auth.

Shared exports contain health/error envelopes and writing INPUT/UUID-params schemas only. Adjacent executable unit tests, root backend lint/typecheck/test/build/smoke scripts and the Node `backend` project in `vitest.config.ts` exist; API root-lock integration is complete with only API metadata/workspace link added and existing pins unchanged. Main locally validated the pinned runtime, backend lint/types/unit tests, the Next.js `16.3.8` production build with only dynamic health routes, and `npm run test:api:smoke` (`tests/api-health-smoke.mjs`), proving production liveness `200` and unconfigured readiness `503` with no-store safe envelopes; detailed results remain in `docs/backend-changes.txt`. CI configures backend lint/types/unit/build/smoke after dependency/format checks, but remote CI has not run. Clean-install reproducibility remains unverified after host bulk-delete protection blocked clean `npm ci`; no vulnerability audit is claimed. No product auth, `/api/v1` handlers, persistence, migrations/RLS/grants/RPCs, resource output/client or AI HTTP schemas exist. Writing acceptance remains unmet, and smoke does not prove database readiness. The following identity, product-route and persistence rules are targets.

## Transport and identity

- Product paths start with `/api/v1`. Both client base URLs are the independent API origin, without a path; the shared client appends versioned paths. Health paths are outside the product version prefix.
- Both first-party web and mobile product requests use `Authorization: Bearer <Supabase access token>`. Supabase handles passwords, sign-in, password reset and refresh; the product API does not implement these credential flows. Freshly verify the token with Supabase Auth and require an active profile on each product request. Do not trust decoded claims alone, cookies as the product API contract, or owner IDs in client payloads.
- Derive ownership from verified identity. User-scoped database access, RLS, grants and validated RPCs must reject other owners, deleting profiles and tombstones, including direct database/RPC access.
- Permit exact configured browser origins and required bearer preflight headers/methods; CORS is not authentication. Do not allow wildcard origins or turn an origin check into an ownership check. Native requests still require tokens.
- JSON uses `data` on success or `error` with stable `code`, safe `message` and request ID. Resource IDs are UUIDs, timestamps ISO-8601 UTC, list pages bounded with opaque cursors.
- `401` means missing/invalid authentication; inactive/deleting profiles are denied with a safe `403`. `400` is invalid input, `409` a revision/idempotency conflict, `429` a request limit and `500` a safe server error. Missing, deleted and other-user resources return `404` without revealing existence.
- Private responses use `Cache-Control: no-store` and must not enter shared/CDN/framework caches. Do not log bearer tokens, private content or secrets.

## Implemented health routes

| Method | Path                | Implemented behavior                                                                                        |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health/live`  | Public dependency-free `200` liveness handler                                                               |
| GET    | `/api/health/ready` | Public config + required `api_schema_ready` RPC check; `503` unless actual RPC succeeds with boolean `true` |

The required RPC is not implemented in SQL. Health handlers do not establish product acceptance.

## Planned product routes (no handlers yet)

| Method | Path                                                   | Target behavior                                                                                                    |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/v1/entries`                                      | Save owned text with replay semantics; atomic entry/job only when explicitly opted in and scheduling gate passed   |
| GET    | `/api/v1/entries`                                      | Paginated live owned entries; no tombstones                                                                        |
| GET    | `/api/v1/entries/:id`                                  | One live owned entry                                                                                               |
| PATCH  | `/api/v1/entries/:id`                                  | Expected-revision edit; invalidate old revision/jobs and apply current opt-in preferences to new work              |
| DELETE | `/api/v1/entries/:id`                                  | Clear content, retain minimal replay tombstone; cancel work and apply source cleanup                               |
| GET    | `/api/v1/reflections`                                  | Paginated owned reflections                                                                                        |
| GET    | `/api/v1/reflections/:id`                              | One owned reflection with suggestions/provenance                                                                   |
| PATCH  | `/api/v1/reflections/:id`                              | Store user correction separately from generated letter                                                             |
| POST   | `/api/v1/reflections/:id/actions/:suggestionId/accept` | Atomically accept/create a unique owned todo; repeat returns surviving todo, or `409` after explicit todo deletion |
| POST   | `/api/v1/reflections/:id/actions/:suggestionId/reject` | Record explicit rejection; create no todo                                                                          |
| GET    | `/api/v1/todos`                                        | List owned standalone and accepted-action todos                                                                    |
| POST   | `/api/v1/todos`                                        | Explicitly create an owned standalone todo                                                                         |
| PATCH  | `/api/v1/todos/:id`                                    | Update an owned todo, including completion                                                                         |
| DELETE | `/api/v1/todos/:id`                                    | Remove an owned todo; retain any acceptance decision to prevent recreation by repeat acceptance                    |
| GET    | `/api/v1/memories`                                     | List explicitly approved owned memories                                                                            |
| POST   | `/api/v1/memories`                                     | Explicitly approve validated content and authorized source links                                                   |
| DELETE | `/api/v1/memories/:id`                                 | Remove approved memory and exclude it from future context                                                          |
| GET    | `/api/v1/settings`                                     | Read IANA timezone, morning time, tone and opt-in preferences                                                      |
| PATCH  | `/api/v1/settings`                                     | Validate preferences; changes apply to future jobs, not existing scheduled jobs                                    |
| DELETE | `/api/v1/account`                                      | Reauthenticate as appropriate, durably gate deleting account and retry cleanup before Auth deletion                |
| POST   | `/api/v1/internal/jobs/process`                        | Separate scheduler credential; bounded claim/process/finalize, never a client-token privilege escalation           |

Readiness must bound DB latency and check expected schema compatibility without returning key names/values, connection strings, internal errors or schema details. AI/queue dependency diagnostics are a later protected interface, not public health output. Health does not prove product acceptance.

## Resource and replay semantics

Planned entry output: ID, text, revision, UTC timestamps and reflection scheduling state; no resource output schema or persistence exists yet.

Implemented shared writing INPUT contracts:

- `createEntryBodySchema` is a strict object requiring `text`, UUID `idempotency_key` and explicit literal `false` `reflection_opt_in`. Missing opt-in, `true`, ownership/scheduling fields and unknown keys are rejected; no defaults or coercion enable scheduling.
- `text` is a nonblank string of 1..20000 UTF-16 code units, including whitespace in the length. Leading, trailing and internal whitespace are preserved exactly; trimming only checks blankness. NUL and unpaired UTF-16 surrogates are rejected; valid paired Unicode is preserved. No normalization or byte/code-point count is applied.
- `patchEntryBodySchema` requires the same `text` and integer `expected_revision` 1..2147483647, with no opt-in or extra fields. `entryParamsSchema` requires an exact UUID `id` object.
- Health/error schemas validate the exact success envelopes or `error` with stable code, string message and UUID `request_id`; HTTP helpers choose safe fixed messages. These schemas/tests do not implement auth, product routes, replay, revision increments or database constraints.

Later opted-in creation requires a contract extension only after the scheduling gates; the server will derive ownership and due time. Remaining product/context/AI bounds and output contracts must be agreed before their implementation.

Enforce unique `(owner_id, idempotency_key)`. For LIVE entries, store the immutable ORIGINAL validated creation payload separately from mutable entry fields and compare retries only against that payload. An equivalent retry returns the CURRENT persisted entry state without reverting later edits or duplicating jobs. A different original payload with the same live key returns `409`. Updates require the expected revision and increment it atomically; stale writes conflict. Saves without opt-in create no AI job and must work during AI downtime.

Check an owner's retired key before any payload comparison: reuse always returns `409`, regardless of payload. Deletion clears the original creation payload and all content/consent fields, retaining only minimum IDs, owner/key and `deleted_at`. Ordinary reads of deleted resources return `404`. Product API reads, RLS visibility and RPC resource results exclude tombstones; internal key guards never return deleted content. Tests must include replay after edits/deletion and cross-user reuse/isolation.

Reflection: ID, entry ID, source revision, generated letter, action suggestions with stable IDs, provenance, separate correction and timestamp. No automatic todos or memory writes. Explicit acceptance validates ownership and source revision and atomically records a durable decision unique on owner/reflection/suggestion plus its todo. Repeat acceptance returns the same surviving todo in its current state. Explicit todo deletion retains the acceptance decision; subsequent acceptance returns `409` instead of silently recreating the todo. Rejection creates no todo; a conflicting decision returns `409`.

Memory: ID, approved text, owned source links where derived, timestamp. Todo: ID, owner, content/completion, optional owned reflection/suggestion source. Proposed privacy-first source deletion cascades through reflections, source-linked approved memories and reflection-derived todos; unrelated standalone todos remain.

Settings: prototype tone `friend | mentor | future | diary`, morning time `07:00 | 07:30 | 08:00`, validated IANA timezone, explicit opt-in. Store UTC due times. Enable next-local-calendar-morning scheduling only after resolver tests for UTC conversion, day boundaries and DST gaps/overlaps. Preference changes affect future jobs; edits invalidate the old revision. Never force production demo delivery.

## Planned independent AI HTTP contract

The AI owner will implement `services/ai`; the backend will implement only its API-side client and test fixtures. Neither implementation nor shared AI HTTP schemas exist yet. `POST /v1/reflections:generate` is server-to-server, protected by a versioned credential represented by API-side `AI_SERVICE_TOKEN`. Agree credential version/rotation and shared request/response schemas before processing; reject absent, invalid or unsupported credentials.

Input: entry ID/text, source revision, selected tone and bounded context explicitly authorized by the API for that owner, with source references. Output: generated letter, stable action suggestions and provenance tying output to the supplied revision/sources. AI owns prompts/provider calls and optional RAG/transcription; no database admin key, database write, auto-todo or auto-memory authority. Provider key/model configuration belongs only in the AI service. No provider/model is selected.

The product API owns queue leases/fencing, backoff/recovery and validated finalization. Before saving output, the database rechecks active owner, live source revision, job eligibility and lease fencing token. A future fake independent AI HTTP service will exercise timeout, malformed output, unavailable service and late/stale result tests; it is not a production fallback. A real AI service follows these gates later.

Voice is a later second core input proof: private Storage, owned media metadata, transcription job kind and separate transcription consent, then a reviewed transcript entering the same text flow. No voice route/source is implemented here. Optional RAG requires user-scoped source/provenance and deletion contracts before use.

## Handoff and validation plan

Writing-first gate: real local Supabase Auth/Postgres, bearer verification/active profiles, grants/RLS/RPC checks, two-user save/read/edit/delete, equal/unequal replay and revisions, private no-cache responses, exact-origin CORS, AI-down saves. Before first AI processing: atomic opted-in entry/job, tested next-morning resolver, bounded leases/fencing, backoff/recovery and stale/deleted-source finalization tests. Then test explicit action acceptance/rejection, repeat acceptance returning the same surviving todo's current state, retained decisions and `409` after explicit todo deletion, unique owned todos, separate corrections and memory approval/removal.

Account deletion needs a deleting gate and durable retry of product/storage/context cleanup before Auth deletion; test interrupted cleanup later. API/shared unit tests and production health smoke are implemented and locally validated by main, but no real Auth/Postgres writing or account-deletion acceptance tests exist. Foundation validation does not satisfy those gates; detailed command outcomes remain in main's `docs/backend-changes.txt`. Frontend examples/clients remain untouched legacy and require a separately authorized origin, bearer and `/api/v1` migration.
