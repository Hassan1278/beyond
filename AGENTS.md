# Working in Beyond

## Context and phase

Read `README.md`, `docs/architecture.md`, `docs/api.md`, and the assigned task before editing. For backend architecture/environment work also read workstreams, build-plan, deployment, setup, skeleton, MVP scope, data-handling, dependencies and root `.env.example`. Step001 is the historical documentation-only architecture commit `93e473b`; step002 established health/configuration, shared input contracts and unit-test tooling. **Step003 implements the non-opted-in writing gate**: fresh bearer/active-profile checks, `/api/v1/entries` CRUD, resource/cursor contracts, real Auth/Postgres profiles/entries, RLS/grants and validated RPCs. Final unit/lint/types, mirror production build, health and real DB checks passed; this is not full MVP acceptance. Writing resource/cursor/output contracts are implemented; the shared API client remains deferred.

Architecture-first backend/environment implementation and small validated local commits remain authorized. Feature-branch push and local Docker/backend work are now authorized too. A narrower assigned task may restrict its own edits/execution without changing that continuing authorization.

## Boundaries

- Follow owned paths in `docs/workstreams.md`. Ask the coordinator before changing another owner's paths or an agreed API contract.
- API-only Next.js Node handlers live in `apps/api/src/app/api`; product services and future jobs belong under `apps/api/src/server`. Leave `apps/web`, `apps/mobile` and their unused legacy web API/server placeholders untouched in backend-only tasks.
- Reserve `services/ai` for the AI owner: prompts, providers, optional RAG/transcription. Backend defines the HTTP contract/client and test fixtures, not AI implementation. AI receives no database admin keys.
- Keep `packages/shared` independent of React, React Native, Next.js, Node-only modules and privileged credentials. Retain one monorepo with separate service deployments/tests/environments.
- Every writing call freshly verifies a Supabase bearer token and an active profile; Supabase owns password/sign-in/reset/refresh. Derive ownership from verified identity, never payload owner IDs. Exact-origin CORS/preflight is not authentication; private responses are no-store.
- Normal writing uses the publishable key and verified user's bearer token, with no API admin credentials. Enforce the same active-owner boundary through RLS, grants and authenticated validated RPCs. Security-definer writing RPCs use an empty search path and an active-profile lock; private original payload/key columns are not user-readable.
- Keep creation opt-in literal `false`; writing needs neither AI health nor admin/job/provider credentials. No AI/job table is implemented. Atomic opted-in entry/job, tested next-morning scheduling and lease/fencing/backoff/recovery precede AI processing.
- Preserve original-payload replay equality, current-resource replay, expected revisions and cleared-content tombstones; see `docs/api.md`. Deleting-profile denial is implemented, **not** a durable account-deletion endpoint. Reflections, accepted todos, approved memories, voice and source cascades remain future work. Do not promise end-to-end encrypted AI or perfect safety.

## Dependencies and configuration

- Use npm workspaces, Node.js `24.20.0`, npm `11.19.0`, existing pins and one root lockfile. Step003 adds no package or pin changes. Run authorized dependency commands from the repository root.
- Coordinate additions/upgrades with Hassan. Expo native dependencies must match the selected SDK; do not force or ignore peer failures.
- Examples contain names/dummy values only. Never commit tokens, real journal content, signing credentials or local `.env` files.
- Local Supabase uses API `55321`, DB `55322`, Studio `55323` (configured but not started) and Mailpit `55324`; the API env sample is fixed to `55321`. Windows excludes `54290..54489`; changing ports, not OS exclusions, resolved startup. Root `npm run db:start` configures writing-only exclusions by default and is the restart command.
- Supabase Docker binds `0.0.0.0` by CLI default: local development only, never production exposure. Main will stop the stack before final handoff; shutdown has not happened yet. Do not reset another owner's database or make hosted changes.
- Confirm provisional `apps/mobile/app.json` identifiers with Hassan before registration/store builds.

## Branches and handoffs

- Use a separate clone/worktree and task branch per session; no concurrent harnesses editing one checkout.
- Prepare small validated local commits and authorized feature-branch pushes. Existing WSL GitHub credentials are verified for read/push; Windows credentials remain unavailable. Remote `main` advanced to `2c9fa7e`, beyond the original base; no feature push is claimed yet, and authorization does not allow automatic main merge/overwrite. Main owns `docs/backend-changes.txt`; docs-only delegates do not edit it. Do not log emails, secrets, code or invented results/hashes.
- Authorization does not include main overwrite/force-push, hosted databases/accounts/permissions, deployment, native releases, frontend/AI-owner work or hosted PR creation. Obtain separate authorization if a PR is needed.
- Document contract/dependency changes with the deliverable; avoid unrelated refactors.

## Validation

Final step003 checks passed: **536 unit tests across 9 files**, including **216 writing tests and 20 output-contract tests**; final lint/types; production Next build with dynamic health/entries routes in an isolated fresh mirror. Only the mirror needed a temporary Turbopack root adjustment for the shared dependency junction; repository Next config is unchanged. Body 128000-byte/total-5000-ms deadline and cancellation regressions passed. Production unconfigured health passed live `200`/ready `503`.

Real Auth/Postgres passed **15 two-user groups**, including signed expired local/forged/revoked tokens, RLS/grants, create/revision races, replay/tombstones/paging/deleting-profile denial and fixture-user/server cleanup; **123 pgTAP** checks passed. Configured readiness `200` passed against the catalog-checking `api_schema_ready` RPC. Direct PostgREST `P0001` is `400`; product not_found/forbidden/conflict map to `404`/`403`/`409` without exposing another owner's content. Main records final current outcomes in the log. Local acceptance order is `npm run db:start`, `npm run db:test`, `npm run build:api`, then `npm run test:api:writing`; the local-only runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server.

CI implements dependency/format/backend checks and a separate real-database job, with feature-branch push triggering. Remote CI execution and clean `npm ci` remain unverified. No vulnerability audit is claimed; existing deprecation and non-failing module-native Vitest warnings remain in the log. AI checks stay independent. Frontend owners run web/mobile checks only for separately authorized changes; JS export is not native-build proof.

Every handoff states changes, actual checks, unavailable checks and remaining dependencies. Use fictional content for tests/demos/evaluations.
