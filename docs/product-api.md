# Private backend milestone

This feature branch extends the tested writing backend with persistent settings, explicitly approved memories, standalone todos, a portable authenticated API client, and recoverable account deletion. The existing journal contract remains unchanged. Production AI processing, reflection jobs, voice, patterns/Life Film and frontend integration remain unimplemented. The undesigned `apps/web` and `apps/mobile` scaffolds are unchanged.

## Routes

All product calls freshly verify a Supabase bearer token. Settings/memories/todos also require an active profile. Success is `{ data: ... }`, private responses are `no-store`, and exact browser origins are enforced. Existing safe error codes and request IDs apply. No product ownership is accepted from the request body.

| Method      | Path                                | Input / result                                                                             |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| GET         | `/api/v1/settings`                  | Persisted settings with `reflection_enabled: false`, revision and UTC update time          |
| PATCH       | `/api/v1/settings`                  | At least one preference plus `expected_revision`; stale edits return 409                   |
| POST        | `/api/v1/memories`                  | `text`, `source_entry_id` (UUID or null), literal `approved: true`, UUID `idempotency_key` |
| GET         | `/api/v1/memories`                  | `{ items, next_cursor }` with the existing canonical limit/cursor rules                    |
| GET, DELETE | `/api/v1/memories/:id`              | Owned live memory / ID-only deletion result                                                |
| POST        | `/api/v1/todos`                     | `title`, UUID `idempotency_key`; original-payload replay returns current todo              |
| GET         | `/api/v1/todos`                     | `{ items, next_cursor }`                                                                   |
| GET         | `/api/v1/todos/:id`                 | Owned live todo                                                                            |
| PATCH       | `/api/v1/todos/:id`                 | `title` and/or boolean `completed`, plus `expected_revision`                               |
| DELETE      | `/api/v1/todos/:id`                 | Content-scrubbed tombstone; retired creation key cannot recreate it                        |
| DELETE      | `/api/v1/account`                   | Recent sign-in required; 202 `{ data: { status: 'deleting' } }`                            |
| POST        | `/api/v1/internal/accounts/process` | Separate scheduler bearer secret; JSON `{ limit?: 1..10 }`; aggregate counts only          |

Preferences: timezone is a supported named IANA zone (default `Etc/UTC`), morning time is `07:00`, `07:30` or `08:00`, voice is `friend`, `mentor`, `future` or `diary`, and `memory_paused` is boolean. Saving these preferences does not enable AI, generate a letter or schedule a reflection. Preference changes increment a revision.

Memory text and todo titles preserve whitespace and valid Unicode, are nonblank and limited to 2000 UTF-16 units in both API and SQL. Product bodies inherit the writing transport's 128000-byte / 5000-ms total bounds. No automatic memory approval or action acceptance exists. A source-linked memory must reference the same owner's live journal entry. Deleting the source scrubs linked memories; unrelated standalone memories/todos remain.

Normal product operations use only the publishable key and verified user token. Database grants prohibit direct writes and private original/key reads. Active-owner RLS and validated security-definer RPCs independently enforce ownership, revision/replay rules and deletion. New SQL is additive; do not edit previously applied migrations.

Readiness remains a catalog-only boolean with no user data or AI dependency. The additive readiness migration preserves the writing gate and checks the product tables, validated key/cleanup constraints, RLS policies, indexes, source-cleanup trigger and RPC security/grants. Missing RLS, disabled source cleanup, exposed queue RPCs or direct client write grants make the API unready.

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

`createApiClient({ origin, getAccessToken, fetcher?, timeoutMs? })` exposes entries/settings/memories/todos/account methods. It obtains the current access token on each call, validates inputs and response contracts, disables caching, bounds request time, supports cancellation and returns safe `ApiClientError` metadata. It contains no React, Node-only code, session storage or privileged keys. It does not implement frontend sign-in or new screens.

## Privacy limits and validation

Access isolation is not end-to-end encryption. Hosting transport/at-rest encryption and backup retention must be verified and disclosed at deployment. Active database cleanup cannot erase historical provider backups instantly. No data is sent to AI by this backend milestone; future processing requires an explicit consent/retention contract. Memory pause excludes memories from future context, not the current entry. Avoid journal content, tokens or email addresses in routine logs.

Implemented source `f155dc6` passed all three GitHub CI jobs in run [37970549760](https://github.com/Hassan1278/beyond/actions/runs/37970549760): clean pinned-toolchain installs, dependency/format checks, backend lint/types, 600 unit tests across 13 files, production API build/health, 186 pgTAP checks and 20 guarded production HTTP acceptance groups against real local Supabase Auth/Postgres. The independent prototype passed 14 mocked behavioral groups, all 25 screen/page renders and its production build. Embedded PostgreSQL also checked all migrations, RLS, readiness and cleanup locally. This record is a later documentation-only commit; it identifies the tested implementation source explicitly. No hosted database changes, deployment, paid AI call or native build is included.
