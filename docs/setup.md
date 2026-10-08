# Setup and commands

## Status and tools

This is setup guidance, not an execution report. Step001 is the historical documentation-only architecture commit `93e473b`. Step002 now includes `apps/api` health/configuration source, its manifest/config/environment example, shared writing INPUT/health/error schemas and adjacent executable unit tests. No product auth, `/api/v1` handlers, persistence, SQL migrations/RPC implementation, AI service or cloud setup exists; writing acceptance is not met. Frontends and legacy web API/server placeholders remain untouched. Root backend scripts/test configuration and production health smoke exist; API root-lock integration is complete with only API metadata/workspace link added and existing pins unchanged. The continuing backend/environment authorization does not authorize hosted actions.

Use Git, Node.js `24.20.0` and npm `11.19.0`, recorded by `.nvmrc`, package manager and engines, with existing pins and one root lockfile. Consult `docs/backend-changes.txt` for actual validation and environment blockers; session-specific command availability is not a repository-wide prohibition.

Android emulators require Android Studio; iOS simulators require macOS/Xcode. Physical devices/EAS builds remain options without an iOS simulator. Real local Supabase Auth/Postgres acceptance requires Docker or a compatible container runtime, not a mocked DB. Local container/service startup belongs to the authorized backend/environment implementation, not step001; hosted provisioning and native release work need separate authorization.

Bootstrap guidance once tooling is available (frontend environment copies belong to the frontend owner's separately authorized work):

```sh
nvm install
nvm use
npm install --global npm@11.19.0
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

The frontend copies preserve existing scaffold conventions, not the new API/AI secret placement. Their examples remain untouched legacy and need the follow-up below; do not populate their old privileged/provider fields. `npm ci` uses the integrated root lockfile without editing it. Main completed a full isolated npm install after repair of interrupted Zod/SWC files, but clean `npm ci` failed under host bulk-delete protection, so clean-install reproducibility remains unverified; these instructions are not a clean-install pass claim. No vulnerability audit is claimed, and pinned ESLint/transitive deprecation warnings remain in `docs/backend-changes.txt`. Intentional dependency changes require coordinated manifests/root lockfile; do not install inside an app or add per-app locks. `apps/api/.env.example` exists with writing-only config; copy it to `apps/api/.env.local` when configuring the API, not for the deliberately unconfigured production smoke scenario. AI-specific configuration remains with the AI owner.

## Existing commands and remaining prerequisites

| Command                     | Purpose / prerequisite                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci`                    | Root-lock clean install; pinned tooling required, reproducibility unverified              |
| `npm run check:deps`        | Installed package/peer resolution                                                         |
| `npm run format:check`      | Supported configuration/documentation formatting                                          |
| `npm run format`            | Formatting; use only on the assigned task's authorized paths                              |
| `npm run dev:web`           | Website on port 3000 after web entry points; not the target product API                   |
| `npm run dev:mobile`        | Expo server after mobile entry points                                                     |
| `npm run dev:api`           | API health/config development server; binds `127.0.0.1:3002`                              |
| `npm run lint:backend`      | Shared + API ESLint checks; locally validated by main                                     |
| `npm run typecheck:backend` | Shared + API TypeScript checks; locally validated by main                                 |
| `npm run test:backend`      | Node `backend` Vitest API/shared unit tests; locally validated, not DB acceptance         |
| `npm run build:api`         | Next.js `16.3.8` production build; locally validated with only dynamic health routes      |
| `npm run test:api:smoke`    | Production HTTP health smoke; requires `build:api`, free port 3002, unconfigured API      |
| `npm run lint`              | Workspace lint; API/shared configs exist, frontend prerequisites separate                 |
| `npm run typecheck`         | Workspace types; API/shared source exists, frontend prerequisites separate                |
| `npm test`                  | Root Vitest configuration now includes real API/shared unit tests, not writing acceptance |
| `npm run test:e2e`          | Requires apps, Playwright configuration and browsers                                      |
| `npm run build:web`         | Website production build after source/configuration                                       |
| `npm run check:mobile`      | Android/iOS JavaScript export after routes; not a native build                            |
| `npm run db:start`          | Local Supabase configuration exists; Docker required                                      |
| `npm run db:stop`           | After local startup                                                                       |
| `npm run db:test`           | After migrations/access tests exist                                                       |

The command inventory identifies implemented scripts and prerequisites; detailed execution records remain with main in the log. Main verified exact Node.js `24.20.0` / npm `11.19.0` and locally validated backend lint/types/unit tests, API production build and production HTTP health smoke; detailed results remain in `docs/backend-changes.txt`. `vitest.config.ts` defines the Node `backend` project for `apps/api/src/**/*.test.ts` and `packages/shared/src/**/*.test.ts`, with `passWithNoTests: false`; its module-native future warning is non-failing follow-up, not suppressed here. API root-lock integration is complete. CI configures backend lint/types/unit/build/smoke after existing dependency/format checks, but remote CI has not run. Independent AI tooling remains its owner's work. Use separate service ports, env scopes and tests; keep the root lockfile. The first acceptance gate still needs real local Supabase writing with two users, replay/revisions and AI-down saves, not merely health handlers, unit fixtures or smoke.

`tests/api-health-smoke.mjs`, invoked by root `npm run test:api:smoke`, requires a successful `npm run build:api` first. It starts the production API on `127.0.0.1:3002`, removes writing variables from the spawned process environment, checks liveness `200` and unconfigured readiness `503` with no-store headers and safe envelopes, then stops its server. Keep port 3002 free and do not supply a configured API-local environment file for this deliberately unconfigured scenario. Smoke does not prove the missing `api_schema_ready` RPC, configured readiness or database/writing acceptance. Main owns the detailed execution log; do not replace it with this setup inventory.

## Environment ownership target

Root `.env.example` is documentation only, not a combined file to copy. Web keeps `apps/web/.env.local`, mobile `apps/mobile/.env`; both frontend examples remain untouched legacy. The existing `apps/api/.env.example` is writing-only and supplies the template for `apps/api/.env.local`. AI config belongs to `services/ai` under its owner and remains deferred. Deployed values are separately scoped per project/environment and never committed.

| Variable                                | Target scope                          | Requirement / meaning                                                                                                             |
| --------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                          | API                                   | HTTPS origin except HTTP loopback (`localhost`, `127.*`, `[::1]`); no credentials/path/query/fragment                             |
| `SUPABASE_PUBLISHABLE_KEY`              | API                                   | Required `sb_publishable_` key; future normal queries also need verified user's token and RLS                                     |
| `CORS_ALLOWED_ORIGINS`                  | API                                   | Required comma-separated exact canonical HTTPS origins except local loopback HTTP; no wildcard/trailing slash/path/query/fragment |
| `SUPABASE_SECRET_KEY`                   | API isolated jobs/account module only | Optional until those operations are enabled; privileged key, never normal product queries, client bundle or AI service            |
| `AI_SERVICE_URL`                        | API                                   | Optional until AI processing is enabled; independent AI HTTP origin, API appends `/v1/reflections:generate`                       |
| `AI_SERVICE_TOKEN`                      | API / matching AI credential verifier | Optional until AI processing is enabled; versioned server-to-server credential with agreed rotation/version, never a user token   |
| `JOB_TRIGGER_SECRET`                    | API / scheduler secret store          | Optional until protected job invocation is enabled                                                                                |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | AI service only                       | Later AI-owner configuration; unselected provider/model and provider credential, no DB admin keys                                 |
| `NEXT_PUBLIC_SUPABASE_URL`              | Web                                   | Public Supabase Auth URL                                                                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Web                                   | Public key; access still requires ownership policies                                                                              |
| `NEXT_PUBLIC_API_URL`                   | Web, proposed follow-up               | Independent product API origin; not added to frontend example here                                                                |
| `APP_URL`                               | Existing web convention               | Canonical frontend origin for auth redirects, not a product API origin/auth proof                                                 |
| `EXPO_PUBLIC_SUPABASE_URL`              | Mobile                                | Public reachable Auth URL                                                                                                         |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Mobile                                | Public key                                                                                                                        |
| `EXPO_PUBLIC_API_URL`                   | Mobile                                | Independent API origin only; future shared client appends `/api/v1`                                                               |

Public prefixes expose values to clients. Examples may contain only names/dummy values. Use publishable/secret key roles deliberately if mapping legacy anon/service-role credentials; no privileged key in user queries or AI. The implemented config loader requires only the writing config and ignores later admin/job/AI settings; future feature-boundary validation must not block ordinary saves. Readiness additionally POSTs to required `api_schema_ready` with a 1500 ms deadline and returns `503` unless the actual successful RPC returns JSON boolean `true`. No migration or RPC definition exists, so config/connectivity alone is insufficient and writing acceptance remains unmet. Liveness is a real public dependency-free handler; both health routes use safe no-store envelopes. Product auth/CORS/preflight, uncached private routes and saves remain implementation targets.

## Required frontend/environment migration follow-up

Do not edit frontend examples, source or native packages in this step. Existing `apps/web/.env.example` still lists server Supabase/provider/job slots from the superseded combined deployment; those are not instructions to put secrets in the website. A later frontend/integration task removes/migrates obsolete slots, adds the web independent API origin, updates mobile's legacy `/api` comment and old port-3000 sample, and uses the shared `/api/v1` client. API privileged/job/AI service credentials go only to API; provider credentials only to AI. Do not remove legacy web API/server placeholders until that migration is separately authorized.

Both first-party web/mobile product clients must send verified Supabase bearer tokens to the API. Supabase handles passwords/sign-in/reset/refresh; cookies may be a frontend session detail but are not the product API authentication contract. API freshly verifies identity/active profile and derives ownership. Configure exact browser origins for CORS/preflight; CORS is not auth. Native requests require bearer verification too.

## Phones, local data and later foundations

`localhost` on a phone means the phone. The later mobile client needs a reachable independent API LAN/staging origin and reachable Supabase Auth URL, not the web origin. Existing web dev LAN behavior is frontend-only; choose/bind API networking explicitly in the implementation task. Auth callbacks, reset redirects, mobile secure storage and deep links need owner testing; preserve provisional `beyond` scheme and native identifiers until Hassan confirms them.

`supabase/config.toml` is local configuration; migrations/seeds/access tests remain unimplemented. Use fictional data. Agree one local stack or distinct ports in worktrees; do not reset another owner's instance. No hosted setup is required for the writing-first local gate.

Health/configuration modules and shared writing INPUT/health/error schemas now exist, but real auth/database writing acceptance is the next implementation gate. Opted-in scheduling needs a tested UTC/IANA next-local-calendar-morning resolver for `07:00`, `07:30`, `08:00`, with tones `friend`, `mentor`, `future`, `diary`; preference changes affect future jobs and edits invalidate old revisions. Lease/fencing/backoff/recovery precede AI processing, tested with a fake independent AI HTTP service, never a production fallback. Real AI and later private-storage/transcription consent/reviewed-text flow follow under the AI owner. See `docs/build-plan.md` and `docs/deployment.md`.

References: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started), [Expo Router manual setup](https://docs.expo.dev/router/installation/).
