# Beyond

Private repository

Beyond targets web and native Android/iOS writing-first journaling, opted-in delayed AI reflections, explicit actions/todos and user-approved memories. Frontends use an independent product API and Supabase; an independently owned AI HTTP service will generate reflections.

## Current state

The private-backend milestone on `feat/private-backend` adds settings, explicitly approved memories, standalone todos, a portable authenticated API client, and recoverable account deletion to the existing journal API. See [current product API and privacy limits](docs/product-api.md) for routes, migrations, enablement and acceptance checks.

The writing backend and pitch prototype were merged into `main` at `6ef74e9`; [main CI](https://github.com/Hassan1278/beyond/actions/runs/37963026068) passed both jobs. Backend feature-branch checks must be evaluated separately. The prototype is in `prototypes/pitch-demo` and is independent of the product API. `apps/web` and `apps/mobile` remain undesigned scaffolds.

Production AI processing/reflection jobs, voice, patterns/Life Film and frontend integration remain unimplemented. Journal creation remains explicitly non-opted-in; no AI credentials or reachability are required. Account deletion is a separate optional privileged feature, disabled until its credentials and scheduler are configured.

## Workspaces

| Path              | Responsibility and status                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `apps/web`        | Unchanged `@beyond/web` frontend scaffold and legacy backend placeholders                 |
| `apps/mobile`     | Unchanged `@beyond/mobile` Expo / React Native Android/iOS scaffold                       |
| `packages/shared` | Portable product contracts, validated bearer API client and tests                         |
| `apps/api`        | API-only product backend: writing, settings, memories, todos and optional account cleanup |
| `services/ai`     | Independent AI HTTP target; reserved for AI owner and unimplemented                       |

One monorepo/root lockfile remains; API workspace integration is complete and step003 adds no package or pin changes. Clean-install reproducibility is verified on Linux CI. Local Windows `npm ci` remains host-guard constrained, not a project-wide blocker. No vulnerability audit is claimed; existing deprecation/non-failing warnings remain in main's log. Writing migrations/access tests and health/writing runners exist; Independent AI fixtures/evaluations remain deferred; the shared product API client is implemented in this feature branch.

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

Root `npm run db:start` now excludes `realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta` by default and is the restart command. Ports are API `55321` (API env sample fixed), DB `55322`, Mailpit `55324`, Studio `55323` configured but not started. Windows excludes `54290..54489`; ports changed instead of OS settings. Supabase Docker's default `0.0.0.0` bindings are local-dev only, never production. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`. The guarded writing runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server. No reset or hosted change is required.

## Build and ship

Read [build plan](docs/build-plan.md), [architecture](docs/architecture.md) and [deployment runbook](docs/deployment.md). Target separate Vercel web/API projects, an AI-owner-selected HTTP host, Supabase Auth/Postgres and later private Storage/scheduling, and Expo EAS native builds. No deployment is performed here.

The writing gate and clean-install reproducibility passed Linux CI for source commit `b192bde`; this is not full MVP or deployment acceptance. After the private backend milestone, next gates are atomic opted-in entry/jobs, tested UTC/IANA next-morning scheduling and lease/fencing/backoff/recovery before AI processing. AI returns suggestions/provenance without automatic todos/memories. Reflection-linked decisions/corrections and reviewed voice follow. Optional recoverable account cleanup is described in the current product API guide. Frontend origin/bearer/environment migration requires its separate owner and authorization.

## Divide the work

[Workstreams and harness instructions](docs/workstreams.md) define six lanes, owned paths, handoffs and task prompts. Use a separate branch/worktree per session. Hassan coordinates contracts, dependencies, merges and release settings.

## Documentation

- [Setup and commands](docs/setup.md)
- [Folder structure and deferred files](docs/skeleton.md)
- [Dependency inventory](docs/dependencies.md)
- [Architecture and database design](docs/architecture.md)
- [Plain-text backend change log](docs/backend-changes.txt)
- [Current private backend API and privacy limits](docs/product-api.md)
- [Writing and historical future API contract](docs/api.md)
- [Build milestones and acceptance checks](docs/build-plan.md)
- [Deployment and rollback](docs/deployment.md)
- [Workstreams and harness prompts](docs/workstreams.md)
- [Data handling](docs/data-handling.md)
- [MVP scope](docs/mvp-scope.md)
- [Demo plan](docs/demo.md)
- [Task brief template](docs/tasks/TEMPLATE.md)
- [AI evaluation plan](evals/README.md)

All packages are private and unlicensed for public distribution. Do not publish workspace packages to npm.
