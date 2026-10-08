# Draft API contract

This is the authorized target, not running endpoints. This documentation-only step adds no API app source, migrations or executable tests. `apps/api` will be an independently deployed API-only Next.js Node.js service; `apps/web` API/server placeholders remain legacy, unused and untouched. The API/shared owner confirms exact schemas and bounds before implementation.

## Transport and identity

- Product paths start with `/api/v1`. Both client base URLs are the independent API origin, without a path; the shared client appends versioned paths. Health paths are outside the product version prefix.
- Both first-party web and mobile product requests use `Authorization: Bearer <Supabase access token>`. Supabase handles passwords, sign-in, password reset and refresh; the product API does not implement these credential flows. Freshly verify the token with Supabase Auth and require an active profile on each product request. Do not trust decoded claims alone, cookies as the product API contract, or owner IDs in client payloads.
- Derive ownership from verified identity. User-scoped database access, RLS, grants and validated RPCs must reject other owners, deleting profiles and tombstones, including direct database/RPC access.
- Permit exact configured browser origins and required bearer preflight headers/methods; CORS is not authentication. Do not allow wildcard origins or turn an origin check into an ownership check. Native requests still require tokens.
- JSON uses `data` on success or `error` with stable `code`, safe `message` and request ID. Resource IDs are UUIDs, timestamps ISO-8601 UTC, list pages bounded with opaque cursors.
- `401` means missing/invalid authentication; inactive/deleting profiles are denied with a safe `403`. `400` is invalid input, `409` a revision/idempotency conflict, `429` a request limit and `500` a safe server error. Missing, deleted and other-user resources return `404` without revealing existence.
- Private responses use `Cache-Control: no-store` and must not enter shared/CDN/framework caches. Do not log bearer tokens, private content or secrets.

## Planned routes

| Method | Path                                                   | Target behavior                                                                                                    |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/health/live`                                     | Public cheap process liveness; no DB/AI calls or sensitive details                                                 |
| GET    | `/api/health/ready`                                    | Public bounded required-config and DB-schema checks; generic ready/not-ready, independent of AI                    |
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

Entry: ID, text, revision, UTC timestamps and reflection scheduling state. Creation accepts text, an idempotency key and explicit reflection opt-in; the server derives ownership and due time. Define all content/context limits in portable shared validation before implementation.

Enforce unique `(owner_id, idempotency_key)`. For LIVE entries, store the immutable ORIGINAL validated creation payload separately from mutable entry fields and compare retries only against that payload. An equivalent retry returns the CURRENT persisted entry state without reverting later edits or duplicating jobs. A different original payload with the same live key returns `409`. Updates require the expected revision and increment it atomically; stale writes conflict. Saves without opt-in create no AI job and must work during AI downtime.

Check an owner's retired key before any payload comparison: reuse always returns `409`, regardless of payload. Deletion clears the original creation payload and all content/consent fields, retaining only minimum IDs, owner/key and `deleted_at`. Ordinary reads of deleted resources return `404`. Product API reads, RLS visibility and RPC resource results exclude tombstones; internal key guards never return deleted content. Tests must include replay after edits/deletion and cross-user reuse/isolation.

Reflection: ID, entry ID, source revision, generated letter, action suggestions with stable IDs, provenance, separate correction and timestamp. No automatic todos or memory writes. Explicit acceptance validates ownership and source revision and atomically records a durable decision unique on owner/reflection/suggestion plus its todo. Repeat acceptance returns the same surviving todo in its current state. Explicit todo deletion retains the acceptance decision; subsequent acceptance returns `409` instead of silently recreating the todo. Rejection creates no todo; a conflicting decision returns `409`.

Memory: ID, approved text, owned source links where derived, timestamp. Todo: ID, owner, content/completion, optional owned reflection/suggestion source. Proposed privacy-first source deletion cascades through reflections, source-linked approved memories and reflection-derived todos; unrelated standalone todos remain.

Settings: prototype tone `friend | mentor | future | diary`, morning time `07:00 | 07:30 | 08:00`, validated IANA timezone, explicit opt-in. Store UTC due times. Enable next-local-calendar-morning scheduling only after resolver tests for UTC conversion, day boundaries and DST gaps/overlaps. Preference changes affect future jobs; edits invalidate the old revision. Never force production demo delivery.

## Independent AI HTTP contract

The AI owner implements `services/ai`; the backend only implements its API-side client and tests. `POST /v1/reflections:generate` is server-to-server, protected by a versioned credential represented by API-side `AI_SERVICE_TOKEN`. Agree credential version/rotation and shared request/response schemas before processing; reject absent, invalid or unsupported credentials.

Input: entry ID/text, source revision, selected tone and bounded context explicitly authorized by the API for that owner, with source references. Output: generated letter, stable action suggestions and provenance tying output to the supplied revision/sources. AI owns prompts/provider calls and optional RAG/transcription; no database admin key, database write, auto-todo or auto-memory authority. Provider key/model configuration belongs only in the AI service. No provider/model is selected.

The product API owns queue leases/fencing, backoff/recovery and validated finalization. Before saving output, the database rechecks active owner, live source revision, job eligibility and lease fencing token. A fake independent AI HTTP service exercises timeout, malformed output, unavailable service and late/stale result tests; it is not a production fallback. A real AI service follows these gates later.

Voice is a later second core input proof: private Storage, owned media metadata, transcription job kind and separate transcription consent, then a reviewed transcript entering the same text flow. No voice route/source is implemented here. Optional RAG requires user-scoped source/provenance and deletion contracts before use.

## Handoff and validation plan

Writing-first gate: real local Supabase Auth/Postgres, bearer verification/active profiles, grants/RLS/RPC checks, two-user save/read/edit/delete, equal/unequal replay and revisions, private no-cache responses, exact-origin CORS, AI-down saves. Before first AI processing: atomic opted-in entry/job, tested next-morning resolver, bounded leases/fencing, backoff/recovery and stale/deleted-source finalization tests. Then test explicit action acceptance/rejection, repeat acceptance returning the same surviving todo's current state, retained decisions and `409` after explicit todo deletion, unique owned todos, separate corrections and memory approval/removal.

Account deletion needs a deleting gate and durable retry of product/storage/context cleanup before Auth deletion; test interrupted cleanup later. No runtime tests have run or exist at this documentation step. Frontend examples/clients require a separately authorized origin, bearer and `/api/v1` migration; do not edit them here.
