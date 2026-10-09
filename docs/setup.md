# Setup and commands

> Current feature-branch status: [private backend milestone](product-api.md) supersedes the Step003 status and unimplemented-route statements below. Settings, approved memories, standalone todos, the shared client and optional durable account cleanup now exist on `feat/private-backend`. Writing and the pitch prototype were merged into `main` at `6ef74e9`. Earlier source/CI/authorization notes below are historical; current user authorization permits backend implementation, commits and feature-branch pushes. AI/reflection processing and undesigned frontends remain deferred.

## Status and tools

This is guidance, not a fresh execution report. Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input schemas/unit tooling. **Step003 implements non-opted-in writing**, fresh bearer/active-profile checks, entries CRUD/resource/cursor contracts, profiles/Auth trigger/backfill, RLS/grants/validated RPCs and real schema readiness. Frontends/legacy placeholders and AI implementation remain untouched; no cloud setup is claimed.

Use Git, Node.js `24.20.0`, npm `11.19.0`, existing pins and one root lockfile; step003 adds no package. Source commit `b192bde` is pushed to `feat/backend-foundation` and passed both Linux CI jobs; remote `main` remains unchanged at `2c9fa7e`. The final documentation-record commit is not yet created and is distinct from that tested source. No merge, main overwrite or deployment occurred. Backend/local Docker work, small validated commits and feature-branch push are authorized. Automatic main merge/overwrite/force-push, hosted DB/deploy/account actions, PR creation, frontend/AI-owner work and native release are not authorized. Main owns the log; narrower delegate restrictions are not global workflow rules.

Android emulators need Android Studio; iOS simulators need macOS/Xcode. Physical devices/EAS remain options with signing/account prerequisites. Local writing uses real Supabase Auth/Postgres and Docker, not mocked DB.

Bootstrap guidance (frontend env copies belong to separately authorized frontend work):

```sh
nvm install
nvm use
npm install --global npm@11.19.0
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Frontend examples remain legacy: do not populate old privileged/provider fields. Root-lock clean `npm ci` and project reproducibility are verified on Linux CI. Local Windows `npm ci` remains host-guard constrained, not a project-wide blocker. No vulnerability audit is claimed. Install at root, never add per-app locks. Copy writing-only `apps/api/.env.example` to `apps/api/.env.local` for configured development, not deliberately unconfigured health smoke. The API sample is fixed to local Supabase port `55321`.

## Existing commands and prerequisites

| Command                     | Purpose / prerequisite                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `npm ci`                    | Root-lock clean install; Linux CI reproducibility verified                         |
| `npm run check:deps`        | Installed package/peer resolution                                                  |
| `npm run format:check`      | Supported configuration/documentation formatting                                   |
| `npm run format`            | Only assigned authorized paths                                                     |
| `npm run dev:web`           | Frontend on 3000 when entry points exist; not product API                          |
| `npm run dev:mobile`        | Expo after mobile entry points                                                     |
| `npm run dev:api`           | Health/writing development API at `127.0.0.1:3002`                                 |
| `npm run lint:backend`      | API/shared lint; final pass                                                        |
| `npm run typecheck:backend` | API/shared types; final pass                                                       |
| `npm run test:backend`      | Final pass: 536 tests / 9 files, including 216 writing + 20 outputs                |
| `npm run build:api`         | Normal repository production build passed on Linux CI                              |
| `npm run test:api:smoke`    | Built API, free 3002, no configured API env file; deliberately unconfigured health |
| `npm run test:api:writing`  | Built API + running local Supabase; real fixture-user writing acceptance           |
| `npm run lint`              | Workspace lint; frontend prerequisites separate                                    |
| `npm run typecheck`         | Workspace types; frontend prerequisites separate                                   |
| `npm test`                  | Root Vitest API/shared unit tests, separate from real DB acceptance                |
| `npm run test:e2e`          | Apps, Playwright config/browsers                                                   |
| `npm run build:web`         | Website source/config prerequisites                                                |
| `npm run check:mobile`      | Android/iOS JS export after routes, not native-build proof                         |
| `npm run db:start`          | Docker + configured writing-only local Supabase startup                            |
| `npm run db:stop`           | Stop local stack after startup/validation                                          |
| `npm run db:test`           | Running local DB; writing migration/access pgTAP tests                             |

[GitHub Actions run `37958461995`](https://github.com/Hassan1278/beyond/actions/runs/37958461995) completed **SUCCESS** for source commit `b192bde`; both backend and real-database jobs passed. Linux CI verified clean root-lock `npm ci`, `npm run check:deps`, root `npm run format:check`, backend lint/types, **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), the normal repository production Next build and HTTP health. Linux needed no temporary Turbopack root workaround. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed with identity/RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. Body deadline/cancellation regressions and unconfigured live `200`/ready `503` passed. This run covers `b192bde`, not later changes; the final documentation-record commit is not yet created. Existing deprecation and non-failing Vitest warnings remain in main's log; no vulnerability audit is claimed.

Health smoke requires a successful build and free `127.0.0.1:3002`, removes writing variables from its spawned server and needs no configured API-local env file. It tests live `200`/unconfigured ready `503`, no-store/safe envelopes and stops the server. It is not the writing or configured-readiness proof.

## Local writing-only Supabase

Windows excludes TCP ports `54290..54489`. Local Supabase ports changed from the `5432x` range to `5532x`; no OS exclusion/firewall changes were made:

| Component | Port  | Status                           |
| --------- | ----- | -------------------------------- |
| API/Auth  | 55321 | Writing-only local API           |
| Postgres  | 55322 | Local DB                         |
| Studio    | 55323 | Configured, excluded/not started |
| Mailpit   | 55324 | Local mail fixture service       |

Root `npm run db:start` now configures the writing-only exclusions by default and is the restart command. Its supported CLI equivalent is:

```sh
supabase start --exclude realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta
```

Use the pinned repository CLI; no reset, hosted linking or hosted DB change is needed. The exclusions retain writing/Auth/Postgres without AI, Storage, Studio or optional services. Supabase CLI Docker defaults bind published ports to `0.0.0.0`: **local development only, never a production exposure/deployment pattern**. API dev/start remains loopback-bound. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`, coordinate shared local instances and never reset another owner's DB.

Acceptance order:

```sh
npm run db:start
npm run db:test
npm run build:api
npm run test:api:writing
```

The writing runner guards its local target, captures keys at runtime without dotenv/committed secrets, creates fixture users only and cleans those users/server. It must not target hosted or production data. Fixture cleanup and Beyond stack shutdown completed successfully; auth fixture user count is `0`. Use fictional content, not real journals.

## Environment ownership

Root `.env.example` is documentation only, not a combined file to copy. Web uses `apps/web/.env.local`, mobile `apps/mobile/.env`; their examples remain legacy. API uses its writing-only example and `apps/api/.env.local`. AI config remains under its separate owner. Keep project/environment values scoped and out of Git.

| Variable                                | Scope                               | Requirement / meaning                                                    |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `SUPABASE_URL`                          | API                                 | Required HTTPS origin except HTTP loopback; local API port 55321         |
| `SUPABASE_PUBLISHABLE_KEY`              | API                                 | Required `sb_publishable_` key; writing also uses verified user's bearer |
| `CORS_ALLOWED_ORIGINS`                  | API                                 | Exact canonical comma-separated HTTPS origins except local HTTP loopback |
| `SUPABASE_SECRET_KEY`                   | Future isolated jobs/account module | Optional until enabled; never writing/user queries, client bundle or AI  |
| `AI_SERVICE_URL`                        | Future API AI client                | Optional independent AI origin; append `/v1/reflections:generate`        |
| `AI_SERVICE_TOKEN`                      | Future API / AI verifier            | Versioned server credential/rotation, never user token                   |
| `JOB_TRIGGER_SECRET`                    | Future API / scheduler              | Optional until protected jobs enabled                                    |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | AI service only                     | Unselected provider/model; no DB admin keys                              |
| `NEXT_PUBLIC_SUPABASE_URL`              | Web                                 | Public Auth URL                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Web                                 | Public key, ownership policies still required                            |
| `NEXT_PUBLIC_API_URL`                   | Web proposed migration              | Independent API origin, not yet added to frontend example                |
| `APP_URL`                               | Existing web convention             | Frontend auth-redirect origin, not API/auth proof                        |
| `EXPO_PUBLIC_SUPABASE_URL`              | Mobile                              | Reachable public Auth URL                                                |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Mobile                              | Public key                                                               |
| `EXPO_PUBLIC_API_URL`                   | Mobile                              | Independent origin; future shared client appends `/api/v1`               |

Public prefixes expose values. Examples contain dummy values only; never commit credentials. Writing uses no API admin key, AI credential or AI reachability. Config requires HTTPS except loopback and rejects wildcard/path/trailing-slash/query/fragment origins. Actual `api_schema_ready` SQL catalog check must return boolean `true` within readiness's 1500 ms deadline; config/connectivity alone is insufficient. Liveness/ready and private writing use no-store safe envelopes.

## Required frontend migration follow-up

Do not edit frontend examples/source/native packages in backend-only work. Web example still lists superseded server/provider/job fields; mobile retains legacy `/api`/3000 assumptions. Their owners must migrate public independent API origins, bearer adapters/shared `/api/v1` client and obsolete slots/comments. Provider credentials belong only to AI, privileged jobs/account keys only to isolated API modules. Leave legacy web backend placeholders until migration is separately authorized.

Both clients must send bearer tokens; API freshly verifies Auth and active profile and derives owner. Cookies may be frontend session details, not product auth. Exact CORS/preflight is implemented, not authentication. Native requests need tokens too.

## Phones and later features

`localhost` on a phone means the phone. Future mobile integration needs deliberately configured reachable API and Supabase Auth LAN/staging origins, not web origin. Keep API loopback defaults unless networking is separately owned/authorized. Test callbacks/reset redirects/secure storage/deep links with owner; preserve provisional `beyond` scheme and identifiers until Hassan confirms them.

Writing migrations/access tests now exist. Scheduling/jobs/reflections/accepted todos/memory/voice/durable account deletion do not. Profile deleting denial is not a full deletion endpoint. Test next-morning UTC/IANA/date/DST resolution, atomic opt-in and leases/fencing/backoff/recovery before AI; fake HTTP fixtures are future tests, never production fallback. Later voice requires private Storage, separate consent and reviewed text. See build-plan/deployment.

References: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started), [Expo Router manual setup](https://docs.expo.dev/router/installation/).
