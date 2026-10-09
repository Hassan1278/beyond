# Deployment runbook

> Current feature-branch status: [private backend milestone](product-api.md) supersedes the Step003 status and unimplemented-route statements below. Settings, approved revisioned memory corrections, standalone todos, the shared client, recent-sign-in paginated exports and optional durable account cleanup now exist on `feat/private-backend`. Writing and the pitch prototype were merged into `main` at `6ef74e9`. Earlier source/CI/authorization notes below are historical; current user authorization permits backend implementation, commits and feature-branch pushes. AI/reflection processing and undesigned frontends remain deferred.

For a future release, coordinate migration `20261010030000_memory_edits_exports.sql` with the matching API/shared contracts: memory responses now require revision and update time. Existing live and deleted rows are preserved/backfilled. Older API versions with strict memory output schemas will reject the extended response, so an application rollback requires a reviewed matching database contract; do not remove deletion constraints or restore scrubbed content. Exports need only the ordinary user-scoped API settings. They require fresh/recent sign-in for every page and create no stored server copy. Optional account deletion still requires its isolated secrets and a verified scheduler before enablement. No hosted change is performed by this runbook.

This is a runbook, not a completed deployment. Step001 (`93e473b`) is historical architecture-only work; step002 established the foundation. **Step003 implements non-opted-in writing**, portable contracts and real Auth/Postgres isolation. Independent web/API/AI deployments supersede combined web/API; frontends/legacy placeholders and AI implementation remain untouched. Feature-branch push and local Docker/backend work are authorized, not automatic main merge/overwrite/force-push, hosted DB/account/deployment actions, PR creation or native releases.

GitHub Actions run `37958461995` completed **SUCCESS** for source commit `b192bde`; both backend and real-database jobs passed. Linux CI verified clean root-lock `npm ci`, dependency resolution, root formatting, backend lint/types, **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), the normal repository production Next build and HTTP health, without a temporary root workaround. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed with identity/RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. Body deadline/cancellation regressions and unconfigured live `200`/ready `503` passed. Main owns `docs/backend-changes.txt`. This success covers `b192bde`, not later changes or the final documentation-record commit, which is not yet created; no cloud setup or deployment is claimed.

## Ownership and environments

Hassan owns the private GitHub repository and adds collaborators. Source commit `b192bde` is pushed to `feat/backend-foundation` and passed both Linux CI jobs; remote `main` remains unchanged at `2c9fa7e`. The final documentation-record commit is not yet created and is distinct from that tested source. No merge, main overwrite or deployment occurred; automatic main merge/overwrite is not authorized. GitHub access grants no cloud-project/hosting authority. Nominate a release owner and add cloud access only as needed.

Linux CI verified clean-install reproducibility, backend checks, the normal repository production build, HTTP health and real DB acceptance for source commit `b192bde`. Local Windows `npm ci` remains host-guard constrained, not a project-wide blocker. No cloud setup is needed for the writing gate; deployment-host compatibility remains a separate release check. Before real beta data, use separate staging/production Supabase projects. Separate web/API Vercel projects and the independent AI service use matching environment scopes; Preview/staging must not access production data. EAS development/preview profiles use staging public configuration; production uses production. Keep environment values out of Git, with separate deployments/tests/env in one monorepo and one root lockfile.

## 1. Supabase database/auth

Only after separate hosted-action authorization and release validation (local writing migrations/policies/tests now exist):

1. Create staging, record its project reference, and configure auth providers/redirects.
2. From the repository root, run `npx supabase login`, then `npx supabase link --project-ref STAGING_PROJECT_REF`.
3. Review pending migrations using `npx supabase db push --dry-run`. Apply them to staging with `npx supabase db push` and verify the schema/policies with fictional users.
4. Generate database types into the shared package from the validated schema during implementation, then commit that generated source.
5. Add public Supabase URL/publishable key and the independent product API origin to client environments through their separately authorized migration. API receives `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` and an isolated `SUPABASE_SECRET_KEY` only for jobs/account operations, never normal queries. Do not give the AI service DB admin keys.
6. Configure web auth callback URLs and the tested mobile deep-link callback; match the actual callback path used by implementation. Keep staging redirects distinct from production.

Local writing uses committed config and Docker: API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started. Windows excludes `54290..54489`; local ports changed, not OS settings. Root `npm run db:start` now configures writing-only exclusions by default (`realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta`) and is the restart command. Run `npm run db:start`, `npm run db:test`, `npm run build:api`, then `npm run test:api:writing`; its local-target guard/runtime key capture without dotenv/committed secrets and fixture-user/server cleanup are required. Supabase CLI Docker publishes to `0.0.0.0` by default: **local-dev only, never production exposure/deployment**. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`; do not reset any stack or make hosted changes. Migrations remain source of truth, not undocumented dashboard edits. Production setup requires separate authorization and reviewed release checks.

## 2. Separate Vercel website and product API

The repository owner imports `Hassan1278/beyond` into separate Vercel projects. A collaborator on a personal repository cannot perform that initial import/connection. Choose a plan/account whose deployment rules support intended commit authors and collaboration. Verify personal/Hobby deployment-author restrictions before requiring every friend-authored preview; do not treat the scaffold's prior plan assumptions as a newly checked hosting guarantee. Hassan can own release commits or choose a supported shared plan. No import is performed here.

Configure each project only after its source/build prerequisites and acceptance gates exist:

| Setting                               | Website target                                      | Product API target                                       |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Framework                             | Next.js                                             | API-only Next.js, Node route handlers                    |
| Root Directory                        | `apps/web`                                          | `apps/api` health and writing API                        |
| Include source outside Root Directory | Enabled for `packages/shared`                       | Enabled for `packages/shared`                            |
| Node.js                               | 24.x host line; verify repository pin compatibility | 24.x host line; verify repository pin compatibility      |
| Install command                       | `cd ../.. && npm ci`                                | `cd ../.. && npm ci`; Linux CI verified                  |
| Build command                         | `npm run build` in web when source exists           | API `npm run build` (`next build`); normal Linux CI pass |
| Output directory                      | Next.js default                                     | Next.js default                                          |
| Production branch                     | `main`                                              | `main` with independent release steps                    |

Repository Node.js `24.20.0` / npm `11.19.0`, root-lock clean install and the normal repository API production build passed on Linux CI for `b192bde`; no temporary root workaround was needed. Verify deployment-host support separately rather than change pins. No package addition/pin change or vulnerability audit is claimed. Writing resource/output contracts exist; the shared API client, deployments and web/mobile integration remain deferred. Legacy placeholders are not removed.

Existing `apps/api/.env.example` supplies writing-only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and comma-separated exact canonical `CORS_ALLOWED_ORIGINS`. The parser requires HTTPS except HTTP loopback, with the same local loopback HTTP exception for browser origins; no wildcard, credentials, path, trailing slash, query or fragment is allowed in origins. Config/readiness needs no AI credentials or reachability, but readiness also requires the actual schema RPC below. Writing bearer/active-profile verification, CORS/preflight and no-store are implemented; writing uses no admin credentials. The API-local Supabase port sample is fixed to `55321`. Optional later config is validated only when its feature is enabled: isolated `SUPABASE_SECRET_KEY` for jobs/account operations, `JOB_TRIGGER_SECRET` for protected job invocation, and `AI_SERVICE_URL`/versioned `AI_SERVICE_TOKEN` for AI processing. Provider credentials belong only in `services/ai`. Existing frontend examples retain legacy server fields/mobile path comments; separately authorize migration of public API origins, `/api/v1` client and bearer adapters. `APP_URL` remains a web auth-redirect convention, not the product API origin or authentication.

Public live is dependency-free; ready bounds the actual catalog-checking `api_schema_ready` RPC to 1500 ms, returning `200` only for successful JSON boolean `true`, otherwise safe `503`. Real local configured readiness and two-user writing/grants/RLS/RPC checks passed. Health and writing use no-store; AI is not a prerequisite. Live writing RPCs use empty security-definer search path/active-profile lock; private original/key columns are not user-readable. Creation/replay returns current resource `200`, stale revisions/retired keys `409`; tombstones NULL original/text/consent/revision/created/updated and retain minimum IDs/owner/key/deleted_at. DELETE returns ID only, deleted/other-owner `404`. Direct PostgREST `P0001` is `400`, while product not_found/forbidden/conflict map to `404`/`403`/`409`; DB never returns wrong-owner content. Text/canonical microsecond cursor/input bounds are in API. Final 128000-byte/total-5000-ms stream/deadline/cancellation regressions passed. Both future clients need freshly verified bearer/active profile; Supabase owns credential flows. Protected queue diagnostics are later.

### Independent AI service (AI-owner follow-up)

`services/ai` remains unimplemented and reserved for the AI owner, with independent deployment/tests as the target; its host/provider/model are not selected or provisioned here. Agree versioned server credential/rotation for `POST /v1/reflections:generate`: entry/revision/tone/bounded authorized context in, letter/actions/provenance out. AI owns prompts/providers and optional RAG/transcription, without DB admin keys or product writes. API owns queue/jobs/finalization/deletion. Fake independent AI HTTP fixtures are tests only, never production fallback. Real AI deployment follows durable processing gates and retention/evaluation review.

## 3. Supabase reflection scheduler

Only after the writing gate, tested next-morning resolver and durable processing primitives pass actual tests:

1. Implement atomic opted-in entry/job, bounded claim/finalize primitives, leases/fencing tokens, backoff/maximum attempts, crash recovery and revision-unique output before first AI processing. Non-opted-in saves create no job and never require AI availability.
2. Store UTC due times; validate IANA timezone with prototype morning times `07:00`, `07:30`, `08:00` and tones `friend`, `mentor`, `future`, `diary`. Test next-local-calendar-morning UTC conversion, date boundaries and DST gaps/overlaps before enabling opt-in. Preference changes affect future jobs; edits invalidate old revisions. No production forced demo delivery.
3. Later enable reviewed Cron/HTTP extensions through migrations. Keep scheduler origin/`JOB_TRIGGER_SECRET` in its secret store and invoke `/api/v1/internal/jobs/process` on the independent API over HTTPS. Do not use a product user's token as scheduler privilege.
4. API owns processing and calls independent AI with its versioned service credential. Verify timeouts/batch/concurrency against measured host limits. Tests first use a fake independent AI HTTP service, never a production fallback; real service follows under the AI owner.
5. Observe retry/lease-expiry/fencing recovery, duplicate prevention and edit/delete during processing. Database finalization rechecks active owner, live revision/eligibility and fencing token. A fired schedule is not proof of completed or safe reflection delivery. Actions/memories remain explicit decisions, not automatic writes.

Schedulers target their own API/database/AI environments. Pause new claims during incompatible contract releases and resume only after verification. Deleting-profile denial is implemented, not a durable account-deletion endpoint. Account cleanup still needs durable retry before Auth deletion; future source cascades extend the implemented entry tombstones. Jobs/reflections/accepted todos/memory/voice remain unimplemented. Voice later adds private Storage/metadata/transcription jobs and separate consent/reviewed transcript; optional RAG needs owned source/deletion contracts. Entry deletion/no resurrection tests passed, but processing/interrupted account-cleanup tests remain future work. No AI encryption/perfect-safety guarantee is made. Secrets belong in secret stores, never migrations or example values.

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
