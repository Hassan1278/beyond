# Beyond

Private repository owned by [Hassan1278](https://github.com/Hassan1278). Friends will join as repository collaborators, added by Hassan. No GitHub organization is needed.

Beyond will provide a website and a native Android/iOS app for journaling, delayed AI reflections, and memories that the user explicitly approves. Both interfaces will use the same Node.js API and Supabase data.

## Current state

This is a **configuration and planning scaffold**, created on 3 October 2026. Dependencies, workspace manifests, JSON configuration, environment examples, documentation, and CI configuration are present. Empty feature folders are tracked using `.gitkeep`.

There are no application source files, SQL migrations, executable test files, or generated assets. App entry points and the shared package entry point are deliberately absent. Development, type checking, linting, tests, and app builds become usable during foundation implementation. Current CI checks the dependency tree and formatting; it does not claim to validate an application.

## Workspaces

| Workspace        | Path              | Responsibility                                               |
| ---------------- | ----------------- | ------------------------------------------------------------ |
| `@beyond/web`    | `apps/web`        | Next.js website, Node.js API, server services, AI processing |
| `@beyond/mobile` | `apps/mobile`     | Expo / React Native app for Android and iOS                  |
| `@beyond/shared` | `packages/shared` | Platform-independent types, Zod schemas, API client          |

Database configuration and future migrations live in `supabase/`. Cross-system tests live in `tests/`; fictional AI evaluation cases will live in `evals/`.

## Getting started now

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

Read [the implementation plan](docs/build-plan.md), [architecture](docs/architecture.md), and [deployment runbook](docs/deployment.md). The intended destinations are Vercel for web/API, Supabase for database/auth/scheduling, and Expo EAS for native builds. No hosting projects or deployments were created with this scaffold.

The first implementation milestone is a web page and a mobile screen calling the same API health endpoint. Then build login, journal storage, and reflection delivery as complete flows.

## Divide the work

[Team workstreams and harness instructions](docs/workstreams.md) define six lanes, owned paths, first tasks, handoffs, and copyable task prompts. A friend can use any coding harness in their own branch or worktree. Assign a human owner to each lane before implementation; Hassan coordinates shared contracts, dependencies, merges, and release settings.

## Documentation

- [Setup and commands](docs/setup.md)
- [Folder structure and deferred files](docs/skeleton.md)
- [Dependency inventory](docs/dependencies.md)
- [Architecture and database design](docs/architecture.md)
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
