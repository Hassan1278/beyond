# Beyond

Private repository owned by [Hassan1278](https://github.com/Hassan1278). Friends join as collaborators added by Hassan; no GitHub organization is needed.

Beyond targets web and native Android/iOS writing-first journaling, opted-in delayed AI reflections, explicit actions/todos and user-approved memories. Frontends use an independent product API and Supabase; an independently owned AI HTTP service will generate reflections.

## Current state

Step001 is the **historical docs-first architecture commit `93e473b`**, updating the 3 October 2026 scaffold without product implementation. Step002 established API health/configuration, portable input/health/error schemas and unit-test tooling. **Step003 now implements non-opted-in writing**, not the full MVP:

- Fresh Supabase bearer verification and active-profile checks on every writing call; exact-origin CORS/preflight and no-store responses. Normal writing uses no API admin credentials.
- `GET`/`POST /api/v1/entries` and `GET`/`PATCH`/`DELETE /api/v1/entries/:id`, portable resource/cursor contracts, original-payload replay, expected revisions and cleared-content deletion tombstones.
- Public active/deleting profiles with Auth trigger/backfill; entries with active-owner live-read RLS, restricted private original/key columns and authenticated validated create/update/delete/get/list RPCs.
- Real SQL catalog-checking `api_schema_ready`; configured readiness `200` tested. Liveness remains dependency-free and writing readiness never requires AI.

Final validation passed: **536 unit tests across 9 files**, including **216 writing and 20 output-contract tests**, final lint/types and body 128000-byte/total-5000-ms deadline/cancellation regressions. Production Next build passed with dynamic health/entries routes in an isolated fresh mirror; a temporary Turbopack root adjustment for the shared dependency junction affected only that mirror, not repository Next config. Production unconfigured health passed live `200`/ready `503`. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed, including signed expired local/forged/revoked identity, RLS/grants, create/revision races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. The [backend change log](docs/backend-changes.txt) remains main-owned.

Frontends and their unused legacy backend placeholders remain untouched. `services/ai`, jobs/scheduling, reflections, accepted todos, memory, voice and durable account deletion are unimplemented. Deleting-profile denial is not a full account-deletion endpoint. Existing WSL GitHub credentials are verified for read/push; Windows credentials remain unavailable. Remote `main` advanced to `2c9fa7e`, beyond the original base. Feature-branch push and local Docker/backend work are authorized, but no feature push is claimed yet. Automatic main merge/overwrite/force-push, hosted database/deployment/account actions, frontend/AI-owner work and PR creation are not authorized.

## Workspaces

| Path              | Responsibility and status                                                       |
| ----------------- | ------------------------------------------------------------------------------- |
| `apps/web`        | Unchanged `@beyond/web` frontend scaffold and legacy backend placeholders       |
| `apps/mobile`     | Unchanged `@beyond/mobile` Expo / React Native Android/iOS scaffold             |
| `packages/shared` | Portable writing input/resource/cursor/output and health/error contracts/tests  |
| `apps/api`        | API-only `@beyond/api`: health, verified identity and non-opted-in writing CRUD |
| `services/ai`     | Independent AI HTTP target; reserved for AI owner and unimplemented             |

One monorepo/root lockfile remains; API workspace integration is complete and step003 adds no package or pin changes. Full isolated npm install completed, but clean `npm ci` was blocked by host bulk-delete protection and remains unverified. CI implements backend/dependency/format checks, a separate real-DB job and feature-branch push triggering; remote execution is unverified. No vulnerability audit is claimed; existing deprecation and non-failing Vitest warnings remain in the log. Local writing migrations/access tests and production health/writing runners exist; independent AI fixtures/evaluations remain future work. Writing resource/cursor/output contracts are implemented; the shared API client remains deferred.

## Getting started when tooling is available

These are instructions, not a fresh execution report. Read [setup](docs/setup.md) and the log for prerequisites/results.

```sh
git clone https://github.com/Hassan1278/beyond.git
cd beyond
nvm install
nvm use
npm install --global npm@11.19.0
npm ci
npm run check:deps
npm run format:check
```

Use Node.js `24.20.0` / npm `11.19.0`, install at the root and keep one `package-lock.json`. With Docker and the writing-only local stack available, the writing acceptance order is:

```sh
npm run db:start
npm run db:test
npm run build:api
npm run test:api:writing
```

Root `npm run db:start` now excludes `realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta` by default and is the restart command. Ports are API `55321` (API env sample fixed), DB `55322`, Mailpit `55324`, Studio `55323` configured but not started. Windows excludes `54290..54489`; ports changed instead of OS settings. Supabase Docker's default `0.0.0.0` bindings are local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet. The guarded writing runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server. No reset or hosted change is required.

## Build and ship

Read [build plan](docs/build-plan.md), [architecture](docs/architecture.md) and [deployment runbook](docs/deployment.md). Target separate Vercel web/API projects, an AI-owner-selected HTTP host, Supabase Auth/Postgres and later private Storage/scheduling, and Expo EAS native builds. No deployment is performed here.

Final local writing/unit/lint/types/body regressions, health and mirror production build checks passed; clean-install and remote CI verification remain open. Next gates are atomic opted-in entry/jobs, tested UTC/IANA next-morning scheduling and lease/fencing/backoff/recovery before AI processing. AI returns suggestions/provenance without automatic todos/memories. Explicit decisions/corrections, durable account cleanup and reviewed voice follow. Frontend origin/bearer/environment migration requires its separate owner and authorization.

## Divide the work

[Workstreams and harness instructions](docs/workstreams.md) define six lanes, owned paths, handoffs and task prompts. Use a separate branch/worktree per session. Hassan coordinates contracts, dependencies, merges and release settings.

## Documentation

- [Setup and commands](docs/setup.md)
- [Folder structure and deferred files](docs/skeleton.md)
- [Dependency inventory](docs/dependencies.md)
- [Architecture and database design](docs/architecture.md)
- [Plain-text backend change log](docs/backend-changes.txt)
- [Implemented writing and draft future API contract](docs/api.md)
- [Build milestones and acceptance checks](docs/build-plan.md)
- [Deployment and rollback](docs/deployment.md)
- [Workstreams and harness prompts](docs/workstreams.md)
- [Data handling](docs/data-handling.md)
- [MVP scope](docs/mvp-scope.md)
- [Demo plan](docs/demo.md)
- [Task brief template](docs/tasks/TEMPLATE.md)
- [AI evaluation plan](evals/README.md)

All packages are private and unlicensed for public distribution. Do not publish workspace packages to npm.
