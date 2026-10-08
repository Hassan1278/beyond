# Folder structure and deferred files

This distinguishes the existing scaffold/current foundation from the authorized target. Step001 is the historical documentation-only architecture commit `93e473b`, not the current source inventory. Step002 now contains API health/configuration and portable shared writing INPUT/health/error schemas with adjacent executable unit tests. No product auth, `/api/v1` handlers, persistence, SQL migrations/RPC implementation, AI service or cloud setup exists. Git does not store empty directories, so deferred empty leaves contain `.gitkeep`; asset folders have no dummy images. The old `apps/web/src/app/api` and `apps/web/src/server` folders below remain legacy unused placeholders, not running backend services. Do not remove them or edit either frontend in backend-only tasks.

## Existing scaffold and step002 foundation

```text
beyond/
├── apps/
│   ├── api/
│   │   ├── package.json, tsconfig.json, next.config.ts, eslint.config.mjs, .env.example
│   │   └── src/
│   │       ├── app/api/health/
│   │       │   ├── live/route.ts, route.test.ts
│   │       │   └── ready/route.ts, route.test.ts
│   │       └── server/
│   │           ├── config.ts, config-parser.ts, config-parser.test.ts
│   │           ├── health.ts, health-check.ts, health-check.test.ts
│   │           └── http.ts, http.test.ts
│   ├── web/
│   │   ├── package.json, tsconfig.json, .env.example
│   │   ├── public/fonts/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/, signup/
│   │       │   ├── auth/callback/
│   │       │   ├── (app)/journal/[id]/, reflections/[id]/, memory/, settings/
│   │       │   └── api/ (legacy placeholders, no handlers)
│   │       │       ├── health/, entries/[id]/, reflections/[id]/, memories/[id]/
│   │       │       ├── settings/, account/
│   │       │       └── internal/jobs/process/
│   │       ├── components/ui/
│   │       ├── lib/supabase/
│   │       └── server/services/, ai/prompts/, jobs/
│   └── mobile/
│       ├── package.json, tsconfig.json, app.json, eas.json, .env.example
│       ├── assets/fonts/
│       └── src/
│           ├── app/(auth)/, auth/, (app)/journal/, (app)/reflections/
│           ├── components/ui/
│           └── lib/
├── packages/shared/
│   ├── package.json, tsconfig.json, eslint.config.mjs
│   └── src/
│       ├── index.ts
│       ├── schemas/entries.ts, entries.test.ts, health.ts, health.test.ts
│       └── types/, validation/, api/, constants/ (deferred placeholders)
├── supabase/config.toml, migrations/, tests/ (no SQL implementation)
├── tests/
│   ├── api-health-smoke.mjs (production HTTP health, not DB acceptance)
│   └── integration/, e2e/ (deferred acceptance tests)
├── evals/README.md
├── docs/ (plans, contracts, workstreams, task template)
├── .github/workflows/ci.yml, pull_request_template.md
├── package.json, package-lock.json, tsconfig.base.json, vitest.config.ts
├── .nvmrc, .npmrc, .prettierrc.json, .prettierignore
├── .env.example, .gitignore, .dockerignore
└── README.md, AGENTS.md
```

The API is API-only Next.js Node handlers, with shared-package transpilation and a server-only writing-config loader. Public liveness is a real dependency-free `200` handler. Readiness uses valid writing config and a bounded POST to required `api_schema_ready`; it returns generic `503` unless the actual successful RPC returns JSON boolean `true` within 1500 ms. No migration/RPC definition exists. Health/configuration and unit fixtures do not meet writing acceptance.

Shared schemas are portable INPUT contracts, not saves or database enforcement: strict creation with UUID `idempotency_key`, explicit literal `false` `reflection_opt_in`, nonblank text of 1..20000 UTF-16 code units preserving whitespace exactly, valid Unicode and no NUL; PATCH requires the same text and integer revision 1..2147483647; params require UUID `id`. Health/error envelopes also exist; resource outputs, clients and AI contracts remain deferred.

Root `dev:api`, `lint:backend`, `typecheck:backend`, `test:backend`, `build:api` and `test:api:smoke` scripts and the Node `backend` project in `vitest.config.ts` exist with API/shared unit tests and `passWithNoTests: false`. `tests/api-health-smoke.mjs` requires an existing production build, starts Next on `127.0.0.1:3002` with writing environment variables removed, checks live `200` / unconfigured ready `503`, no-store headers and safe envelopes, and stops its server. Run `npm run build:api` before `npm run test:api:smoke`, with port 3002 free and no configured API-local environment file. Main locally validated the pinned runtime, backend lint/types/unit tests, the Next.js `16.3.8` production build with only dynamic health routes, and production smoke; detailed results remain in `docs/backend-changes.txt`. API root-lock integration is complete with only API metadata/workspace link added and existing pins unchanged. CI configures backend lint/types/unit/build/smoke after dependency/format checks, but remote CI has not run. Clean-install reproducibility remains unverified after clean `npm ci` failed under host bulk-delete protection; no vulnerability audit or database/writing acceptance is claimed. The module-native future warning from root `vitest.config.ts` is non-failing follow-up, not suppressed here. `apps/api/.env.example` is writing-only; frontend examples remain untouched legacy. Detailed validation/blockers stay in main's log.

## Authorized deferred backend target

```text
apps/api/
  src/app/api/v1/entries/, reflections/, memories/, todos/, settings/, account/
  src/app/api/v1/internal/jobs/process/
  src/server/services/, jobs/, auth/, db/
services/ai/                    independent HTTP service, reserved for AI owner
packages/shared/src/            resource outputs, API client, AI HTTP contracts, DB types
supabase/                       schema, RLS, grants, validated RPCs; later private media policies
tests/integration/              real Auth/Postgres and fake independent AI HTTP fixtures
```

API owns auth/database/queue/jobs/finalize/deletion as the implementation target, not existing behavior. `services/ai` owns prompts/providers and optional RAG/transcription without DB admin keys; backend does not implement it. Shared remains portable, with no framework/Node-only dependencies or credentials. Preserve completed API metadata/workspace link integration in the root lockfile and coordinate any future dependency changes while retaining Node.js `24.20.0`, npm `11.19.0` and existing pins; frontend manifests remain untouched.

## Files intentionally deferred

These files are future implementation work, not missing completed work. Do not implement obsolete web backend placeholders:

| Area                       | Future files                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web framework/tooling      | `next.config.ts`, `eslint.config.mjs`, generated `next-env.d.ts`                                                                                                                                                                 |
| Web pages                  | Root/auth/app layouts and pages, `globals.css`, error/not-found pages                                                                                                                                                            |
| Independent product API    | `/api/v1` Node `route.ts` product handlers; health routes/config already exist; no web API implementation                                                                                                                        |
| Web components             | UI primitives, shell, editor, reflection card                                                                                                                                                                                    |
| Web/browser adapters       | Separately authorized independent-origin `/api/v1` bearer client and public env migration; legacy examples unchanged                                                                                                             |
| Product backend            | Auth/active-profile verification, user DB, isolated jobs/account admin, product services and lease/fenced job processor/tests; writing config/health/errors already exist                                                        |
| Independent AI             | AI-owner `services/ai` versioned HTTP generation, prompts/providers and optional RAG/transcription; no DB admin keys                                                                                                             |
| Mobile screens             | `_layout.tsx`, `index.tsx`, auth callbacks/screens, journal/reflection/detail/settings/memory screens                                                                                                                            |
| Mobile adapters/components | API, Supabase, secure storage, environment modules, UI/editor/reflection components                                                                                                                                              |
| Shared package             | Generated DB types, resource/output/reflection/AI HTTP schemas, API client modules and remaining limits; `index.ts` and writing INPUT/health/error schemas already exist                                                         |
| Database                   | Required `api_schema_ready` SQL RPC, profiles, entries, jobs, reflections, approved memories, todos; RLS/grants/validated RPCs, replay tombstones, deletion; later private media metadata/job kind                               |
| Tests/evaluations          | Real local Supabase Auth/Postgres two-user writing tests, replay/revisions, scheduling/lease/fencing/backoff/recovery, fake independent AI HTTP fixtures; later E2E/AI evaluations; adjacent foundation unit tests already exist |
| Assets                     | Logo, fonts, icons, splash images, store art                                                                                                                                                                                     |
| Optional Docker            | `Dockerfile.dev` and `compose.yaml` after apps launch                                                                                                                                                                            |

Mobile uses declarative `app.json` rather than the proposed executable `app.config.ts`; switch to a dynamic app config later only if required. Its Expo Router entry still points to deferred mobile source. Shared exports now point to existing `src/index.ts`, not a future entry point. Native release instructions and SDK-compatible pins remain unchanged; no UI/native package work occurs here.

Writing with real local Auth/Postgres comes first and must work with AI down; that gate is not met. Atomic entry/job is opt-in only after a later contract extension; tested UTC/IANA next-morning resolution and lease/fencing/backoff/recovery precede scheduled AI processing. Voice later uses private Storage/metadata/transcription jobs and a reviewed transcript into the same text flow with separate consent. Source-linked memories/derived todos follow the proposed privacy-first cascade; standalone todos remain. Account deletion needs a durable deleting gate/retry before Auth deletion. See architecture/API/build-plan for exact contracts; completed local foundation checks do not validate these deferred product behaviors. Full patterns/Life Film are deferred; never fabricate counts or statistics. Frontend origin/bearer/environment-example migration and eventual legacy cleanup require separate authorization.

`docs/backend-changes.txt` remains the main agent's existing plain-text record of actual milestone validation and session-specific blockers, separate from this source/status inventory.
