# Beyond

Private repository owned by [Hassan1278](https://github.com/Hassan1278). Friends will join as repository collaborators, added by Hassan. No GitHub organization is needed.

Beyond will provide a website and a native Android/iOS app for writing-first journaling, opted-in delayed AI reflections, explicit actions/todos, and user-approved memories. Both interfaces will use an independent product API and Supabase data; an independent AI HTTP service will generate reflections.

## Current state

Step001 is the **historical docs-first architecture commit `93e473b`**, updating the configuration/planning scaffold created on 3 October 2026 without adding product implementation. It is not the current source inventory. Empty deferred feature folders still use `.gitkeep`.

Step002 currently contains only an API-only Next.js Node health/configuration foundation in `apps/api`, HTTP envelope helpers, portable shared health/error and writing INPUT schemas, and adjacent executable unit tests. Public `GET /api/health/live` is a real handler. `GET /api/health/ready` returns `503` unless writing configuration is valid and the actual required `api_schema_ready` database RPC succeeds with JSON boolean `true`; no SQL migration or RPC implementation has been added. There is no product auth, `/api/v1` endpoint, persistence or real Auth/Postgres writing proof. The writing acceptance gate is not met.

The architecture supersedes the combined web/API design: API and frontends deploy independently; `services/ai` remains reserved for the AI owner and unimplemented. Frontends and their unused legacy web API/server placeholders remain untouched. The user has already authorized backend/environment implementation with small validated local commits; hosted actions are not authorized.

Root `dev:api`, `lint:backend`, `typecheck:backend`, `test:backend`, `build:api` and `test:api:smoke` scripts and the `backend` project in `vitest.config.ts` exist. Main verified exact Node.js `24.20.0` / npm `11.19.0` and locally validated backend lint/types, all 300 API/shared unit tests in seven files, the Next.js `16.3.8` production build with only dynamic health routes, and production HTTP health smoke checks. Smoke covers liveness `200` and unconfigured readiness `503`, both with no-store safe envelopes; it is not database acceptance. CI now configures backend lint/types/unit/build/smoke after existing dependency/format checks, but remote CI has not run. The [plain-text backend change log](docs/backend-changes.txt) remains main's record of detailed validation and environment blockers.

## Workspaces

| Path              | Responsibility and status                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `apps/web`        | Existing `@beyond/web` frontend scaffold; legacy backend placeholders untouched              |
| `apps/mobile`     | Existing `@beyond/mobile` Expo / React Native scaffold for Android and iOS                   |
| `packages/shared` | Portable health/error and writing INPUT schemas/tests; clients and resource outputs deferred |
| `apps/api`        | Existing `@beyond/api` health/config foundation and unit tests; product API deferred         |
| `services/ai`     | Target independent AI HTTP service, reserved for AI owner; not implemented here              |

One monorepo and root lockfile remain. API lock integration is complete: only `apps/api` metadata and its workspace link were added, with existing pins unchanged. Full isolated npm install completed after repair of interrupted Zod/SWC files, but clean `npm ci` failed under host bulk-delete protection, so clean-install reproducibility remains unverified. No vulnerability audit is claimed; pinned ESLint/transitive deprecation warnings remain in main's log. The root `vitest.config.ts` module-native future warning is non-failing follow-up, not suppressed here. `apps/api/.env.example` documents writing-only configuration; frontend examples remain untouched legacy. Database configuration and deferred RLS/grants/RPC migrations live in `supabase/`; `tests/api-health-smoke.mjs` exists, while real Auth/Postgres cross-system acceptance tests in `tests/` and fictional AI evaluations in `evals/` remain future work. Each service has separate deployment, tests and environment.

## Getting started when tooling is available

These are bootstrap instructions, not an execution report. See setup for prerequisites and `docs/backend-changes.txt` for actual validation and environment blockers.

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

Use Node.js `24.20.0` and npm `11.19.0`. Install from the repository root and keep one root `package-lock.json`. See [setup](docs/setup.md) for local configuration and [dependencies](docs/dependencies.md) for the selected versions.

## Build and ship

Read [the implementation plan](docs/build-plan.md), [architecture](docs/architecture.md), and [deployment runbook](docs/deployment.md). Target separate Vercel projects for web and `apps/api`, an AI-owner-selected independent HTTP host for `services/ai`, Supabase for Auth/Postgres and later private Storage/scheduling, and Expo EAS for native builds. No hosting projects or deployments are created here.

The first acceptance gate is real local Supabase Auth/Postgres writing: two-user save/read/edit/delete, bearer/active-profile verification, replay/revision semantics and saves during AI downtime. Opted-in atomic entry/jobs, tested next-morning scheduling and lease/fencing/backoff/recovery precede AI processing. AI returns letter/actions/provenance; it has no DB admin keys and creates no automatic todos/memories. Explicit decisions/corrections and later reviewed voice input follow. Frontend origin/bearer/environment migration is a separate authorized follow-up; no UI or native dependency changes occur here.

## Divide the work

[Team workstreams and harness instructions](docs/workstreams.md) define six lanes, owned paths, first tasks, handoffs, and copyable task prompts. A friend can use any coding harness in their own branch or worktree. Assign a human owner to each lane before implementation; Hassan coordinates shared contracts, dependencies, merges, and release settings.

## Documentation

- [Setup and commands](docs/setup.md)
- [Folder structure and deferred files](docs/skeleton.md)
- [Dependency inventory](docs/dependencies.md)
- [Architecture and database design](docs/architecture.md)
- [Plain-text backend change log](docs/backend-changes.txt)
- [Draft API contract](docs/api.md)
- [Build milestones and acceptance checks](docs/build-plan.md)
- [Deployment and rollback](docs/deployment.md)
- [Workstreams and harness prompts](docs/workstreams.md)
- [Data handling](docs/data-handling.md)
- [MVP scope](docs/mvp-scope.md)
- [Demo plan](docs/demo.md)
- [Task brief template](docs/tasks/TEMPLATE.md)
- [AI evaluation plan](evals/README.md)

All packages are private and unlicensed for public distribution. Do not publish workspace packages to npm.
