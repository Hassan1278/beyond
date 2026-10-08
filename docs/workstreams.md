# Workstreams and coding harnesses

Use the same monorepo, shared contracts and acceptance gates regardless of coding tool. A harness is not a separate repository/backend. Step001 is the historical documentation-only architecture commit `93e473b`. Step002 now contains only `apps/api` health/configuration and HTTP envelopes, shared writing INPUT/health/error schemas and adjacent executable unit tests. No product auth, `/api/v1` handlers, persistence, SQL migrations/RPC implementation or writing acceptance exists. Root backend scripts, the Node `backend` Vitest project and `tests/api-health-smoke.mjs` exist. API root-lock integration is complete with only API metadata/workspace link added and existing pins unchanged. Main locally validated the pinned runtime, backend lint/types/unit tests, the Next.js `16.3.8` production build with only dynamic health routes, and production HTTP smoke (`200` live / unconfigured `503` ready, both no-store safe envelopes); see `docs/backend-changes.txt` for detailed results. CI configures backend lint/types/unit/build/smoke after dependency/format checks, but remote CI has not run. Clean-install reproducibility remains unverified after clean `npm ci` failed under host bulk-delete protection; no vulnerability audit is claimed. Continuing backend/environment authorization permits task management, relevant commands and small validated local commits only within the assigned task's scope; hosted actions remain unauthorized.

## Suggested ownership

| Lane                        | Human owner                     | Owned paths                                                                                        | First implementation result                                                                                       |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Integration / shared        | Hassan or nominated coordinator | Root configuration/lockfile, `packages/shared`, `.github`, cross-team docs                         | Portable `/api/v1` and AI HTTP contracts, coordinated workspace/test configuration                                |
| Web                         | Hao                             | `apps/web` frontend paths                                                                          | Web auth/journal UI calling the independent API; legacy backend placeholders untouched until migration authorized |
| Mobile                      | Hao                             | `apps/mobile`                                                                                      | Expo auth/journal client; Android/iOS preview builds                                                              |
| API / database / deployment | Hassan for cloud actions        | Existing `apps/api` foundation, `supabase`, API-side integration tests and backend/deployment docs | Bearer/active-profile boundary, health, local writing proof, RLS/grants/RPC, queue/jobs/finalize/deletion         |
| AI service                  | Kyle/Gatik                      | Target `services/ai`, `evals`, AI-service tests                                                    | Independent versioned HTTP generation, prompts/provider evaluation, optional RAG/transcription                    |
| Product / QA / demo         | Peter                           | `tests`, MVP/demo docs, acceptance notes                                                           | Fictional two-user writing/replay/revision cases, API HTTP integration and later cross-client checks              |

These are proposed human owners, not invitations or assignments. With fewer people combine integration + API/deployment or AI + QA without blurring authority. One mobile owner covers both native platforms. Root dependencies/manifests, workspace scripts and contracts stay coordinated within the already authorized backend/environment implementation; step002 API/shared scripts and API root-lock metadata/workspace link integration are complete, with existing pins unchanged. Node.js `24.20.0`, npm `11.19.0`, native pins and one root lockfile remain.

The former backend paths in `apps/web/src/app/api` and `apps/web/src/server` are legacy unused placeholders, not running services; do not remove or implement them in this step. API and AI no longer share the web deployment or server folders. Backend tasks do not edit `apps/web`, `apps/mobile` or implement `services/ai`. Web/mobile origin, bearer, `/api/v1` client and environment-example migration is a separate follow-up for their owners.

## Target service authority and handoffs (product behavior deferred)

- Product API owns fresh Supabase bearer verification, active-profile authorization, user-scoped DB/RLS/grants/validated RPCs, durable queue/claims/leases/fencing/retries/recovery, finalization and deletion. Supabase handles passwords/sign-in/reset/refresh. No trusted owner ID; exact browser CORS is not auth; private responses are not cached.
- AI owns prompts, provider credentials and optional RAG/transcription, behind versioned server-to-server `POST /v1/reflections:generate`. Input is entry/revision/tone and bounded API-authorized context; output is letter/actions/provenance. AI gets no database admin keys and never automatically creates todos/memories. No provider is selected.
- Backend will define the API-side HTTP client and a fake independent AI HTTP fixture for tests only; neither exists yet, and neither is a production fallback or an AI implementation. Agree credential rotation/version, bounded schemas, timeouts and safe error mapping before processing.
- API/shared/QA implement live creation equality against the separately stored immutable original validated payload; equivalent retry returns current persisted state without reverting edits or duplicating jobs, and a different original payload returns `409`. Own retired keys return `409` before comparison; ordinary deleted-resource reads return `404`. Tombstones clear original payload and all content/consent, retaining minimum IDs, owner/key and deletion time. Repeat suggestion acceptance returns the same surviving todo; explicit todo deletion preserves its decision and repeat acceptance returns `409` without recreation. The current INPUT schema bounds expected revisions to 1..2147483647; implement database revision enforcement and agree source cleanup before persistence/output schemas. Proposed privacy-first deletion cascades to source-linked memories and reflection-derived todos, not unrelated standalone todos.
- Account deletion needs a durable deleting gate/retry before Auth deletion. Later voice needs private Storage, metadata/transcription job kind, separate consent and reviewed transcript into text flow. Optional RAG needs user-scoped source/provenance/deletion contracts. No AI encryption/perfect-safety guarantee.

## Start sequence and acceptance gates

1. Preserve architecture from historical step001 commit `93e473b` and continue backend/environment implementation within the assigned scope. Main maintains `docs/backend-changes.txt` with detailed actual validation, warnings and session-specific blockers; docs-only delegates sync durable status without editing that log or rerunning commands.
2. Step002 has independent `apps/api` health/configuration, shared writing INPUT/health/error schemas, unit tests, root backend scripts/test project and production health smoke. API root-lock integration and main's local backend lint/types/unit/build/smoke validation are complete. Backend CI steps are configured after dependency/format checks; remote CI has not run. Preserve existing pins and keep clean-install reproducibility separate from foundation validation. Public liveness is a real handler; readiness returns `503` unless valid writing config and the actual required `api_schema_ready` RPC succeed with boolean `true` within 1500 ms. No SQL/RPC implementation exists. `apps/api/.env.example` is writing-only; frontend examples stay legacy. Config uses HTTPS except HTTP loopback and exact canonical comma-separated origins with local loopback HTTP as the development exception. Parsing is not auth/product CORS; protected dependency/queue status stays deferred.
3. First prove real local Supabase Auth/Postgres save/read/edit/delete with two-user bearer/profile/RLS/grants/RPC, replay/revision and AI-down-save tests, without UI edits. Non-opted-in saves create no job.
4. Before opted-in processing, test the UTC/IANA next-local-calendar-morning resolver for `07:00`, `07:30`, `08:00`, tones `friend`, `mentor`, `future`, `diary`, date boundaries and DST. Preference changes affect future jobs; edits invalidate old revisions. Add atomic opted-in entry/job, bounded leases/fencing/backoff/recovery before first AI processing. No production forced demo delivery.
5. Test the API against a fake independent AI HTTP service for failure/recovery and stale finalization. AI owner then implements the real service. Add explicit action acceptance/rejection with unique owned todos, separate corrections and memory approval/removal/deletion tests.
6. Prove voice as a later second core input, then separately authorize client migration and native release work. Full patterns/Life Film are deferred; never fabricate counts or statistics.

Step001 remains historical architecture; step002 foundation source, INPUT schemas and unit-test existence are not writing acceptance. Creation currently requires UUID idempotency, literal `false` opt-in and nonblank 1..20000 UTF-16-code-unit text preserving exact whitespace, valid Unicode and no NUL; PATCH requires integer revision 1..2147483647. Persistence/replay/auth and real local writing tests remain deferred. `docs/backend-changes.txt` records actual validation and session-specific blockers; execution restrictions are not persistent command/task/commit prohibitions.

## Separate sessions safely

Use one clone/worktree and branch per session, not concurrent harnesses in the same checkout. The following commands are guidance; actual execution and validation belong in `docs/backend-changes.txt`:

```sh
git fetch origin
git worktree add ../beyond-web -b feat/web-shell origin/main
git worktree add ../beyond-mobile -b feat/mobile-shell origin/main
git worktree add ../beyond-api -b feat/api-foundation origin/main
```

Run authorized dependency installs from each worktree root. Keep local env files out of Git, use distinct service ports and an agreed local Supabase instance or independent ports; do not reset another owner's shared database.

## Future harness prompt

> Work in branch `<branch>` in checkout `<path>`. Read `AGENTS.md`, the architecture/API/build-plan/workstreams and task `<task brief>`. Follow the existing authorization: architecture first, then backend/environment implementation with task management, relevant available local checks and small validated local commits. Implement only `<owned paths>` to deliver `<observable result>`. Respect independent `apps/api` and AI-owner `services/ai` boundaries, portable contracts and pinned dependencies; leave frontend paths untouched in backend work. Coordinate cross-owner, manifest, lockfile, schema and contract changes before editing. Use fictional data and report actual results, missing checks and dependencies. The main agent maintains the plain-text backend log. Hosted pushes/PRs/deployments/database/account actions require separate authorization. Honor any narrower restrictions in the assigned task without persisting them as repository-wide rules.

Implementation scopes following architecture-first documentation:

- **API/database:** Independent API health/identity and real local writing isolation/replay/revision first; then API-owned durable queue/finalize/deletion. Do not implement AI or edit frontends.
- **AI:** HTTP contract and fictional evaluations, then independent generation service without DB admin keys; optional context/transcription only behind consent/source contracts.
- **QA:** Two-user real local writing gates and fake independent AI HTTP failures; later actions, deletion, voice and cross-client validation.
- **Web/mobile:** Separately authorized independent-origin/bearer/versioned client migration and UI; coordinate public env changes, preserve native pins.
- **Integration/shared:** Portable validation/client exports and coordinated scripts/CI/workspace configuration; one root lockfile.

## PR and release conventions

Use deliverable branches such as `feat/api-entries`, `feat/reflection-jobs` or `test/journal-flow`. Handoffs name owner, upstream contract/PR, actual checks and follow-ups. Only the coordinator integrates root dependency/lockfile changes; do not independently upgrade React/Expo or bypass peers. Keep changes small, obtain review of auth/deletion/credentials, and preserve old-client compatibility in releases. Deploy, cloud account changes and branch protection require Hassan's authorization.
