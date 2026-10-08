# Setup and commands

## Status and tools

This is target setup guidance, not an implementation report. Step001 adds no product implementation: no `apps/api` source/manifests, migrations, executable product tests, AI service or cloud setup. Existing web API/server placeholders are legacy, unused and untouched. Frontends and root manifests/lockfile are unchanged at that milestone. The user has already authorized architecture-first work followed by backend/environment implementation with small validated local commits; hosted actions remain unauthorized.

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

The frontend copies preserve existing scaffold conventions, not the new API/AI secret placement. Their examples contain legacy assumptions and need the follow-up below; do not populate their old privileged/provider fields. `npm ci` uses the root lockfile without editing it. Intentional dependency changes require coordinated manifests/root lockfile; do not install inside an app or add per-app locks. API/AI-specific examples and commands are not created in this step.

## Existing scaffold commands and future checks

| Command                | Purpose / prerequisite                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm ci`               | Reproducible root install; requires pinned runtime/tooling              |
| `npm run check:deps`   | Installed package/peer resolution                                       |
| `npm run format:check` | Supported configuration/documentation formatting                        |
| `npm run format`       | Formatting; use only on the assigned task's authorized paths            |
| `npm run dev:web`      | Website on port 3000 after web entry points; not the target product API |
| `npm run dev:mobile`   | Expo server after mobile entry points                                   |
| `npm run lint`         | Requires ESLint configuration/source                                    |
| `npm run typecheck`    | Requires source                                                         |
| `npm test`             | Requires test configuration and real tests                              |
| `npm run test:e2e`     | Requires apps, Playwright configuration and browsers                    |
| `npm run build:web`    | Website production build after source/configuration                     |
| `npm run check:mobile` | Android/iOS JavaScript export after routes; not a native build          |
| `npm run db:start`     | Local Supabase configuration exists; Docker required                    |
| `npm run db:stop`      | After local startup                                                     |
| `npm run db:test`      | After migrations/access tests exist                                     |

The command inventory is guidance; `docs/backend-changes.txt` records actual validation. Independent API/AI dev, lint/typecheck/test/build scripts and CI are coordinated foundation additions, not existing root script promises. Use separate service ports, env scopes and tests; keep the root lockfile. The first acceptance gate uses real local Supabase writing with two users, replay/revisions and AI-down saves, not merely health or app shells.

## Environment ownership target

Root `.env.example` is documentation only, not a combined file to copy. Web keeps `apps/web/.env.local`, mobile `apps/mobile/.env`. A future API example/local environment belongs to `apps/api`; AI config belongs to `services/ai` under its owner. Deployed values are separately scoped per project/environment and never committed.

| Variable                                | Target scope                          | Requirement / meaning                                                                                                           |
| --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                          | API                                   | Writing-required Supabase Auth/Postgres API URL                                                                                 |
| `SUPABASE_PUBLISHABLE_KEY`              | API                                   | Writing-required public-role key; normal queries also carry verified user's token and enforce RLS                               |
| `CORS_ALLOWED_ORIGINS`                  | API                                   | Writing-required exact browser-origin allowlist; parser/format to be fixed during foundation, no wildcard                       |
| `SUPABASE_SECRET_KEY`                   | API isolated jobs/account module only | Optional until those operations are enabled; privileged key, never normal product queries, client bundle or AI service          |
| `AI_SERVICE_URL`                        | API                                   | Optional until AI processing is enabled; independent AI HTTP origin, API appends `/v1/reflections:generate`                     |
| `AI_SERVICE_TOKEN`                      | API / matching AI credential verifier | Optional until AI processing is enabled; versioned server-to-server credential with agreed rotation/version, never a user token |
| `JOB_TRIGGER_SECRET`                    | API / scheduler secret store          | Optional until protected job invocation is enabled                                                                              |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | AI service only                       | Later AI-owner configuration; unselected provider/model and provider credential, no DB admin keys                               |
| `NEXT_PUBLIC_SUPABASE_URL`              | Web                                   | Public Supabase Auth URL                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Web                                   | Public key; access still requires ownership policies                                                                            |
| `NEXT_PUBLIC_API_URL`                   | Web, proposed follow-up               | Independent product API origin; not added to frontend example here                                                              |
| `APP_URL`                               | Existing web convention               | Canonical frontend origin for auth redirects, not a product API origin/auth proof                                               |
| `EXPO_PUBLIC_SUPABASE_URL`              | Mobile                                | Public reachable Auth URL                                                                                                       |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Mobile                                | Public key                                                                                                                      |
| `EXPO_PUBLIC_API_URL`                   | Mobile                                | Independent API origin only; future shared client appends `/api/v1`                                                             |

Public prefixes expose values to clients. Examples may contain only names/dummy values. Use publishable/secret key roles deliberately if mapping legacy anon/service-role credentials; no privileged key in user queries or AI. Writing startup and bounded config/DB-schema readiness require only the writing-required API configuration, never AI credentials or AI reachability. Optional admin/job/AI configuration is validated at the corresponding enabled-feature boundary and must not block ordinary saves. Readiness exposes no secrets; private responses are never cached, and liveness is cheap and separate from protected later dependency/queue status.

## Required frontend/environment migration follow-up

Do not edit frontend examples, source or native packages in this step. Existing `apps/web/.env.example` still lists server Supabase/provider/job slots from the superseded combined deployment; those are not instructions to put secrets in the website. A later frontend/integration task removes/migrates obsolete slots, adds the web independent API origin, updates mobile's legacy `/api` comment and old port-3000 sample, and uses the shared `/api/v1` client. API privileged/job/AI service credentials go only to API; provider credentials only to AI. Do not remove legacy web API/server placeholders until that migration is separately authorized.

Both first-party web/mobile product clients must send verified Supabase bearer tokens to the API. Supabase handles passwords/sign-in/reset/refresh; cookies may be a frontend session detail but are not the product API authentication contract. API freshly verifies identity/active profile and derives ownership. Configure exact browser origins for CORS/preflight; CORS is not auth. Native requests require bearer verification too.

## Phones, local data and later foundations

`localhost` on a phone means the phone. The later mobile client needs a reachable independent API LAN/staging origin and reachable Supabase Auth URL, not the web origin. Existing web dev LAN behavior is frontend-only; choose/bind API networking explicitly in the implementation task. Auth callbacks, reset redirects, mobile secure storage and deep links need owner testing; preserve provisional `beyond` scheme and native identifiers until Hassan confirms them.

`supabase/config.toml` is local configuration; migrations/seeds/access tests remain unimplemented. Use fictional data. Agree one local stack or distinct ports in worktrees; do not reset another owner's instance. No hosted setup is required for the writing-first local gate.

Later foundation adds API entry/configuration/server modules and portable schemas, then real auth/database acceptance. Opted-in scheduling needs a tested UTC/IANA next-local-calendar-morning resolver for `07:00`, `07:30`, `08:00`, with tones `friend`, `mentor`, `future`, `diary`; preference changes affect future jobs and edits invalidate old revisions. Lease/fencing/backoff/recovery precede AI processing, tested with a fake independent AI HTTP service, never a production fallback. Real AI and later private-storage/transcription consent/reviewed-text flow follow under the AI owner. See `docs/build-plan.md` and `docs/deployment.md`.

References: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started), [Expo Router manual setup](https://docs.expo.dev/router/installation/).
