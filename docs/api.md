# Writing API and draft future contract

Step001 (`93e473b`) is historical documentation-only architecture; step002 established health/configuration and shared input/tooling. **Step003 implements the writing routes and database contract below.** Future routes and AI behavior are explicitly marked planned. Frontends/legacy web backend placeholders remain untouched; `services/ai` is reserved for its owner.

## Transport and identity

- Product paths start with `/api/v1` on the independent API origin; health paths are outside the version prefix. Frontend/shared-client integration remains future work.
- Each writing call requires `Authorization: Bearer <Supabase access token>`, freshly verified with Supabase Auth, plus an active profile. Supabase handles passwords/sign-in/reset/refresh. Decoded claims alone, cookies and payload owner IDs are not product authentication.
- Normal writing uses the publishable key and verified user's token, not API admin credentials. RLS/grants/authenticated validated RPCs independently enforce active ownership and live-resource visibility.
- CORS/preflight permits exact configured canonical browser origins and required bearer headers/methods, never wildcard origins. HTTPS is required except HTTP loopback development (`localhost`, `127.*`, `[::1]`); no credentials/path/trailing slash/query/fragment in origins. CORS is not authentication; native requests still need tokens.
- Success uses `data`; errors use stable `code`, safe `message` and UUID `request_id`, matching `X-Request-Id`. Responses are `Cache-Control: no-store`; no private shared/CDN/framework caching or token/content logging.
- Product status mapping: missing/invalid/expired auth `401`, inactive/deleting profile `403`, invalid input `400`, missing/deleted/other-owner resource `404`, revision/idempotency conflict `409`, safe internal error `500`. Direct PostgREST `P0001` is HTTP `400`, not the product status: the API maps `not_found`/`forbidden`/`conflict` to `404`/`403`/`409`. Direct DB/RPC access never returns another owner's content.

## Implemented health routes

| Method | Path                | Behavior                                                                                         |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/api/health/live`  | Dependency-free public `200` with `{ data: { status: 'alive' } }`                                |
| GET    | `/api/health/ready` | Valid writing config + actual `api_schema_ready` RPC boolean `true`: `200`; otherwise safe `503` |

Readiness POSTs `{}` to `/rest/v1/rpc/api_schema_ready` using the publishable key with a 1500 ms deadline. The real SQL RPC checks required database catalogs/schema primitives; configured readiness `200` has been tested. Both routes use no-store/request IDs and expose no schema details, secrets or user content. AI health/credentials are not a writing/readiness prerequisite. Protected queue/dependency diagnostics remain planned.

## Implemented writing routes

| Method | Path                  | Behavior                                                              |
| ------ | --------------------- | --------------------------------------------------------------------- |
| POST   | `/api/v1/entries`     | Create/replay non-opted-in entry; `200` with current resource         |
| GET    | `/api/v1/entries`     | Bounded live-owned page with canonical cursor                         |
| GET    | `/api/v1/entries/:id` | `200` with one live-owned resource; missing/deleted/other-owner `404` |
| PATCH  | `/api/v1/entries/:id` | Expected-revision edit; `200` current resource, stale revision `409`  |
| DELETE | `/api/v1/entries/:id` | `200` `{ data: { id } }`; missing/already-deleted/other-owner `404`   |

Portable writing resource and response-output schemas are implemented and validated; the shared API client remains deferred. Resource: `{ id, text, revision, reflection_opt_in: false, created_at, updated_at }`, with UUID ID, integer revision and UTC timestamps. Creation and equivalent replay both return `200`, not `201`; replay returns current persisted text without reverting edits or exposing the private original creation payload. No scheduling/job/reflection state is present.

### Input, body and pagination bounds

- Strict create body requires `text`, UUID `idempotency_key` and explicit literal `false` `reflection_opt_in`. Missing opt-in, `true`, ownership/scheduling fields and unknown keys are rejected; no default/coercion enables AI.
- Text is nonblank, 1..20000 UTF-16 code units, including whitespace in length. Whitespace is preserved exactly; trimming only checks blankness. Reject NUL and unpaired surrogates; preserve valid paired Unicode. Do not normalize or substitute byte/code-point counts.
- Strict PATCH requires the same text and integer `expected_revision` 1..2147483647, without opt-in/extra fields. Params require UUID `id`.
- Body reading is bounded to **128000 bytes and a total 5000 ms deadline**; expanded stream/deadline/abort/cancellation regressions passed final validation.
- Query `limit` is canonical decimal `1..100`, default `20`; reject noncanonical forms rather than coerce them.
- Cursor is canonical base64url encoding of strict `{ created_at, id }`, with UUID `id` and a positive-year UTC timestamp preserving exact microseconds. Reject year zero and noncanonical encoding/values; never round pagination timestamps to JavaScript milliseconds.

## Implemented database, replay and deletion

Public `profiles` supports active/deleting state and Auth trigger/backfill. `journal_entries` permits user reads only for the owner's active, live entries through RLS. Grants do not expose private immutable original creation payload/key columns. User writes go through authenticated validated `entry_create`, `entry_update`, `entry_delete`, `entry_get` and `entry_list` RPCs. Security-definer writing RPCs use an empty search path and lock/check the active profile.

Creation enforces unique `(owner_id, idempotency_key)` even under concurrent calls. Compare live retries only against the separately stored immutable **original validated creation payload**. Equivalent original creation replay returns the **current** resource after edits; a different original payload with the same key returns `409`. PATCH increments revision atomically when expected revision matches; concurrent stale writes conflict without overwriting the winner.

Check an owner's retired key before comparing payload: reuse always returns `409`. Deletion sets original payload, text, consent, revision, creation timestamp and update timestamp to SQL `NULL`; only minimum IDs, owner/key and `deleted_at` remain. Ordinary reads and RPC resources exclude tombstones; internal replay guards return no deleted content. DELETE itself returns only `{ data: { id } }`, and repeated deletion is `404`. Tested deletion/replay cannot resurrect entries.

Writing is non-opted-in only: no AI/job table, AI call or AI-health prerequisite. Deleting-profile denial is implemented, **not** `DELETE /api/v1/account` or durable account cleanup.

## Planned product routes (unimplemented)

| Method | Path                                                   | Target behavior                                                                                          |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/reflections`                                  | Paginated owned reflections                                                                              |
| GET    | `/api/v1/reflections/:id`                              | Owned reflection with suggestions/provenance                                                             |
| PATCH  | `/api/v1/reflections/:id`                              | Correction separate from generated letter                                                                |
| POST   | `/api/v1/reflections/:id/actions/:suggestionId/accept` | Atomic decision + unique todo; repeat returns surviving current todo, `409` after explicit todo deletion |
| POST   | `/api/v1/reflections/:id/actions/:suggestionId/reject` | Explicit rejection, no todo                                                                              |
| GET    | `/api/v1/todos`                                        | Owned standalone and accepted-action todos                                                               |
| POST   | `/api/v1/todos`                                        | Explicit standalone todo                                                                                 |
| PATCH  | `/api/v1/todos/:id`                                    | Owned update/completion                                                                                  |
| DELETE | `/api/v1/todos/:id`                                    | Delete todo while retaining acceptance decision to prevent recreation                                    |
| GET    | `/api/v1/memories`                                     | Explicitly approved owned memories                                                                       |
| POST   | `/api/v1/memories`                                     | Approve validated content and owned source links                                                         |
| DELETE | `/api/v1/memories/:id`                                 | Remove approved memory from future context                                                               |
| GET    | `/api/v1/settings`                                     | IANA timezone, morning time, tone and opt-in preferences                                                 |
| PATCH  | `/api/v1/settings`                                     | Validate preferences for future jobs                                                                     |
| DELETE | `/api/v1/account`                                      | Reauthentication as appropriate, durable deleting gate and retry cleanup before Auth deletion            |
| POST   | `/api/v1/internal/jobs/process`                        | Separate scheduler credential; bounded claim/process/finalize, never user-token privilege escalation     |

Opted-in writing needs a later contract extension, atomic entry/eligible job and tested scheduling. Reflection output will include entry/source revision, letter, stable suggestions, provenance and separate correction; no automatic todos/memories. Acceptance must validate owner/source revision and persist a unique durable decision; rejection creates no todo and conflicting decisions return `409`.

Proposed source deletion cascades through reflections, source-linked memories and reflection-derived todos, not unrelated standalone todos. Settings use tones `friend | mentor | future | diary`, morning times `07:00 | 07:30 | 08:00`, IANA timezone and UTC due times. Test next-local-calendar-morning UTC/date/DST gaps/overlaps before opt-in. Preference changes affect future jobs; edits invalidate old work. Never force production demo delivery.

## Planned independent AI HTTP contract

Neither `services/ai`, API-side AI client nor shared AI HTTP schemas is implemented. The AI owner owns generation behind versioned authenticated `POST /v1/reflections:generate`. Agree credential rotation/version, bounded request/response schemas and failure mapping first. API-side `AI_SERVICE_TOKEN` is server-only; provider credentials belong only in AI. No provider/model is selected.

Input: entry ID/text, source revision, tone and bounded API-authorized owned context with source references. Output: letter, stable action suggestions and provenance. AI has no DB admin key, direct product write, auto-todo or memory authority. API owns leases/fencing/backoff/recovery and validated finalization, which must recheck active owner, live source revision, eligibility and fencing token. A future fake independent AI HTTP fixture tests timeout/malformed/unavailable/late results; it is never a production fallback.

Voice remains a later private Storage/owned media/transcription-job proof with separate consent and a reviewed transcript into text writing. Optional RAG needs owned source/provenance/deletion contracts before use.

## Validation and remaining handoff

GitHub Actions run `37958461995` completed **SUCCESS** for source commit `b192bde`; both backend and real-database jobs passed. Linux CI verified clean root-lock `npm ci`, dependency resolution, root formatting, backend lint/types, **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), the normal repository production Next build and HTTP health, without a temporary root workaround. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed, covering identity/RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. Body-limit/deadline/cancellation regressions and unconfigured live `200`/ready `503` passed. This run covers `b192bde`, not later documentation or source changes; the final documentation-record commit is not yet created. `docs/backend-changes.txt` remains main-owned.

After `npm run db:start`, `npm run db:test` and `npm run build:api`, run `npm run test:api:writing`. Its local-target guard, runtime key capture without dotenv/committed secrets and fixture-user cleanup are intentional safety boundaries. Root `npm run db:start` configures writing-only exclusions by default; the API env sample is fixed to `55321`. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`. Both CI jobs passed for source commit `b192bde`; Linux clean-install reproducibility is verified. Local Windows `npm ci` remains host-guard constrained, not a project-wide blocker. Root pins are unchanged; no package addition or vulnerability audit is claimed. Durable jobs, source cascades and interrupted account cleanup need later tests. Frontend origin/bearer/environment/shared-client migration remains separately owned and unauthorized in backend-only work.
