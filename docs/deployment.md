# Deployment runbook

This is a plan for future implementation. The scaffold has not created Vercel, Supabase, or Expo projects, configured hosting secrets, started services, run native builds, or deployed an app.

## Ownership and environments

Hassan owns the personal private GitHub repository and adds friends as collaborators. GitHub collaboration does not itself configure a hosting account or grant cloud-project access. Nominate a release owner and add cloud access only as needed.

Use a staging Supabase project plus a production project before real beta data. Vercel Preview points at staging; Production points at production. EAS development/preview profiles use staging public configuration; production uses production. Keep environment values out of Git.

## 1. Supabase database/auth

After initial migrations, policies, and tests exist:

1. Create staging, record its project reference, and configure auth providers/redirects.
2. From the repository root, run `npx supabase login`, then `npx supabase link --project-ref STAGING_PROJECT_REF`.
3. Review pending migrations using `npx supabase db push --dry-run`. Apply them to staging with `npx supabase db push` and verify the schema/policies with fictional users.
4. Generate database types into the shared package from the validated schema during implementation, then commit that generated source.
5. Add the public API URL and publishable key to client environments; place the privileged secret only in Vercel's server environment.
6. Configure web auth callback URLs and the tested mobile deep-link callback; match the actual callback path used by implementation. Keep staging redirects distinct from production.

Local testing uses the committed local config and Docker. Migrations are the source of truth; do not rely on undocumented dashboard schema changes. Production setup repeats the reviewed process with the production project reference and credentials.

## 2. Vercel website and Node.js API

The repository owner imports `Hassan1278/beyond` into Vercel. A collaborator on a personal repository cannot perform that initial import/connection. Choose a plan/account whose deployment rules support the intended commit authors and collaboration. Current Hobby rules restrict deployment authors, so do not assume every friend-authored preview will deploy automatically; verify this before making preview deployment a PR requirement. Hassan can own release commits, or the team can choose a supported shared plan.

Configure the project after web source builds successfully:

| Setting                               | Value                                            |
| ------------------------------------- | ------------------------------------------------ |
| Framework                             | Next.js                                          |
| Root Directory                        | `apps/web`                                       |
| Include source outside Root Directory | Enabled for `packages/shared`                    |
| Node.js major                         | 24.x; match the repository's supported Node line |
| Install command                       | `cd ../.. && npm ci`                             |
| Build command                         | `npm run build` (executed in `apps/web`)         |
| Output directory                      | Next.js default                                  |
| Production branch                     | `main`                                           |

Before deployment, implement `next.config.ts` with shared-package transpilation, app entry points, and Node.js route handlers. Configure the web `.env.example` variable inventory separately for Preview and Production; set `APP_URL` to the correct origin. Limit configured preview auth/cross-origin behavior deliberately.

Verify `/api/health`, web login, a user-scoped request, and a mobile bearer-token request from a physical device. Check runtime logs contain safe IDs rather than journal text. A public web URL still needs authenticated product endpoints.

## 3. Supabase reflection scheduler

Only after the protected processing endpoint and durable job primitives pass tests:

1. Enable the reviewed Cron and HTTP-request extensions in migrations; implement claim/finalize primitives and job indexes.
2. Keep the scheduler origin/credential in a Supabase secret store. Configure Cron to invoke the protected endpoint over HTTPS with the matching credential.
3. Set bounded batch size, timeout, retry policy, and monitoring based on measured generation time and current Vercel/provider limits.
4. Observe due-job processing, retry recovery, duplicate prevention, lease expiry, and edits/deletions while processing. A schedule firing is not proof that a reflection completed.

Staging and production schedulers target their own API/database environments. Stop new claims while performing a release that changes the processing contract; resume after compatibility is verified. Do not put scheduler credentials in migrations or example files.

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

Run the required app, database, and integration checks on the release commit. Apply backward-compatible migrations first, deploy the API next, and distribute mobile builds last. Old installed mobile clients must continue to work during rollout. Record the commit, migration versions, Vercel deployment, and EAS build IDs.

For a web regression, revert/redeploy the previous known-good app version after checking database compatibility. Prefer a reviewed forward migration for database fixes; never reset production as a rollback. Pause scheduling if processing is creating incorrect results. Native rollback usually means another binary; keep the backend compatible with older clients.

## Official references

- [Vercel Git deployment restrictions](https://vercel.com/docs/git)
- [Personal-repository import permissions](https://vercel.com/docs/git/vercel-for-github)
- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Cron HTTP invocations](https://supabase.com/docs/guides/cron/quickstart)
- [EAS with monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [EAS build profiles](https://docs.expo.dev/eas/json/)
