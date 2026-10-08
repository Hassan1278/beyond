# Deployment runbook

This is a deployment design/runbook, not completed setup or authorization to perform hosted actions. The user has already authorized architecture-first work followed by local backend/environment implementation with small validated commits. Step001 adds no product implementation: no API app source, migrations, executable product tests, hosted projects, hosting secrets, service startup or native builds. The combined web/API deployment is superseded by independently deployed `apps/web`, API-only `apps/api` Next.js Node handlers and AI-owner `services/ai`. Frontends and unused legacy web API/server placeholders remain untouched. Hosted deployments, database/account changes, pushes and native releases require separate authorization.

## Ownership and environments

Hassan owns the personal private GitHub repository and adds friends as collaborators. GitHub collaboration does not itself configure a hosting account or grant cloud-project access. Nominate a release owner and add cloud access only as needed.

First prove writing with real local Supabase Auth/Postgres; no cloud setup is needed for that gate. Before real beta data, use separate staging/production Supabase projects. Separate web/API Vercel projects and the independent AI service use matching environment scopes; Preview/staging must not access production data. EAS development/preview profiles use staging public configuration; production uses production. Keep environment values out of Git, with separate deployments/tests/env in one monorepo and one root lockfile.

## 1. Supabase database/auth

After initial migrations, policies, and tests exist:

1. Create staging, record its project reference, and configure auth providers/redirects.
2. From the repository root, run `npx supabase login`, then `npx supabase link --project-ref STAGING_PROJECT_REF`.
3. Review pending migrations using `npx supabase db push --dry-run`. Apply them to staging with `npx supabase db push` and verify the schema/policies with fictional users.
4. Generate database types into the shared package from the validated schema during implementation, then commit that generated source.
5. Add public Supabase URL/publishable key and the independent product API origin to client environments through their separately authorized migration. API receives `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` and an isolated `SUPABASE_SECRET_KEY` only for jobs/account operations, never normal queries. Do not give the AI service DB admin keys.
6. Configure web auth callback URLs and the tested mobile deep-link callback; match the actual callback path used by implementation. Keep staging redirects distinct from production.

Local testing uses the committed local config and Docker. Migrations are the source of truth; do not rely on undocumented dashboard schema changes. Production setup repeats the reviewed process with the production project reference and credentials.

## 2. Separate Vercel website and product API

The repository owner imports `Hassan1278/beyond` into separate Vercel projects. A collaborator on a personal repository cannot perform that initial import/connection. Choose a plan/account whose deployment rules support intended commit authors and collaboration. Verify personal/Hobby deployment-author restrictions before requiring every friend-authored preview; do not treat the scaffold's prior plan assumptions as a newly checked hosting guarantee. Hassan can own release commits or choose a supported shared plan. No import is performed here.

Configure each project only after its source/build prerequisites and acceptance gates exist:

| Setting                               | Website target                                        | Product API target                                         |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Framework                             | Next.js                                               | API-only Next.js, Node route handlers                      |
| Root Directory                        | `apps/web`                                            | `apps/api` (not created here)                              |
| Include source outside Root Directory | Enabled for `packages/shared`                         | Enabled for `packages/shared`                              |
| Node.js                               | 24.x host line; validate repository pin compatibility | 24.x host line; validate repository pin compatibility      |
| Install command                       | `cd ../.. && npm ci`                                  | `cd ../.. && npm ci` after workspace/lock coordination     |
| Build command                         | `npm run build` in web when source exists             | Future API workspace build command; not added in this step |
| Output directory                      | Next.js default                                       | Next.js default                                            |
| Production branch                     | `main`                                                | `main` with independent release steps                      |

Repository runtime remains Node.js `24.20.0` / npm `11.19.0`; verify host support rather than changing pins here. API source, workspace manifests/scripts, shared transpilation, server-only boundaries and independent tests are later tasks. Web UI/config/source and mobile remain untouched in this step; legacy web API/server placeholders are unused and not removed.

Writing-required API environment consists of `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and exact browser-origin `CORS_ALLOWED_ORIGINS`. Writing startup/readiness requires no AI credentials or reachability. Optional later config is validated only when its feature is enabled: isolated `SUPABASE_SECRET_KEY` for jobs/account operations, `JOB_TRIGGER_SECRET` for protected job invocation, and `AI_SERVICE_URL`/versioned `AI_SERVICE_TOKEN` for AI processing. Provider credentials belong only in `services/ai`. Existing frontend examples retain legacy server fields/mobile path comments; separately authorize migration of public API origins, `/api/v1` client and bearer adapters. `APP_URL` remains a web auth-redirect convention, not the product API origin or authentication.

Verify public cheap `/api/health/live` and bounded config/DB-schema `/api/health/ready` without secrets or AI dependency. Then prove real local/staging two-user product CRUD, replay/revisions and direct RLS/grants/RPC access. Both clients send bearer tokens, freshly verified by API with an active profile; Supabase handles password/sign-in/reset/refresh. Exact CORS is not auth, and private responses are `no-store` and uncached. AI downtime must not prevent saves. Protected dependency/queue status is later.

### Independent AI service (AI-owner follow-up)

`services/ai` is reserved for the AI owner and independently deployed/tested; its host/provider/model are not selected or provisioned here. Agree versioned server credential/rotation for `POST /v1/reflections:generate`: entry/revision/tone/bounded authorized context in, letter/actions/provenance out. AI owns prompts/providers and optional RAG/transcription, without DB admin keys or product writes. API owns queue/jobs/finalization/deletion. Fake independent AI HTTP fixtures are tests only, never production fallback. Real AI deployment follows durable processing gates and retention/evaluation review.

## 3. Supabase reflection scheduler

Only after the writing gate, tested next-morning resolver and durable processing primitives pass actual tests:

1. Implement atomic opted-in entry/job, bounded claim/finalize primitives, leases/fencing tokens, backoff/maximum attempts, crash recovery and revision-unique output before first AI processing. Non-opted-in saves create no job and never require AI availability.
2. Store UTC due times; validate IANA timezone with prototype morning times `07:00`, `07:30`, `08:00` and tones `friend`, `mentor`, `future`, `diary`. Test next-local-calendar-morning UTC conversion, date boundaries and DST gaps/overlaps before enabling opt-in. Preference changes affect future jobs; edits invalidate old revisions. No production forced demo delivery.
3. Later enable reviewed Cron/HTTP extensions through migrations. Keep scheduler origin/`JOB_TRIGGER_SECRET` in its secret store and invoke `/api/v1/internal/jobs/process` on the independent API over HTTPS. Do not use a product user's token as scheduler privilege.
4. API owns processing and calls independent AI with its versioned service credential. Verify timeouts/batch/concurrency against measured host limits. Tests first use a fake independent AI HTTP service, never a production fallback; real service follows under the AI owner.
5. Observe retry/lease-expiry/fencing recovery, duplicate prevention and edit/delete during processing. Database finalization rechecks active owner, live revision/eligibility and fencing token. A fired schedule is not proof of completed or safe reflection delivery. Actions/memories remain explicit decisions, not automatic writes.

Schedulers target their own API/database/AI environments. Pause new claims during incompatible contract releases and resume only after verification. Account deletion needs a durable deleting gate and cleanup retry before Auth deletion; source deletion applies the proposed privacy-first cascades and minimal replay tombstones. Voice later adds private Storage/metadata/transcription jobs and separate consent/reviewed transcript; optional RAG needs user-scoped source/deletion contracts. No runtime deletion tests exist yet and no AI encryption/perfect-safety guarantee is made. Secrets belong in secret stores, never migrations or example values.

## 4. Expo EAS Android/iOS

After mobile routes work, run EAS commands from `apps/mobile`. The pinned EAS executable is installed at the root; `npx --no-install eas` resolves it from this workspace.

1. Confirm the provisional `com.hassan1278.beyond` Android package/iOS bundle ID and `beyond` scheme before registration. Confirm the Expo account and project ownership.
2. Run `npx --no-install eas login`, then `npx --no-install eas init`. Commit the resulting public project ID/config change; keep signing credentials local or in EAS.
3. Set the three `EXPO_PUBLIC_` values in EAS development, preview, and production environments. They are bundled public configuration, not secrets.
4. Run `npx --no-install eas build --profile development --platform android` for development-client use, or select iOS as required. A physical iOS build requires the appropriate account/signing/device setup; use a dedicated simulator profile if needed.
5. Run `npx --no-install eas build --profile preview --platform android` to get the configured internal APK. For iOS internal distribution, configure signing and registered devices or use TestFlight through the production/store path.
6. Verify the installed builds against the matching HTTPS API, auth/deep links, shared contract, and deletion flow.
7. When explicitly releasing, run `npx --no-install eas build --profile production --platform all`; configure store credentials/metadata and submit the chosen build IDs using EAS Submit.

The current `eas.json` supplies development, preview, and production profiles; icons/splash/store assets remain absent. Native projects are generated through Expo Continuous Native Generation and ignored by Git. Do not treat an EAS Update as a replacement for a native binary when native dependencies/configuration change; an update strategy is deferred.

## Release and rollback

Run required independent API/AI/frontend, database and integration checks on the actual release commit. Apply backward-compatible migrations first, deploy compatible AI/API versions with claims paused when needed, then release web and distribute mobile builds last. Verify service-credential/contract compatibility before resuming work. Installed older mobile clients must continue to work. Record actual commit, migration versions, separate web/API/AI deployment IDs and EAS build IDs; do not invent successful checks or hashes.

Rollback web, API or AI independently to known-good versions only after checking database/service/old-client compatibility and obtaining hosted-action authorization. Prefer reviewed forward database fixes; never reset production as rollback. Pause scheduling if processing is unsafe. Native rollback usually requires another binary. Backend handoffs use the already authorized small validated local commits; the main agent records actual validation and blockers in `docs/backend-changes.txt` before committing. Step001 adds no product implementation; that milestone does not impose a global restriction on commands or Git operations. This runbook does not authorize hosted changes or native releases.

## Official references

- [Vercel Git deployment restrictions](https://vercel.com/docs/git)
- [Personal-repository import permissions](https://vercel.com/docs/git/vercel-for-github)
- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Cron HTTP invocations](https://supabase.com/docs/guides/cron/quickstart)
- [EAS with monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [EAS build profiles](https://docs.expo.dev/eas/json/)
