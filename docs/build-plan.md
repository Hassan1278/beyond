# Build plan

Backend/environment implementation, small validated local commits, feature-branch push and local Docker/backend work are authorized. Main overwrite/force-push, hosted database/deployment/account actions, PR creation and frontend/AI-owner implementation are not. Follow `docs/workstreams.md`; narrower delegated restrictions apply only to that task.

Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input schemas/unit tooling. **Step003 implements Gate 1 non-opted-in writing**, with Linux CI clean-install/dependency/root-format, backend unit/lint/types, normal production build, health and real DB checks passed for `b192bde`. Frontends/legacy web backend placeholders remain untouched; `services/ai` belongs to its separate owner.

## Gate 1: Independent API and writing proof — implemented

- API-only Node health and entries GET/POST plus `/:id` GET/PATCH/DELETE; portable strict input/resource/cursor/output contracts; the shared API client remains deferred. Creation opt-in is literal `false`; no AI/job table or AI-health prerequisite.
- Fresh verified Supabase bearer token and active profile every call, exact-origin CORS/preflight, no-store private responses and no writing admin credentials.
- Public active/deleting profiles with Auth trigger/backfill; entries active-own-live RLS/private-column grants and authenticated validated `entry_create/update/delete/get/list` RPCs. Security-definer RPCs use empty search path and active-profile lock.
- Unique owner/key original-payload equality: equivalent replay returns current edited resource `200`, different original/retired key `409`. Atomic expected revisions conflict on stale edits. Deletion NULLs original/text/consent/revision/created/updated, leaving minimum IDs, owner/key and deletion time; DELETE `200` `{ data: { id } }`, deleted/other-owner `404`, no resurrection.
- Actual catalog-checking `api_schema_ready` SQL RPC, bounded to 1500 ms by readiness; configured readiness `200` tested. Product not_found/forbidden/conflict are `404`/`403`/`409` despite direct PostgREST `P0001` HTTP `400`; direct DB never returns another owner's content.
- Text bound 20000 UTF-16 code units preserving whitespace/valid Unicode, no NUL/unpaired surrogate; strict expected revision 1..2147483647. Canonical limit 1..100/default 20 and base64url `{ created_at, id }` cursors preserving positive-year UTC microseconds. Body 128000-byte/total-5000-ms deadline and cancellation regressions passed final validation.

GitHub Actions run `37958461995` completed **SUCCESS** for source commit `b192bde`; both backend and real-database jobs passed. Linux CI verified clean root-lock `npm ci`, `npm run check:deps`, root `npm run format:check`, backend lint/types, **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), the normal repository production Next build and HTTP health, without a temporary root workaround. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed, including identity/RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. Body-limit/deadline/cancellation regressions and unconfigured live `200`/ready `503` passed. Main owns `docs/backend-changes.txt`; source commit `b192bde` is pushed, while the final documentation-record commit is not yet created and is not the source tested by this run.

Local acceptance order: `npm run db:start`, `npm run db:test`, `npm run build:api`, `npm run test:api:writing`. The local-only runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server. Root `db:start` now configures writing-only exclusions by default and is the restart command. API port/sample is `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started. Windows exclusions `54290..54489` were avoided by changing ports, not OS settings. Docker default `0.0.0.0` binds are local-dev only, never production. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`. No resets/hosted changes.

Gate 1 writing and Linux clean-install reproducibility are verified for `b192bde`; neither CI outcome remains an open project-wide blocker. Later modifications need their own checks. This does not establish full MVP or deployment acceptance.

## Gate 2: Scheduling and durable processing before AI — unimplemented

1. Add jobs/reflections/memory/todo primitives as needed. Extend the writing contract only when explicitly opted-in entry plus eligible job can be atomic; ordinary saves stay independent.
2. Test next-local-calendar-morning resolver: UTC/IANA, `07:00 | 07:30 | 08:00`, tones `friend | mentor | future | diary`, date/DST gaps/overlaps. Preference changes affect future jobs; edits invalidate older revisions. No production forced demo delivery.
3. Implement bounded atomic claims, leases/fencing, backoff/maximum attempts, crash/lease-expiry recovery and revision-unique jobs/output before AI. Finalization rechecks active owner, live source revision/eligibility and fencing token in DB.
4. Agree versioned credential/rotation and bounded request/response schemas for API-side `POST /v1/reflections:generate` client. Entry/revision/tone/authorized context in, letter/actions/provenance out; provider keys stay only in AI. Backend does not implement `services/ai`.
5. Use a future fake independent AI HTTP fixture for timeout/malformed/unavailable/duplicate/stale/delete-during-processing tests; never a production fallback.

Acceptance: no duplicate jobs/output, stale workers cannot finalize/resurrect content and interrupted processing recovers. Do not defer durability until after AI processing.

## Gate 3: Real AI and explicit decisions — unimplemented

AI owner implements/tests the independent service and selects provider/model after fictional evaluations/retention review. Deployment needs separate authorization. AI receives no DB admin keys; API owns all product writes/queue/finalization/deletion.

Implement explicit action acceptance/rejection and unique owned todos, not auto-todos/memories. Repeat acceptance returns the surviving todo in its current state; explicit todo deletion preserves the decision and repeats return `409`. Keep corrections separate; approve/remove memories explicitly. Test privacy-first source cascades through reflections/source-linked memories/derived todos, leaving unrelated standalone todos.

Deleting-profile denial already exists, but a durable account-deletion endpoint/workflow does not. Add reauthentication as appropriate, durable deleting gate over API/RLS/RPC/claim/finalize and retry product/storage/context cleanup before Auth deletion. Test interrupted cleanup and honestly disclose provider/backup retention; no end-to-end encrypted AI/perfect-safety claim.

## Gate 4: Voice as second core input — unimplemented

Add private Supabase Storage, owned media metadata/scoped policies and transcription job-kind support. AI owns transcription; consent is separate from reflection consent. User reviews transcript before text writing. Test isolation, expiry/retry/review/source/account cleanup. Optional RAG needs owned bounded source/provenance/deletion contracts. No native upgrade is authorized by this backend step.

## Gate 5: Client integration and release validation — unimplemented

Separately authorize web/mobile independent API-origin/bearer/shared-client/env migration and legacy placeholder cleanup. Verify cross-client writing/reflections/actions/reviewed voice/deletion on real devices. Preserve native identifiers, EAS instructions and SDK-compatible pins.

Before beta: two-user integration, Playwright, native previews, deep-link/session/network recovery, accessibility and fictional AI evaluations. JS export is not native signing/module proof. Full patterns/Life Film/broad attachments/custom native modules are outside this slice; never fabricate statistics. Store submission needs explicit release authorization.

## CI and merge progression

CI run `37958461995` completed SUCCESS in both jobs for source commit `b192bde`. That code commit is pushed to `feat/backend-foundation`; remote `main` remains unchanged at `2c9fa7e`. The final documentation-record commit is not yet created; do not present this run as testing a later commit. No merge, main overwrite or deployment occurred or is automatically authorized. Pins/overrides/root lockfile are unchanged; no package addition.

Linux CI verifies root-lock clean-install reproducibility. Local Windows `npm ci` remains host-guard constrained, not a project-wide blocker. No vulnerability audit is claimed; existing deprecation/non-failing warnings remain in main's log. These step003 results supersede historical foundation results.

Health smoke still requires `npm run build:api`, free port 3002 and no configured API-local env file; it checks live `200`/unconfigured ready `503` and stops its server, not writing acceptance. Writing acceptance uses the local guarded runner above. AI tests/evaluations remain independent. Frontend checks and EAS milestones belong to separately authorized owners; follow deployment for cloud/release/rollback actions.
