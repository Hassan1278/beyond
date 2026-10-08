# Folder structure and deferred files

This distinguishes the existing scaffold from the authorized target. No API app source, migrations, executable tests or cloud setup are added by this documentation-only step. Git does not store empty directories, so existing empty leaves contain `.gitkeep`; asset folders have no dummy images. The old `apps/web/src/app/api` and `apps/web/src/server` folders below are legacy unused placeholders, not running backend services. Do not remove them or edit either frontend in this task.

## Existing scaffold (not the new deployment target)

```text
beyond/
├── apps/
│   ├── web/
│   │   ├── package.json, tsconfig.json, .env.example
│   │   ├── public/fonts/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/, signup/
│   │       │   ├── auth/callback/
│   │       │   ├── (app)/journal/[id]/, reflections/[id]/, memory/, settings/
│   │       │   └── api/
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
│   ├── package.json, tsconfig.json
│   └── src/types/, validation/, api/, constants/
├── supabase/config.toml, migrations/, tests/
├── tests/integration/, e2e/
├── evals/README.md
├── docs/ (plans, contracts, workstreams, task template)
├── .github/workflows/ci.yml, pull_request_template.md
├── package.json, package-lock.json, tsconfig.base.json
├── .nvmrc, .npmrc, .prettierrc.json, .prettierignore
├── .env.example, .gitignore, .dockerignore
└── README.md, AGENTS.md
```

## Authorized future backend target (not created here)

```text
apps/api/
  src/app/api/health/live/, health/ready/
  src/app/api/v1/entries/, reflections/, memories/, todos/, settings/, account/
  src/app/api/v1/internal/jobs/process/
  src/server/services/, jobs/, auth/, db/
services/ai/                    independent HTTP service, reserved for AI owner
packages/shared/src/            portable product and AI HTTP contracts
supabase/                       schema, RLS, grants, validated RPCs; later private media policies
tests/integration/              real Auth/Postgres and fake independent AI HTTP fixtures
```

`apps/api` will be API-only Next.js Node route handlers/server modules, independently deployed/tested/configured from web. API owns auth/database/queue/jobs/finalize/deletion. `services/ai` owns prompts/providers and optional RAG/transcription without DB admin keys; backend does not implement it. Shared remains portable, with no framework/Node-only dependencies or credentials. New manifests/scripts/env examples are future coordinated work, keeping Node.js `24.20.0`, npm `11.19.0`, existing dependency pins and the one root lockfile unchanged here.

## Files intentionally deferred

These files are future implementation work, not missing completed work. Do not implement obsolete web backend placeholders:

| Area                       | Future files                                                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web framework/tooling      | `next.config.ts`, `eslint.config.mjs`, generated `next-env.d.ts`                                                                                                                   |
| Web pages                  | Root/auth/app layouts and pages, `globals.css`, error/not-found pages                                                                                                              |
| Independent product API    | `apps/api` foundation and Node `route.ts` handlers for health and `/api/v1`; no web API implementation                                                                             |
| Web components             | UI primitives, shell, editor, reflection card                                                                                                                                      |
| Web/browser adapters       | Separately authorized independent-origin `/api/v1` bearer client and public env migration; legacy examples unchanged here                                                          |
| Product backend            | `apps/api/src/server` auth/env/errors/user DB, isolated jobs/account admin, product services and lease/fenced job processor/tests                                                  |
| Independent AI             | AI-owner `services/ai` versioned HTTP generation, prompts/providers and optional RAG/transcription; no DB admin keys                                                               |
| Mobile screens             | `_layout.tsx`, `index.tsx`, auth callbacks/screens, journal/reflection/detail/settings/memory screens                                                                              |
| Mobile adapters/components | API, Supabase, secure storage, environment modules, UI/editor/reflection components                                                                                                |
| Shared package             | `index.ts`, generated DB types, journal/reflection/API types, validation schemas, API client modules, limits                                                                       |
| Database                   | Profiles, entries, jobs, reflections, approved memories, todos; RLS/grants/validated RPCs, replay tombstones, deletion; later private media metadata/job kind                      |
| Tests/evaluations          | Real local Supabase Auth/Postgres two-user writing tests, replay/revisions, scheduling/lease/fencing/backoff/recovery, fake independent AI HTTP fixtures; later E2E/AI evaluations |
| Assets                     | Logo, fonts, icons, splash images, store art                                                                                                                                       |
| Optional Docker            | `Dockerfile.dev` and `compose.yaml` after apps launch                                                                                                                              |

Mobile uses declarative `app.json` rather than the proposed executable `app.config.ts`, to keep this scaffold free of JavaScript/TypeScript source. Switch to a dynamic app config later only if required. The manifest's Expo Router entry and shared package exports intentionally point to future implementation entry points. Native release instructions and SDK-compatible pins remain unchanged; no UI/native package work occurs here.

Writing with real local Auth/Postgres comes first and works with AI down. Atomic entry/job is opt-in only; tested UTC/IANA next-morning resolution and lease/fencing/backoff/recovery precede scheduled AI processing. Voice later uses private Storage/metadata/transcription jobs and a reviewed transcript into the same text flow with separate consent. Source-linked memories/derived todos follow the proposed privacy-first cascade; standalone todos remain. Account deletion needs a durable deleting gate/retry before Auth deletion. See architecture/API/build-plan for exact contracts; no runtime test results are claimed. Full patterns/Life Film are deferred; never fabricate counts or statistics. Frontend origin/bearer/environment-example migration and eventual legacy cleanup require separate authorization.

The requested plain-text `docs/backend-changes.txt` records step001 and validation placeholders for the main agent; it is the only new file in this documentation step.
