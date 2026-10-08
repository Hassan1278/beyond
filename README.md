# Beyond

Private repository owned by [Hassan1278](https://github.com/Hassan1278). Friends will join as repository collaborators, added by Hassan. No GitHub organization is needed.

Beyond will provide a website and a native Android/iOS app for writing-first journaling, opted-in delayed AI reflections, explicit actions/todos, and user-approved memories. Both interfaces will use an independent product API and Supabase data; an independent AI HTTP service will generate reflections.

## Current state

Step001 is a **docs-first backend milestone** updating the configuration/planning scaffold created on 3 October 2026. Existing dependency/workspace manifests, runtime configuration, frontend environment examples and CI remain unchanged at that milestone; the root `.env.example` documentation overview is updated. Empty feature folders are tracked using `.gitkeep`.

The authorized architecture now supersedes the combined web/API design: target `apps/api` is API-only Next.js Node handlers/server modules, independently deployed from the untouched frontends; `services/ai` is reserved for the AI owner. Step001 adds no product implementation: no API app source, SQL migrations, executable product tests, generated assets or cloud setup. Existing unused web API/server placeholders remain legacy and are not running or removed. The user has already authorized architecture-first work followed by backend/environment implementation with small validated local commits; hosted actions are not authorized.

Development, API-specific checks and builds require foundation implementation. Current CI is scaffold dependency/formatting validation, not application acceptance. The [plain-text backend change log](docs/backend-changes.txt) records actual validation and environment blockers; milestone documentation is not an execution report.

## Workspaces

| Path              | Responsibility and status                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/web`        | Existing `@beyond/web` frontend scaffold; legacy backend placeholders untouched  |
| `apps/mobile`     | Existing `@beyond/mobile` Expo / React Native scaffold for Android and iOS       |
| `packages/shared` | Existing `@beyond/shared` scaffold for portable types, validation and API client |
| `apps/api`        | Target independent API-only Next.js Node service; not added/implemented here     |
| `services/ai`     | Target independent AI HTTP service, reserved for AI owner; not implemented here  |

One monorepo and root lockfile remain; adding target workspaces/scripts is a later coordinated task. Database configuration and future RLS/grants/RPC migrations live in `supabase/`; future cross-system tests in `tests/` and fictional AI evaluation cases in `evals/`. Each service has separate deployment, tests and environment.

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
