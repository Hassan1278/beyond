# Writing API

The connected web/mobile app uses this writing contract. See [product API](product-api.md) for settings, memories, todos and account controls, and [connected app milestone](connected-app.md) for reflection workflows and deployment handoff. Historical validation records live in the backend change log; current evidence is attached to [PR5](https://github.com/Hassan1278/beyond/pull/5).

## Transport and identity

- Product paths start with `/api/v1` on the independent API origin; health paths are outside the version prefix. Web and native clients use the shared authenticated API client.
- Each writing call requires `Authorization: Bearer <Supabase access token>`, freshly verified with Supabase Auth, plus an active profile and live owned Auth session. Supabase handles passwords/sign-in/reset/refresh. Decoded claims alone, cookies and payload owner IDs are not product authentication.
- Normal writing uses the publishable key and verified user's token, not API admin credentials. RLS/grants/authenticated validated RPCs independently enforce active ownership and live-resource visibility.
- CORS/preflight permits exact configured canonical browser origins and required bearer headers/methods, never wildcard origins. HTTPS is required except HTTP loopback development (`localhost`, `127.*`, `[::1]`); no credentials/path/trailing slash/query/fragment in origins. CORS is not authentication; native requests still need tokens.
- Success uses `data`; errors use stable `code`, safe `message` and UUID `request_id`, matching `X-Request-Id`. Responses are `Cache-Control: no-store`; no private shared/CDN/framework caching or token/content logging.
- Product status mapping: missing/invalid/expired or Auth-revoked credentials `401`, inactive/deleting profile or failed database session gate `403`, invalid input `400`, missing/deleted/other-owner resource `404`, revision/idempotency conflict `409`, quota exhaustion `429` with `Retry-After: 60`, safe internal error `500`. Direct PostgREST `P0001` is HTTP `400`, not the product status: the API maps `not_found`/`forbidden`/`conflict` to `404`/`403`/`409`. Direct DB/RPC access never returns another owner's content.

## Implemented health routes

| Method | Path                | Behavior                                                                                            |
| ------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/api/health/live`  | Dependency-free public `200` with `{ data: { status: 'alive' } }`                                   |
| GET    | `/api/health/ready` | Valid writing config + matching `api_release_ready` RPC boolean `true`: `200`; otherwise safe `503` |

Readiness POSTs `{"p_release":"connected-text-v1"}` to `/rest/v1/rpc/api_release_ready` using the publishable key with a 1500 ms deadline. This RPC is installed after the release's required migrations and delegates to the full `api_schema_ready()` catalog checks. An older schema may pass its original gate but lacks the release RPC and therefore returns safe503 through this API. Both routes use no-store/request IDs and expose no schema details, secrets or user content. Catalog checks cover writing, product, session and reflection permissions. AI health/credentials are not a writing/readiness prerequisite. Future incompatible database requirements must use a new release marker installed after their migrations.

## Implemented writing routes

| Method | Path                  | Behavior                                                              |
| ------ | --------------------- | --------------------------------------------------------------------- |
| POST   | `/api/v1/entries`     | Create/replay non-opted-in entry; `200` with current resource         |
| GET    | `/api/v1/entries`     | Bounded live-owned page with canonical cursor                         |
| GET    | `/api/v1/entries/:id` | `200` with one live-owned resource; missing/deleted/other-owner `404` |
| PATCH  | `/api/v1/entries/:id` | Expected-revision edit; `200` current resource, stale revision `409`  |
| DELETE | `/api/v1/entries/:id` | `200` `{ data: { id } }`; missing/already-deleted/other-owner `404`   |

Portable writing resource and response-output schemas are implemented and validated by the shared API client. Resource: `{ id, text, revision, reflection_opt_in: false, created_at, updated_at }`, with UUID ID, integer revision and UTC timestamps. Creation and equivalent replay both return `200`, not `201`; replay returns current persisted text without reverting edits or exposing the private original creation payload. Saving an entry does not grant reflection consent. Reflection permission and results have separate endpoints.

### Input, body and pagination bounds

- Strict create body requires `text`, UUID `idempotency_key` and explicit literal `false` `reflection_opt_in`. Missing opt-in, `true`, ownership/scheduling fields and unknown keys are rejected; no default/coercion enables AI.
- Text is nonblank, 1..20000 UTF-16 code units, including whitespace in length. Whitespace is preserved exactly; trimming only checks blankness. Reject NUL and unpaired surrogates; preserve valid paired Unicode. Do not normalize or substitute byte/code-point counts.
- Strict PATCH requires the same text and integer `expected_revision` 1..2147483647, without opt-in/extra fields. Params require UUID `id`.
- Body reading is bounded to **128000 bytes and a total 5000 ms deadline**; expanded stream/deadline/abort/cancellation regressions passed final validation.
- Query `limit` is canonical decimal `1..100`, default `20`; reject noncanonical forms rather than coerce them.
- Cursor is canonical base64url encoding of strict `{ created_at, id }`, with UUID `id` and a positive-year UTC timestamp preserving exact microseconds. Reject year zero and noncanonical encoding/values; never round pagination timestamps to JavaScript milliseconds.

## Implemented database, replay and deletion

Public `profiles` supports active/deleting state and Auth trigger/backfill. `journal_entries` permits user reads only for the owner's active, live entries through RLS. Grants do not expose private immutable original creation payload/key columns. User reads and RPCs require the verified JWT session ID to reference a live owned Auth session. User writes go through authenticated validated `entry_create`, `entry_update`, `entry_delete`, `entry_get` and `entry_list` RPCs. Security-definer writing RPCs use an empty search path and lock/check the active profile.

Creation enforces unique `(owner_id, idempotency_key)` even under concurrent calls. Compare live retries only against the separately stored immutable **original validated creation payload**. Equivalent original creation replay returns the **current** resource after edits; a different original payload with the same key returns `409`. PATCH increments revision atomically when expected revision matches; concurrent stale writes conflict without overwriting the winner.

Check an owner's retired key before comparing payload: reuse always returns `409`. Deletion sets original payload, text, consent, revision, creation timestamp and update timestamp to SQL `NULL`; only minimum IDs, owner/key and `deleted_at` remain. Ordinary reads and RPC resources exclude tombstones; internal replay guards return no deleted content. DELETE itself returns only `{ data: { id } }`, and repeated deletion is `404`. Tested deletion/replay cannot resurrect entries.

Writing creation remains non-opted-in. A separate explicit request can grant reflection consent for a saved entry revision when the independent service is configured. Writing and readiness never depend on an AI service being healthy. Editing or deleting source text revokes pending reflection work and removes linked letters and derived tasks; unrelated standalone todos remain. See [connected app milestone](connected-app.md) for the versioned HTTP contract, scheduling, ownership and context cleanup.

## Validation

CI verifies clean pinned installs, formatting, lint/types, backend units, real Supabase permissions/RPCs and production HTTP/browser acceptance. Use the checks on the current [combined PR](https://github.com/Hassan1278/beyond/pull/5) for exact tested-head evidence. No hosted deployment or database mutation is included.

For guarded local acceptance with Docker, run `npm run db:start`, `npm run db:test`, `npm run build:api` and `npm run test:api:writing`. The local stack uses API55321 and DB55322. Fixture tests capture local runtime keys without committing/logging them and remove only the fictional users they created. Real connected-browser acceptance additionally requires a configured web build and Chromium; CI runs this gate.
