# Folder structure and deferred files

Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input schemas/unit tooling. **Step003 implements non-opted-in writing** in the independent API, shared contracts and local Supabase migrations/tests. Frontends and unused legacy web API/server placeholders remain untouched; no AI implementation or cloud setup is claimed. Git does not store empty directories; deferred leaves retain `.gitkeep`, assets have no dummy images.

## Existing scaffold and current backend inventory

This groups implemented areas without inventing filenames for deferred modules:

```text
beyond/
├── apps/
│   ├── api/
│   │   ├── package.json, tsconfig.json, next.config.ts, eslint.config.mjs, .env.example
│   │   └── src/
│   │       ├── app/api/health/live/, ready/ (Node handlers/tests)
│   │       ├── app/api/v1/entries/, entries/[id]/ (GET/POST/PATCH/DELETE)
│   │       └── server/ (config, health, HTTP, verified identity and writing modules/tests)
│   ├── web/
│   │   ├── package.json, tsconfig.json, .env.example, public/fonts/
│   │   └── src/
│   │       ├── app/(auth)/login/, signup/, auth/callback/
│   │       ├── app/(app)/journal/[id]/, reflections/[id]/, memory/, settings/
│   │       ├── app/api/ (unused legacy placeholders, no handlers)
│   │       │   ├── health/, entries/[id]/, reflections/[id]/, memories/[id]/
│   │       │   └── settings/, account/, internal/jobs/process/
│   │       ├── components/ui/, lib/supabase/
│   │       └── server/services/, ai/prompts/, jobs/ (legacy placeholders)
│   └── mobile/
│       ├── package.json, tsconfig.json, app.json, eas.json, .env.example, assets/fonts/
│       └── src/app/(auth)/, auth/, (app)/journal/, (app)/reflections/, components/ui/, lib/
├── packages/shared/
│   ├── package.json, tsconfig.json, eslint.config.mjs
│   └── src/ (index; writing input/resource/cursor/output and health/error schemas/tests)
├── supabase/
│   ├── config.toml
│   ├── migrations/ (profiles/Auth trigger/backfill, entries/RLS/grants/RPCs/schema readiness)
│   └── tests/ (transactional writing pgTAP)
├── tests/
│   ├── api-health-smoke.mjs
│   └── local writing acceptance runner; deferred AI integration/client E2E
├── evals/README.md
├── docs/ (plans, contracts, workstreams, task template, backend-changes.txt)
├── .github/workflows/ci.yml, pull_request_template.md
├── package.json, package-lock.json, tsconfig.base.json, vitest.config.ts
├── .nvmrc, .npmrc, .prettierrc.json, .prettierignore
├── .env.example, .gitignore, .dockerignore
└── README.md, AGENTS.md
```

API writing freshly verifies bearer and active profile every call, uses exact-origin CORS/preflight/no-store and no admin credentials. Public live is dependency-free; ready bounds actual `api_schema_ready` catalog-checking RPC to 1500 ms and returns `200` only for successful boolean `true`. Configured readiness `200` was tested; AI health is not required.

Shared writing includes strict create (UUID key, literal `false` opt-in, nonblank <=20000 UTF-16 text preserving whitespace and valid Unicode/no NUL), PATCH text/expected revision, UUID params, resource/output and canonical limit/cursor contracts. The shared API client remains deferred. Resource contains ID/text/revision/false opt-in/UTC created/updated; cursor strict base64url `{ created_at, id }` preserves positive-year UTC microseconds. See API for exact contracts.

Writing persistence includes public active/deleting profiles and trigger/backfill, active-own-live entries RLS, private original/key grants and authenticated validated `entry_create/update/delete/get/list` RPCs with empty search path/active lock. Unique original-payload replay returns current resource; atomic revisions conflict on stale updates. Deletion NULLs original/text/consent/revision/create/update timestamps and leaves minimum IDs, owner/key/deleted_at. DELETE returns ID only; tombstones cannot be read or resurrected. No AI/job table exists.

## Validation inventory

Root API/backend lint/typecheck/unit/build/health-smoke and `test:api:writing` scripts exist. For writing run `db:start`, `db:test`, `build:api`, then `test:api:writing`; the guarded local runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server. Health smoke remains the separate deliberately unconfigured live `200`/ready `503` scenario on free port 3002 after build, without configured API env file.

Final checks passed: **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), lint/types and body 128000-byte/total-5000-ms deadline/cancellation regressions. Production Next build passed dynamic health/entries routes in an isolated fresh mirror; its temporary Turbopack root adjustment for the shared dependency junction left repository Next config unchanged. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked identity, RLS/grants, races, replay/tombstones/paging/deleting-profile denial and fixture cleanup; **123 pgTAP** passed. Main owns the log. Separate real-DB CI and feature-branch push triggering are implemented; remote execution/clean `npm ci` remain unverified. Pins/overrides/root lock unchanged, no package addition or vulnerability-audit claim; existing non-failing warnings remain.

Local Supabase API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489` without OS changes. Root `npm run db:start` configures writing-only exclusions by default and restarts the stack; the API env sample is fixed to `55321`. CLI Docker binds `0.0.0.0` by default: local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet. No resets/hosted changes.

## Intentionally deferred work

| Area                      | Future files / behavior                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Web framework/pages/UI    | Framework config, layouts/pages/styles, shell/editor/reflection UI                       |
| Web/browser adapters      | Separately authorized independent API-origin/bearer/shared-client/env migration          |
| Independent product API   | Reflections/actions/todos/memories/settings/account/internal-job handlers                |
| Product backend           | Durable jobs/claim/lease/fencing/retry/finalize, isolated privileged account cleanup     |
| Independent AI            | AI-owner HTTP service/prompts/providers; optional owned RAG/transcription                |
| Mobile screens/adapters   | Routes/screens, API/Auth/secure-storage/env modules and UI; native previews              |
| Shared package            | Generated DB types, API client, reflection/AI schemas and remaining feature limits       |
| Database                  | Jobs/reflections/approved memories/todos, source cascades/account cleanup; private media |
| Tests/evaluations         | Scheduling/lease/recovery/fake AI HTTP, decisions/source/account/voice and client E2E    |
| Assets                    | Logo/fonts/icons/splash/store art                                                        |
| Optional Docker packaging | `Dockerfile.dev`, `compose.yaml` if needed; local Supabase already uses Docker           |

Deleting-profile denial is implemented, not durable account deletion. Writing and its resource/cursor/output contracts are implemented; final unit/lint/types/body regressions, mirror production build, health and local integration checks passed. The shared API client remains deferred. Opt-in stays false until atomic entry/job plus tested UTC/IANA next-morning/lease/fencing/backoff/recovery gates. Voice later needs private media, separate consent and reviewed transcript. Proposed source cascades remove linked memories/derived todos, leaving standalone todos. Full patterns/Life Film remain deferred; never fabricate statistics.

Mobile retains declarative `app.json`, provisional identifiers, EAS conventions and SDK-compatible pins; JS export is not native-build proof. Backend/environment work and feature-branch push/local Docker are authorized, not frontend/AI-owner implementation, main overwrite/force-push, hosted DB/deploy/account changes or PR creation. Shared stays portable. Detailed session validation belongs in main's existing log, not this inventory.
