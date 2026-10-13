# Product API

Persistent settings, explicitly approved revisioned memories, standalone and accepted-action todos, private exports, content clearing and optional recoverable account deletion are connected to the designed frontend. See [writing API](api.md) for entry contracts and [connected app milestone](connected-app.md) for reflection consent/results, shared clients, setup and remaining work. Production AI generation remains independent and unimplemented.

## Routes

All product calls freshly verify a Supabase bearer token. All ordinary operations require an active profile and live owned Auth session; direct RLS/RPC calls enforce the same session gate. Success is `{ data: ... }`, private responses are `no-store`, and exact browser origins are enforced. Existing safe error codes and request IDs apply. No product ownership is accepted from the request body.

| Method      | Path                                | Input / result                                                                             |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| GET         | `/api/v1/settings`                  | Persisted settings with `reflection_enabled: false`, revision and UTC update time          |
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

Preferences: timezone is a supported named IANA zone (default `Etc/UTC`), morning time is `07:00`, `07:30` or `08:00`, voice is `friend`, `mentor`, `future` or `diary`, and `memory_paused` is boolean. Saving these preferences does not enable AI, generate a letter or schedule a reflection. Preference changes increment a revision.

Memory text and todo titles preserve whitespace and valid Unicode, are nonblank and limited to 2000 UTF-16 units in both API and SQL. Product bodies inherit the writing transport's 128000-byte / 5000-ms total bounds. No automatic memory approval or action acceptance exists. A source-linked memory must reference the same owner's live journal entry. Deleting the source scrubs linked memories and derived reflection content/tasks; unrelated standalone memories/todos remain. Memory changes or pause revoke pending historical context. Pause excludes approved memories and prior corrections from future reflection input.

Memory resources now expose `id`, `text`, `source_entry_id`, positive `revision`, and exact UTC `created_at`/`updated_at`. New and backfilled live memories start at revision 1. Corrections require explicit approval, increment the revision and preserve the source and creation time. Concurrent edits have one winner; clients resolve 409 using the latest resource. Creation retries compare the original approved payload and return the current corrected memory. Original text remains privately stored for this replay check until deletion; it is never returned in normal reads or exports. Forgetting a memory or deleting its source clears current text, original payload, source and all revision/time fields. Retired keys cannot recreate it. Deploy the additive migrations with the matching API/shared-client version.

Normal product operations use only the publishable key and verified user token. Database grants prohibit direct writes and private original/key reads. Active-owner, live-session RLS and validated security-definer RPCs independently enforce ownership, revision/replay rules and deletion. New SQL is additive; do not edit previously applied migrations.

Readiness remains a catalog-only boolean with no user data or AI dependency. The additive readiness migration preserves the writing gate and checks the product tables, validated key/cleanup constraints, RLS policies, indexes, source-cleanup trigger and RPC security/grants, live-session enforcement, reflection queues/results and context cleanup. The memory live/deleted revision constraint, new read columns and hardened memory/export RPCs are also required. Missing RLS, disabled source cleanup, exposed queue RPCs or direct client write grants make the API unready.

## Private account exports

`GET /api/v1/account/export?section=settings|entries|memories|todos|reflections` returns `{ data: ... }` with `format_version: 1`, a UTC `exported_at` page timestamp and the requested `section`. Settings adds `settings` and accepts no pagination. Other sections add `items` and `next_cursor`; `limit` defaults to 20 and accepts canonical integers 1..50. Pass the returned cursor unchanged with the same section and limit until it is null. Cursor ordering uses descending exact creation time and UUID, matching normal resource lists. The database allows at most 51 rows for a single lookahead; API output is capped at the requested limit.

Each page freshly verifies the user and active profile, then requires an authentication-method timestamp within five minutes, with the same methods as account deletion. Refreshing a token alone does not satisfy this requirement. Direct authenticated export RPCs independently enforce recent sign-in using PostgREST's verified JWT claims. Reauthenticate and retry the current page on an old-session 403. No privileged credentials or account-deletion configuration are needed. Owner IDs, duplicate/unknown queries, mismatched cursor pairs and noncanonical limits are rejected.

Exports contain only current live journal entries, approved memories, standalone and accepted-action todos, reflections and settings. Deleted content, original creation payloads, owner/key columns, Auth credentials and cleanup queue metadata are excluded. Memory pause does not prevent the owner exporting their approved memories. Responses have `no-store`, safe attachment filenames and `nosniff`; the backend creates no file, storage object, export job or saved export copy. Frontends must handle the private download explicitly.

Pages are live reads, not a consistent point-in-time backup. Concurrent additions, edits or deletions can change later pages; restart a section to collect a fresh view. Downloaded client copies remain under the user's control and cannot be recalled by account/content deletion. This endpoint exports current product records, not hosted backups or Auth/provider metadata.

## Recoverable account deletion

The feature is disabled unless all of these server-only values are configured:

- `ACCOUNT_DELETION_ENABLED=true`
- `SUPABASE_SECRET_KEY` (isolated account operations only)
- `ACCOUNT_JOB_TRIGGER_SECRET` (32..256 URL-safe characters)

Configure a scheduler to POST to `/api/v1/internal/accounts/process` using that trigger as its bearer, and a small bounded batch. Scheduler setup/deployment is a separate hosted action. Writing/settings/memories/todos require none of these privileged settings. Feature configuration is a prerequisite, not proof that a scheduler is running; verify the trigger before enabling account deletion in a hosted environment.

DELETE requires a fresh Supabase verification and an authentication-method timestamp within five minutes (password, OAuth, TOTP, SSO or WebAuthn). Refreshing an access token alone is insufficient. Clients must sign in again when the API returns 403 for an old session. The API derives the target UUID from the verified identity. Only the isolated privileged path can enqueue deletion; authenticated clients cannot invoke queue RPCs directly or disable another account.

The enqueue transaction creates a private content-free cleanup record and marks the profile deleting atomically, using the same queue/profile lock order as the worker. All normal RPC/RLS paths then deny access. A worker claims a 60-second lease with a new fencing token, purges owned settings/memories/todos/journal/reflection rows and pending context, deletes the Auth user, then removes the queue record. Auth deletion is deliberately last. Repeated requests, expired leases, crashes after purge or Auth deletion, and stale workers are handled safely. Retry delay grows from 30 seconds to a one-hour cap. There is no automatic return to active status or cancellation after deletion begins.

Queue records contain only UUIDs, request/retry times, attempt count and lease metadata. No journal payload, email, password or access token is stored. After completion, queue metadata is removed too. The worker returns claimed/completed/retried counts and never exposes upstream error bodies. Future storage/context/AI features must extend cleanup before being enabled.

## Shared client and frontend handoff

`createApiClient({ origin, getAccessToken, fetcher?, timeoutMs? })` exposes entries/settings/memories/todos/account methods, including `memories.update(id, { text, approved: true, expected_revision })` and `account.exportPage({ section, limit?, cursor? })`. It obtains the current access token on each call, validates inputs and response contracts, disables caching, bounds request time, supports cancellation and returns safe `ApiClientError` metadata. It contains no React, Node-only code, session storage or privileged keys. The connected frontend supplies Supabase auth adapters and invokes this client with current owner-bound tokens. Reflection methods use the same transport and cancellation rules.

## Privacy limits and validation

Access isolation is not end-to-end encryption. Hosting transport/at-rest encryption and backup retention must be verified and disclosed at deployment. Active database cleanup cannot erase historical provider backups instantly. No data is sent to AI while the independent service is disabled. Enabling it requires the separate per-entry consent, bounded context and retention contract. Memory pause excludes both approved memories and prior corrections; an explicitly consented current entry can still be processed. Avoid journal content, tokens or email addresses in routine logs.

Content clearing uses the same recent-sign-in gate as export/deletion. It scrubs live and original journal/memory/todo payloads, removes linked reflection data and pending jobs, and resets preferences while retaining the Auth account, API quota state and content-free retired creation keys. Old retries cannot restore deleted content. Full account deletion removes these retained records too. Client downloads remain user-controlled copies.

Current CI evidence is attached to [PR5](https://github.com/Hassan1278/beyond/pull/5). Historical tested source/count records remain in the backend change log. Hosted migration, scheduler/email/OAuth configuration, AI generation, voice and native device validation remain in the [handoff](connected-app.md#remaining-work).
