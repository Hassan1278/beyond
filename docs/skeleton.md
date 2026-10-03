# Folder structure and deferred files

Every feature folder in the supplied plan is represented. Git does not store empty directories, so empty leaves contain `.gitkeep`; remove a placeholder when that directory gets a real file. Asset folders are reserved without dummy images.

## Structure

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

## Files intentionally deferred

The instruction is to prepare the repository without writing coding files. These files from the proposal are future implementation work, not missing completed work:

| Area                       | Future files                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Web framework/tooling      | `next.config.ts`, `eslint.config.mjs`, generated `next-env.d.ts`                                               |
| Web pages                  | Root/auth/app layouts and pages, `globals.css`, error/not-found pages                                          |
| Web API                    | `route.ts` handlers inside the prepared API folders                                                            |
| Web components             | UI primitives, shell, editor, reflection card                                                                  |
| Web/browser adapters       | `api.ts`, `env.ts`, browser/server Supabase adapters                                                           |
| Backend                    | Auth/env/errors/DB/admin modules, service modules, AI provider/prompts, job processor/tests                    |
| Mobile screens             | `_layout.tsx`, `index.tsx`, auth callbacks/screens, journal/reflection/detail/settings/memory screens          |
| Mobile adapters/components | API, Supabase, secure storage, environment modules, UI/editor/reflection components                            |
| Shared package             | `index.ts`, generated DB types, journal/reflection/API types, validation schemas, API client modules, limits   |
| Database                   | Initial schema, RLS, reflection-job/scheduler migrations, fictional `seed.sql`, access-policy SQL tests        |
| Tests/evaluations          | Integration/E2E source, `vitest.config.ts`, `playwright.config.ts`, fictional scenario JSON, evaluation runner |
| Assets                     | Logo, fonts, icons, splash images, store art                                                                   |
| Optional Docker            | `Dockerfile.dev` and `compose.yaml` after apps launch                                                          |

Mobile uses declarative `app.json` rather than the proposed executable `app.config.ts`, to keep this scaffold free of JavaScript/TypeScript source. Switch to a dynamic app config later only if required. The manifest's Expo Router entry and shared package exports intentionally point to future implementation entry points.
