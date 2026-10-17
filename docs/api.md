# API reference

Every route lives in `backend/api/src/app/api/` (one folder per path) and delegates to a handler in `backend/api/src/server/`. Request/response schemas are shared with the clients through `shared/src/schemas/`. The letter worker's contract with the AI service is in [AI service](ai-service.md).

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

Readiness POSTs `{"p_release":"beyond-letters-v1"}` to `/rest/v1/rpc/api_release_ready` using the publishable key with a 1500 ms deadline. This RPC is installed after the release's required migrations and delegates to the full `api_schema_ready()` catalog checks. An older schema may pass its original gate but lacks the release RPC and therefore returns safe503 through this API. Both routes use no-store/request IDs and expose no schema details, secrets or user content. Catalog checks cover writing, product, session and letter permissions. AI health/credentials are not a readiness prerequisite. Future incompatible database requirements must use a new release marker installed after their migrations.

## Implemented writing routes

| Method | Path                  | Behavior                                                              |
| ------ | --------------------- | --------------------------------------------------------------------- |
| POST   | `/api/v1/entries`     | Create/replay non-opted-in entry; `200` with current resource         |
| GET    | `/api/v1/entries`     | Bounded live-owned page with canonical cursor                         |
| GET    | `/api/v1/entries/:id` | `200` with one live-owned resource; missing/deleted/other-owner `404` |
| PATCH  | `/api/v1/entries/:id` | Expected-revision edit; `200` current resource, stale revision `409`  |
| DELETE | `/api/v1/entries/:id` | `200` `{ data: { id } }`; missing/already-deleted/other-owner `404`   |

Portable writing resource and response-output schemas are implemented and validated by the shared API client. Resource: `{ id, text, revision, reflection_opt_in: false, created_at, updated_at }`, with UUID ID, integer revision and UTC timestamps. Creation and equivalent replay both return `200`, not `201`; replay returns current persisted text without reverting edits or exposing the private original creation payload. Saving an entry does not ask for a letter; sealing does (`POST /api/v1/letters`).

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

Saving a night never asks for a letter; sealing it (`POST /api/v1/letters`) does. Writing and readiness never depend on the AI service being healthy. Editing or deleting a night removes its letter and any queued work; unrelated todos remain. See [AI service](ai-service.md) for the versioned HTTP contract.

## Validation

CI (`.github/workflows/ci.yml`) verifies clean pinned installs, formatting, lint/types, backend units, real local Supabase permissions/RPCs and production HTTP/browser acceptance on every pull request.

For guarded local acceptance with Docker, run `npm run db:start`, `npm run db:test`, `npm run build:api` and `npm run test:api:writing`. The local stack uses API55321 and DB55322. Fixture tests capture local runtime keys without committing/logging them and remove only the fictional users they created. Never aim these harnesses at the hosted project.

## Product routes

Persistent settings, revisioned memories, standalone todos, private exports, content clearing and optional recoverable account deletion. All use the same transport, identity and error rules as above.

### Routes

All product calls freshly verify a Supabase bearer token. All ordinary operations require an active profile and live owned Auth session; direct RLS/RPC calls enforce the same session gate. Success is `{ data: ... }`, private responses are `no-store`, and exact browser origins are enforced. Existing safe error codes and request IDs apply. No product ownership is accepted from the request body.

| Method      | Path                                | Input / result                                                                             |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| GET         | `/api/v1/settings`                  | Persisted settings (see below), revision and UTC update time                               |
| PATCH       | `/api/v1/settings`                  | At least one preference plus `expected_revision`; stale edits return 409                   |
| POST        | `/api/v1/memories`                  | `text`, `source_entry_id` (UUID or null), literal `approved: true`, UUID `idempotency_key` |
| GET         | `/api/v1/memories`                  | `{ items, next_cursor }` with the existing canonical limit/cursor rules                    |
| GET, DELETE | `/api/v1/memories/:id`              | Owned live memory / ID-only deletion result                                                |
| PATCH       | `/api/v1/memories/:id`              | New `text`, literal `approved: true`, `expected_revision`; stale edits return 409          |
| POST        | `/api/v1/todos`                     | `title`, UUID `idempotency_key`; original-payload replay returns current todo              |
| GET         | `/api/v1/todos`                     | `{ items, next_cursor }`                                                                   |
| GET         | `/api/v1/todos/:id`                 | Owned live todo                                                                            |
| PATCH       | `/api/v1/todos/:id`                 | `title` and/or boolean `completed`, plus `expected_revision`                               |
| DELETE      | `/api/v1/todos/:id`                 | Content-scrubbed tombstone; retired creation key cannot recreate it                        |
| GET         | `/api/v1/account`                   | Active status and configured optional capabilities                                         |
| DELETE      | `/api/v1/account/data`              | Recent sign-in content clear; retains Auth and content-free retired keys                   |
| DELETE      | `/api/v1/account`                   | Recent sign-in required; 202 `{ data: { status: 'deleting' } }`                            |
| GET         | `/api/v1/account/export`            | Recent sign-in; required section; bounded current owned data with download headers         |
| POST        | `/api/v1/internal/accounts/process` | Separate scheduler bearer secret; JSON `{ limit?: 1..10 }`; aggregate counts only          |

Preferences:

- `timezone`: a supported named IANA zone, default `Etc/UTC`. The app sets it to the browser's zone.
- `voice`: `friend`, `mentor`, `future` or `diary`.
- `letter_language`: `auto`, `en`, `zh-hant` or `zh-hans`.
- `delivery_time`: a quarter hour from `05:00` to `12:45`.
- `allow_early`, `onboarded`, `memory_paused`: booleans.
- `directions`: a map from the six Identity direction keys to `suggested`, `confirmed`, `dismissed` or `removed`.
- `welcome_seen`: boolean; the first sign-in welcome has been completed. Existing accounts start `false` and see it once.
- `welcome_reasons`: up to six distinct of `want`, `mind`, `behind`, `write`, `lookback`, `other` (welcome screen 2, "What brings you here?"); `welcome_other`: optional trimmed text, 1–150 characters, or `null`. Kept for the team; not shown as a memory and not sent to the letter writer.
- `letter_name`: optional trimmed text, 1–40 characters, or `null`; what letters call the person. The app fills it into the letter's `{{name}}`; it is never part of the letter writer's input.
- The `welcome_*` fields and `letter_name` need migration `20261017000000_welcome`; until it is applied they are absent from responses and the app falls back to `onboarded`.

Legacy `morning_time` (`07:00`/`07:30`/`08:00`) and `reflection_enabled: false` remain for compatibility. Saving preferences never writes a letter. Every change increments the revision.

Memory text and todo titles preserve whitespace and valid Unicode, are nonblank and limited to 2000 UTF-16 units in both API and SQL. Product bodies inherit the writing transport's 128000-byte / 5000-ms total bounds. Memories created through this route are `told`. Letters may add up to two `learned` memories, which become `edited` once changed. A source-linked memory must reference the same owner's live journal entry. Deleting the source scrubs linked memories; unrelated memories and todos remain. Memory changes, forgetting or pausing cancel in-flight letter context. Pause sends no memories to the letter writer. A forgotten memory's normalized hash is kept privately so letters never relearn it.

Memory resources expose `id`, `text`, `source_entry_id`, `kind`, positive `revision`, and exact UTC `created_at`/`updated_at`. New and backfilled live memories start at revision 1. Corrections require explicit approval, increment the revision and preserve the source and creation time. Concurrent edits have one winner; clients resolve 409 using the latest resource. Creation retries compare the original approved payload and return the current corrected memory. Original text remains privately stored for this replay check until deletion; it is never returned in normal reads or exports. Forgetting a memory or deleting its source clears current text, original payload, source and all revision/time fields. Retired keys cannot recreate it. Deploy the additive migrations with the matching API/shared-client version.

Normal product operations use only the publishable key and verified user token. Database grants prohibit direct writes and private original/key reads. Active-owner, live-session RLS and validated security-definer RPCs independently enforce ownership, revision/replay rules and deletion. New SQL is additive; do not edit previously applied migrations.

Readiness remains a catalog-only boolean with no user data or AI dependency. The additive readiness migration preserves the writing gate and checks the product tables, validated key/cleanup constraints, RLS policies, indexes, source-cleanup trigger and RPC security/grants, live-session enforcement and context cleanup. The letters migration adds checks for the letter, job, note and usage tables, their RLS and triggers, and the worker/user RPC grants. Missing RLS, disabled cascades, exposed worker RPCs or direct client write grants make the API unready.

### Letters, notes, voice

| Method | Path                               | Input / result                                                                                               |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/v1/letters`                  | Seal: `entry_id`, `expected_revision`, `journal_date`, `deliver_at`, literal `consent: true` → letter        |
| GET    | `/api/v1/letters`                  | `{ items, next_cursor }`, newest first, each with its night (`entry`)                                        |
| GET    | `/api/v1/letters/:id`              | One owned letter                                                                                             |
| PATCH  | `/api/v1/letters/:id`              | Any of `read: true`, `early: true`, `private`, `steps` (`step.0`–`step.2` → `tried`/`skipped`), `deliver_at` |
| POST   | `/api/v1/letters/:id/retry`        | Try a failed letter again (counts toward the daily limit)                                                    |
| GET    | `/api/v1/notes`                    | `{ items }`: month (`2026-10`) and year (`Y2026`) notes                                                      |
| POST   | `/api/v1/notes`                    | `{ key }`: writes the note from delivered, kept letters in that span; `409` if there are none                |
| GET    | `/api/v1/ai`                       | `{ letters, notes, transcribe }`: what the AI service can do right now                                       |
| POST   | `/api/v1/transcribe?lang=…`        | Raw `audio/*` body ≤4 MB → `{ text }` (empty when no speech was heard)                                       |
| POST   | `/api/v1/internal/letters/process` | Scheduler bearer `LETTER_JOB_TRIGGER_SECRET`; `{ limit?: 1..5 }` → counts only                               |

Letter `status` is `queued`, `ready` or `failed` (`error`: `unavailable`, `invalid_output` or `refused`). Other rules:

- Sealing the same night twice returns the same letter.
- Sealing a stale revision returns `409`.
- `early` needs `allow_early`, otherwise `403`.
- Reading, to-dos and privacy apply to ready letters only.
- `deliver_at` can move only while the letter is unopened and undelivered.
- Daily limits (letters 6, notes 10, transcriptions 40) return `429`.
- Notes and transcription return `503` while the AI service isn't configured; sealing still works.

### Private account exports

`GET /api/v1/account/export?section=settings|entries|memories|todos|letters|notes` returns `{ data: ... }` with `format_version: 1`, a UTC `exported_at` page timestamp and the requested `section`. Settings adds `settings` and notes adds `items`; neither accepts pagination. Other sections add `items` and `next_cursor`; `limit` defaults to 20 and accepts canonical integers 1..50. Pass the returned cursor unchanged with the same section and limit until it is null. Cursor ordering uses descending exact creation time and UUID, matching normal resource lists. The database allows at most 51 rows for a single lookahead; API output is capped at the requested limit.

Each page freshly verifies the user and active profile, then requires an authentication-method timestamp within five minutes, with the same methods as account deletion. Refreshing a token alone does not satisfy this requirement. Direct authenticated export RPCs independently enforce recent sign-in using PostgREST's verified JWT claims. Reauthenticate and retry the current page on an old-session 403. No privileged credentials or account-deletion configuration are needed. Owner IDs, duplicate/unknown queries, mismatched cursor pairs and noncanonical limits are rejected.

Exports contain only current live journal entries, memories, todos, letters (with their night), notes and settings. Deleted content, original creation payloads, owner/key columns, Auth credentials and cleanup queue metadata are excluded. Memory pause does not prevent the owner exporting their approved memories. Responses have `no-store`, safe attachment filenames and `nosniff`; the backend creates no file, storage object, export job or saved export copy. Frontends must handle the private download explicitly.

Pages are live reads, not a consistent point-in-time backup. Concurrent additions, edits or deletions can change later pages; restart a section to collect a fresh view. Downloaded client copies remain under the user's control and cannot be recalled by account/content deletion. This endpoint exports current product records, not hosted backups or Auth/provider metadata.

### Recoverable account deletion

The feature is disabled unless all of these server-only values are configured:

- `ACCOUNT_DELETION_ENABLED=true`
- `SUPABASE_SECRET_KEY` (isolated account operations only)
- `ACCOUNT_JOB_TRIGGER_SECRET` (32..256 URL-safe characters)

Configure a scheduler to POST to `/api/v1/internal/accounts/process` using that trigger as its bearer, and a small bounded batch. Scheduler setup/deployment is a separate hosted action. Writing/settings/memories/todos require none of these privileged settings. Feature configuration is a prerequisite, not proof that a scheduler is running; verify the trigger before enabling account deletion in a hosted environment.

DELETE requires a fresh Supabase verification and an authentication-method timestamp within five minutes (password, OAuth, TOTP, SSO or WebAuthn). Refreshing an access token alone is insufficient. Clients must sign in again when the API returns 403 for an old session. The API derives the target UUID from the verified identity. Only the isolated privileged path can enqueue deletion; authenticated clients cannot invoke queue RPCs directly or disable another account.

The enqueue transaction creates a private content-free cleanup record and marks the profile deleting atomically, using the same queue/profile lock order as the worker. All normal RPC/RLS paths then deny access. A worker claims a 60-second lease with a new fencing token, purges owned settings, memories, todos, nights, letters, notes, jobs and AI usage, deletes the Auth user, then removes the queue record. Auth deletion is deliberately last. Repeated requests, expired leases, crashes after purge or Auth deletion, and stale workers are handled safely. Retry delay grows from 30 seconds to a one-hour cap. There is no automatic return to active status or cancellation after deletion begins.

Queue records contain only UUIDs, request/retry times, attempt count and lease metadata. No journal payload, email, password or access token is stored. After completion, queue metadata is removed too. The worker returns claimed/completed/retried counts and never exposes upstream error bodies. Future storage/context/AI features must extend cleanup before being enabled.

### Shared client and frontend handoff

`createApiClient({ origin, getAccessToken, fetcher?, timeoutMs? })` exposes entries/settings/memories/todos/account methods, including `memories.update(id, { text, approved: true, expected_revision })` and `account.exportPage({ section, limit?, cursor? })`. It obtains the current access token on each call, validates inputs and response contracts, disables caching, bounds request time, supports cancellation and returns safe `ApiClientError` metadata. It contains no React, Node-only code, session storage or privileged keys. The connected frontend supplies Supabase auth adapters and invokes this client with current owner-bound tokens. Letter, note, AI-status and transcription methods use the same transport; note writing and transcription allow up to 180 s.

### Privacy limits and validation

Access isolation is not end-to-end encryption. Hosting transport/at-rest encryption and backup retention must be verified and disclosed at deployment. Active database cleanup cannot erase historical provider backups instantly. Nothing is sent to the AI service until a night is sealed; then only the contract's bounded input. Memory pause sends no memories; the sealed night itself is still written about. Avoid journal content, tokens or email addresses in routine logs.

Content clearing uses the same recent-sign-in gate as export/deletion. It scrubs live and original journal/memory/todo payloads, removes letters, notes and pending jobs, and resets preferences while retaining the Auth account, API quota state and content-free retired creation keys. Old retries cannot restore deleted content. Full account deletion removes these retained records too. Client downloads remain user-controlled copies.

Remaining work is listed in the [README](../README.md#whats-left).
