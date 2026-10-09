# Architecture

## Status and superseding decision

Step001 is historical documentation-only architecture commit `93e473b`; step002 established health/configuration, shared input schemas and unit tooling. **Step003 implements the non-opted-in writing gate.** Broader jobs/AI/client/account-cleanup architecture below remains a target, not completed functionality. The all-in-one web/API design is superseded: `apps/web` and `apps/mobile`, including unused legacy web API/server placeholders, remain untouched.

One monorepo contains independently deployed/tested frontends, product API and future AI HTTP service. Backend/environment implementation, small validated local commits, feature-branch push and local Docker/backend work are authorized. Main overwrite/force-push, hosted DB/account/deployment actions, PR creation and frontend/AI-owner implementation are not; obtain separate authorization when needed.

### Implemented step003 writing

- API-only Next.js Node health and `/api/v1/entries` GET/POST plus `/:id` GET/PATCH/DELETE handlers, server-only modules and shared input/resource/cursor/health/error contracts.
- Fresh Supabase Auth bearer verification and active profile on every writing call; exact-origin CORS/preflight, no-store responses, user-scoped DB access and no API admin credentials for writing.
- Public active/deleting profiles with Auth trigger/backfill; entries with active-own-live read RLS, private original/key column grants and authenticated validated create/update/delete/get/list RPCs. Security-definer writing RPCs use an empty search path and active-profile lock.
- Unique owner/key original-payload equality, current-edit replay, atomic expected revisions and SQL-NULL cleared-content tombstones. Resource is `{ id, text, revision, reflection_opt_in: false, created_at, updated_at }`; see API for exact status/input/cursor rules.
- Real `api_schema_ready` catalog-checking SQL RPC; bounded readiness `200` tested with real local Supabase. Writing is non-opted-in only, with no AI/job table or AI-health prerequisite.

Final checks passed: **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), lint/types and 128000-byte/total-5000-ms body deadline/cancellation regressions. Production Next build passed with dynamic health/entries routes in an isolated fresh mirror; its temporary Turbopack root adjustment for the shared dependency junction did not change repository Next config. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked identity, RLS/grants, races, replay/tombstones/paging/deleting-profile denial and fixture cleanup; pgTAP **123** passed. Main owns `docs/backend-changes.txt`. Separate real-DB CI and feature-branch push triggering are implemented; remote execution and clean `npm ci` remain unverified. Root pins/overrides are unchanged, with no step003 package addition.

## System boundary and ownership

| Path                           | Responsibility / status                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `apps/web`                     | Website scaffold; legacy backend placeholders untouched until separately authorized migration            |
| `apps/mobile`                  | Expo / React Native Android/iOS scaffold; native conventions/pins unchanged                              |
| `apps/api/src/app/api`         | API-only Node health and writing routes; future product routes                                           |
| `apps/api/src/server`          | Verified identity, config and user-scoped writing; future isolated privileged account/jobs operations    |
| `apps/api/src/server/services` | Product rules: writing now; reflections, memories, actions/todos, settings/deletion later                |
| `apps/api/src/server/jobs`     | Future claims, leases/fencing, retry/recovery, AI HTTP calls and finalization                            |
| `services/ai`                  | AI-owner independent HTTP target: prompts/providers and optional RAG/transcription, unimplemented        |
| `packages/shared/src`          | Writing input/resource/cursor/output contracts now; shared API client/AI contracts/DB types deferred     |
| `supabase`                     | Local writing config, migrations, RLS/grants/validated RPCs and pgTAP; later jobs/private media policies |
| `tests`                        | Production health/local writing acceptance; fake independent AI HTTP and client E2E later                |
| `evals`                        | Fictional AI scenarios and future AI-owner runner                                                        |

Keep handlers thin and backend modules server-only. API owns auth/RLS/database and future queues/finalization/deletion. AI receives no DB admin keys, directly saves no product data and creates no automatic todos/memories. Backend may define HTTP contracts/test fixtures, not `services/ai` implementation.

```text
Web / mobile -- verified bearer token --> apps/api -- user-scoped access --> Supabase
                                             |
Scheduler -- protected trigger --> future API jobs -- authenticated HTTP --> services/ai
                                             |                              |
                                      validated finalize             provider / optional RAG
```

Shared TypeScript remains framework/runtime-independent. API shared-package transpilation exists; web migration is separately owned, and Expo keeps standard monorepo support. No frontend/native upgrade is authorized here.

## Identity, origins and health

Supabase handles passwords/sign-in/reset/refresh. Implemented writing freshly verifies tokens and active profiles, deriving owner from identity; RLS/grants/RPCs enforce the same boundary outside the API. Both future clients must use bearer tokens on the independent `/api/v1` API; cookie session details and decoded claims are not sufficient. Exact-origin CORS/preflight is implemented, never authentication; private responses are uncached.

Public liveness returns dependency-free `200`. Readiness validates writing config and invokes actual `api_schema_ready` with a 1500 ms deadline, returning `200` only for successful JSON boolean `true`, otherwise safe `503`. The RPC checks SQL catalogs; no secrets/schema/user details are exposed. AI health is independent and not required for saves. Protected dependency/queue diagnostics remain future work.

## Data model: implemented writing and future additions

| Table               | Status / data                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | Implemented Auth identity, active/deleting lifecycle, trigger/backfill; scheduling preference API remains future work       |
| `journal_entries`   | Implemented owned text/revision, false opt-in, UTC timestamps, private immutable original/key and minimal deleted tombstone |
| `reflection_jobs`   | Unimplemented owner/entry/revision, due/status/attempts/leases/fencing/backoff                                              |
| `reflections`       | Unimplemented generated letter/suggestions/provenance/source revision and separate correction                               |
| `approved_memories` | Unimplemented explicit owned approval and source links                                                                      |
| `todos`             | Unimplemented standalone/accepted-action todos with unique suggestion decision links                                        |

Supabase owns Auth records. Writing migrations define constraints/indexes/grants/RLS and RPC input/owner checks. Generated shared DB types, preference features and private media/job-kind support remain future work.

Unique `(owner_id, idempotency_key)` is enforced under concurrency. Live retries compare only immutable original creation payload: equivalent replay returns current resource after edits; a different original conflicts `409`. Expected revisions atomically increment. Retired keys conflict before comparison. Deletion sets original/text/consent/revision/created/updated fields to SQL `NULL`, leaving minimum IDs, owner/key and `deleted_at`. Reads/RLS/RPC resources exclude tombstones; DELETE returns only `{ data: { id } }`. Product missing/deleted/other-owner resources are `404`. Direct PostgREST `P0001` is `400`, while product not_found/forbidden/conflict map to `404`/`403`/`409`; direct DB never returns wrong-owner content.

## Durable jobs and scheduling gates (unimplemented)

Final local writing/unit/lint/types/health and mirror production build checks passed independently of AI. Creation still requires literal `false` opt-in and creates no job. Enable opted-in entry/eligible-job atomic persistence only after a later contract extension and tested scheduling; opt-in is not a writing prerequisite.

Prototype tones `friend`, `mentor`, `future`, `diary`; morning times `07:00`, `07:30`, `08:00`; validated IANA timezone, UTC due time. Test next-local-calendar-morning resolution across UTC/date boundaries and DST gaps/overlaps. Preference changes affect future jobs; editing invalidates older revision work. Never force production demo delivery.

Before AI processing, implement bounded atomic claims, leases/fencing, finalization checks, backoff/maximum attempts and crash/lease-expiry recovery. Jobs/output are revision-unique. DB finalization rechecks active owner, live source revision/eligibility and fencing token; late results cannot restore deleted content. Scheduler later invokes a protected API trigger, not a user-token privilege escalation.

Versioned authenticated `POST /v1/reflections:generate` takes entry/revision/tone/bounded owned context and returns letter/actions/provenance. Agree credential rotation/version and output validation; no provider/model selected. Fake independent AI HTTP fixtures are future tests only, not production fallback. Explicit acceptance atomically records a durable unique decision/todo; repeat returns the surviving current todo, or `409` after explicit todo deletion. Rejection creates no todo, corrections stay separate and memories require explicit approval.

## Voice, optional context and deletion

Voice is a later private Storage/owned media/transcription-job proof with separate consent and a user-reviewed transcript into text writing. RAG is optional and needs bounded owned sources/provenance/retention/deletion before use. Full patterns/Life Film remain deferred; never fabricate statistics.

Implemented entry deletion clears content and prevents replay resurrection. Proposed future source cascades remove dependent reflections, source-linked memories and derived todos/cancel work; standalone todos remain. Active/deleting profile denial is implemented, **not durable account deletion**. A later endpoint/workflow must gate all product/claim/finalize paths and durably retry product/storage/context cleanup before Auth deletion, with interrupted-cleanup tests. Disclose provider/backup retention; no end-to-end encrypted AI or perfect-safety promise. See data handling.

## Deployment and environment target

Separate web/API Vercel projects, AI-owner-selected HTTP hosting, Supabase Auth/Postgres and later private Storage/scheduling, and Expo EAS native binaries remain the deployment target. Keep Node.js `24.20.0` / npm `11.19.0` and one root lockfile.

Writing config is `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, exact comma-separated `CORS_ALLOWED_ORIGINS`; HTTPS except HTTP loopback, no wildcard/path-bearing origins. API example is writing-only and fixed to local Supabase port `55321`. Future feature-boundary config is optional until enabled: isolated `SUPABASE_SECRET_KEY` for jobs/account, `JOB_TRIGGER_SECRET`, `AI_SERVICE_URL`/versioned `AI_SERVICE_TOKEN`. Provider credentials belong only in AI; frontend examples require separately authorized migration.

Local ports: API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started. Windows excludes `54290..54489`; local ports changed rather than OS settings. Root `npm run db:start` configures writing-only service exclusions by default; testing order is in setup. Docker CLI binds `0.0.0.0` by default: local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet, and `npm run db:start` restarts it. No resets/hosted changes. Feature-branch push/local Docker/backend work is authorized, not deployment/hosted DB/main overwrite/PR or cross-owner implementation.

References: [Next.js backend support](https://nextjs.org/docs/app/guides/backend-for-frontend), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo SDK compatibility](https://docs.expo.dev/versions/latest/), [Vercel monorepos](https://vercel.com/docs/monorepos).
