# Private backend milestone

This feature branch extends the tested writing backend with persistent settings, explicitly approved revisioned memories, standalone todos, a portable authenticated API client, recoverable account deletion and paginated private exports. The existing journal contract remains unchanged. Production AI processing, reflection jobs, voice, patterns/Life Film and frontend integration remain unimplemented. The undesigned `apps/web` and `apps/mobile` scaffolds are unchanged.

## Routes

All product calls freshly verify a Supabase bearer token. Settings/memories/todos also require an active profile. Success is `{ data: ... }`, private responses are `no-store`, and exact browser origins are enforced. Existing safe error codes and request IDs apply. No product ownership is accepted from the request body.

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
| DELETE      | `/api/v1/account`                   | Recent sign-in required; 202 `{ data: { status: 'deleting' } }`                            |
| GET         | `/api/v1/account/export`            | Recent sign-in; required section; bounded current owned data with download headers         |
| POST        | `/api/v1/internal/accounts/process` | Separate scheduler bearer secret; JSON `{ limit?: 1..10 }`; aggregate counts only          |

Preferences: timezone is a supported named IANA zone (default `Etc/UTC`), morning time is `07:00`, `07:30` or `08:00`, voice is `friend`, `mentor`, `future` or `diary`, and `memory_paused` is boolean. Saving these preferences does not enable AI, generate a letter or schedule a reflection. Preference changes increment a revision.

Memory text and todo titles preserve whitespace and valid Unicode, are nonblank and limited to 2000 UTF-16 units in both API and SQL. Product bodies inherit the writing transport's 128000-byte / 5000-ms total bounds. No automatic memory approval or action acceptance exists. A source-linked memory must reference the same owner's live journal entry. Deleting the source scrubs linked memories; unrelated standalone memories/todos remain.

Memory resources now expose `id`, `text`, `source_entry_id`, positive `revision`, and exact UTC `created_at`/`updated_at`. New and backfilled live memories start at revision 1. Corrections require explicit approval, increment the revision and preserve the source and creation time. Concurrent edits have one winner; clients resolve 409 using the latest resource. Creation retries compare the original approved payload and return the current corrected memory. Original text remains privately stored for this replay check until deletion; it is never returned in normal reads or exports. Forgetting a memory or deleting its source clears current text, original payload, source and all revision/time fields. Retired keys cannot recreate it. Deploy the additive migration with the API/shared-client contract update before integrating clients; this extends the pre-beta memory response shape.

Normal product operations use only the publishable key and verified user token. Database grants prohibit direct writes and private original/key reads. Active-owner RLS and validated security-definer RPCs independently enforce ownership, revision/replay rules and deletion. New SQL is additive; do not edit previously applied migrations.

Readiness remains a catalog-only boolean with no user data or AI dependency. The additive readiness migration preserves the writing gate and checks the product tables, validated key/cleanup constraints, RLS policies, indexes, source-cleanup trigger and RPC security/grants. The memory live/deleted revision constraint, new read columns and hardened memory/export RPCs are also required. Missing RLS, disabled source cleanup, exposed queue RPCs or direct client write grants make the API unready.

## Private account exports

`GET /api/v1/account/export?section=settings|entries|memories|todos` returns `{ data: ... }` with `format_version: 1`, a UTC `exported_at` page timestamp and the requested `section`. Settings adds `settings` and accepts no pagination. Other sections add `items` and `next_cursor`; `limit` defaults to 20 and accepts canonical integers 1..50. Pass the returned cursor unchanged with the same section and limit until it is null. Cursor ordering uses descending exact creation time and UUID, matching normal resource lists. The database allows at most 51 rows for a single lookahead; API output is capped at the requested limit.

Each page freshly verifies the user and active profile, then requires an authentication-method timestamp within five minutes, with the same methods as account deletion. Refreshing a token alone does not satisfy this requirement. Direct authenticated export RPCs independently enforce recent sign-in using PostgREST's verified JWT claims. Reauthenticate and retry the current page on an old-session 403. No privileged credentials or account-deletion configuration are needed. Owner IDs, duplicate/unknown queries, mismatched cursor pairs and noncanonical limits are rejected.

Exports contain only current live journal entries, approved memories, standalone todos and settings. Deleted content, original creation payloads, owner/key columns, Auth credentials and cleanup queue metadata are excluded. Memory pause does not prevent the owner exporting their approved memories. Responses have `no-store`, safe attachment filenames and `nosniff`; the backend creates no file, storage object, export job or saved export copy. Frontends must handle the private download explicitly.

Pages are live reads, not a consistent point-in-time backup. Concurrent additions, edits or deletions can change later pages; restart a section to collect a fresh view. Downloaded client copies remain under the user's control and cannot be recalled by account/content deletion. This endpoint exports current product records, not hosted backups or Auth/provider metadata.

## Recoverable account deletion

The feature is disabled unless all of these server-only values are configured:

- `ACCOUNT_DELETION_ENABLED=true`
- `SUPABASE_SECRET_KEY` (isolated account operations only)
- `ACCOUNT_JOB_TRIGGER_SECRET` (32..256 URL-safe characters)

Configure a scheduler to POST to `/api/v1/internal/accounts/process` using that trigger as its bearer, and a small bounded batch. Scheduler setup/deployment is a separate hosted action. Writing/settings/memories/todos require none of these privileged settings. Feature configuration is a prerequisite, not proof that a scheduler is running; verify the trigger before enabling account deletion in a hosted environment.

DELETE requires a fresh Supabase verification and an authentication-method timestamp within five minutes (password, OAuth, TOTP, SSO or WebAuthn). Refreshing an access token alone is insufficient. Clients must sign in again when the API returns 403 for an old session. The API derives the target UUID from the verified identity. Only the isolated privileged path can enqueue deletion; authenticated clients cannot invoke queue RPCs directly or disable another account.

The enqueue transaction creates a private content-free cleanup record and marks the profile deleting atomically, using the same queue/profile lock order as the worker. All normal RPC/RLS paths then deny access. A worker claims a 60-second lease with a new fencing token, purges owned settings/memories/todos/journal rows, deletes the Auth user, then removes the queue record. Auth deletion is deliberately last. Repeated requests, expired leases, crashes after purge or Auth deletion, and stale workers are handled safely. Retry delay grows from 30 seconds to a one-hour cap. There is no automatic return to active status or cancellation after deletion begins.

Queue records contain only UUIDs, request/retry times, attempt count and lease metadata. No journal payload, email, password or access token is stored. After completion, queue metadata is removed too. The worker returns claimed/completed/retried counts and never exposes upstream error bodies. Future storage/context/AI features must extend cleanup before being enabled.

## Shared client and frontend handoff

`createApiClient({ origin, getAccessToken, fetcher?, timeoutMs? })` exposes entries/settings/memories/todos/account methods, including `memories.update(id, { text, approved: true, expected_revision })` and `account.exportPage({ section, limit?, cursor? })`. It obtains the current access token on each call, validates inputs and response contracts, disables caching, bounds request time, supports cancellation and returns safe `ApiClientError` metadata. It contains no React, Node-only code, session storage or privileged keys. It does not implement frontend sign-in or new screens.

## Privacy limits and validation

Access isolation is not end-to-end encryption. Hosting transport/at-rest encryption and backup retention must be verified and disclosed at deployment. Active database cleanup cannot erase historical provider backups instantly. No data is sent to AI by this backend milestone; future processing requires an explicit consent/retention contract. Memory pause excludes memories from future context, not the current entry. Avoid journal content, tokens or email addresses in routine logs.

Previous milestone source `f155dc6` passed all three GitHub CI jobs in run [37970549760](https://github.com/Hassan1278/beyond/actions/runs/37970549760): clean pinned-toolchain installs, dependency/format checks, backend lint/types, 600 unit tests across 13 files, production API build/health, 186 pgTAP checks and 20 guarded production HTTP acceptance groups against real local Supabase Auth/Postgres. The independent prototype passed 14 mocked behavioral groups, all 25 screen/page renders and its production build. Embedded PostgreSQL also checked all migrations, RLS, readiness and cleanup locally. This identifies the tested prior implementation source, not the memory-edit/export extension. No hosted database changes, deployment, paid AI call or native build is included.

Memory-edit/export implementation source `0e88cf6` passed all three jobs in [CI run 37997580346](https://github.com/Hassan1278/beyond/actions/runs/37997580346): clean pinned-toolchain installs, dependency/format checks, backend lint/types, 641 unit tests across 15 files, production API build/health, 243 pgTAP checks and 22 production HTTP acceptance groups against real local Supabase Auth/Postgres. Coverage includes explicit corrections, concurrent revisions, immutable replay, exact pagination, deleted-content exclusion and recent-sign-in enforcement in both API and direct RPC. Valid signed JWTs with old sign-in claims were rejected by both real HTTP paths, while fresh controls succeeded. The unchanged prototype passed 14 mocked behavior groups, all 25 renders and its production build. Embedded PostgreSQL separately verified the additive upgrade on existing live/deleted memory fixtures. This record is a later documentation-only commit and identifies the exact checked implementation source; no hosted database change or deployment occurred.
