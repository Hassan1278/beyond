# Deployment and rollback

This task creates reviewable feature work, not a hosted deployment. Read [connected app milestone](connected-app.md) for tested behavior and remaining features.

Deploy `apps/web` and `apps/api` as separate Node/Next projects from the monorepo root, using the root npm lockfile. Build commands are `npm run build:web` and `npm run build:api`; workspace Next output lives under the corresponding app. Preserve workspace transpilation in their Next configs.

1. Review/merge the combined PR after its checks pass. Provision the intended Supabase project and API/web hosts separately.
2. Apply the additive Supabase migrations in order through the approved deployment process. Verify `/api/health/live` and `/api/health/ready` (see API route files), including the catalog RPC. Readiness is database schema/access readiness, independent of AI reachability.
3. Configure API Supabase URL/public key and exact `CORS_ALLOWED_ORIGINS`. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` **before building** web. Configure corresponding Expo public variables before exporting/building native. No admin, worker or AI token is public.
4. Configure Supabase email confirmation/delivery/reset/site URLs, web/native PKCE allowlists and Google provider credentials. Test sign-up, email confirmation, password recovery, Google, refresh, sign-out and revoked-token denial on the actual deployment.
5. Account deletion stays disabled until its backend secret and independent trigger bearer are set and an authenticated scheduler calls `POST /api/v1/internal/accounts/process`. Test202 deletion, interrupted cleanup recovery and final Auth/product removal before enabling its UI capability.
6. Reflections stay disabled until the AI owner implements the versioned service and its evaluations pass. Set the service URL/token, a separate reflection trigger secret and backend secret, and schedule `POST /api/v1/internal/reflections/process`. Test timezone/calendar delivery, failures, leases, deletion/context revocation and accepted-action replay before enabling `REFLECTIONS_ENABLED=true`.
7. Build/install Android/iOS development/release candidates through Expo EAS after confirming identifiers/signing. Verify real devices, keyboard/sizing, deep links/recovery, SecureStore, background refresh and exports. JavaScript exports are a separate preliminary check.

Schedulers must send the appropriate trigger bearer with no browser Origin. They need only bounded JSON limits; do not log private bodies, authorization headers, access tokens or provider outputs. Keep admin credentials isolated from ordinary user-scoped routes and the independent AI service. Trigger tokens and AI service tokens should be independently generated and rotated.

The supplied mobile design uses Expo DOM components inside a native WebView. Keep the DOM bridge limited to the defined auth/API/export actions and disable arbitrary Expo-module access. Native/browser auth sessions are stored differently; journal contents are never offline cached. The old pitch service worker is retired and removes only Beyond's cache.

Rollback web/API through the hosting provider to a known compatible revision. Disable optional reflection processing/consent first if the service is failing; ordinary writing remains independent. Do not blindly reverse destructive database migrations or reset a project. Existing migrations are additive and older data survives; compatibility and pending jobs must be reviewed against the chosen rollback version. Durable account deletions must keep their cleanup worker active until requested deletions finish.

Voice/media/transcription, analysis/Wrapped, notifications and store release are outside this deployment milestone. No hosted credentials, migrations, account configuration, schedules or native releases were changed by this task.
