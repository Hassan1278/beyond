# Setup and commands

## Tools

Use Git, Node.js `24.20.0`, and npm `11.19.0`. `.nvmrc`, `packageManager`, and engine checks record these choices. Android emulator development needs Android Studio; the iOS simulator needs macOS and Xcode. Physical-device development and EAS cloud builds can be used without an iOS simulator.

Docker or a compatible container runtime is required only when running the local Supabase stack. Docker for the web app is optional and deferred until there is a runnable app. No Docker image, container, native project, or emulator has been created by this scaffold.

```sh
nvm install
nvm use
npm install --global npm@11.19.0
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

`npm ci` installs from the committed root lockfile without editing it. Use `npm install` when deliberately changing dependencies and commit the matching manifest and lockfile. Do not install from inside an app or create app-specific lockfiles.

## Commands

| Command                | Purpose                                    | Available now?                                         |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `npm ci`               | Reproducible dependency installation       | Yes                                                    |
| `npm run check:deps`   | Validate installed package/peer resolution | Yes                                                    |
| `npm run format:check` | Check supported config/docs formatting     | Yes                                                    |
| `npm run format`       | Format supported files                     | Yes                                                    |
| `npm run dev:web`      | Start website and API on port 3000         | After web entry points                                 |
| `npm run dev:mobile`   | Start Expo development server              | After mobile entry points                              |
| `npm run lint`         | Lint all workspaces                        | After ESLint configuration and source                  |
| `npm run typecheck`    | Type check all workspaces                  | After source exists                                    |
| `npm test`             | Run Vitest unit/integration tests          | After test configuration and real tests                |
| `npm run test:e2e`     | Run Playwright browser flows               | After app, Playwright config, and browser installation |
| `npm run build:web`    | Produce Next.js production build           | After source and web configuration                     |
| `npm run check:mobile` | Export Android/iOS JavaScript bundles      | After mobile routes; not a native build                |
| `npm run db:start`     | Start local Supabase containers            | Config present; requires Docker                        |
| `npm run db:stop`      | Stop local Supabase containers             | After local startup                                    |
| `npm run db:test`      | Run database access tests                  | After migrations and SQL tests                         |

Missing source and test files are expected at this stage. Commands for future phases are defined so the team agrees on their names; they have not been verified as app checks.

## Environment ownership

The root `.env.example` is an overview, not a combined configuration to copy. Web reads `apps/web/.env.local`. Expo reads `apps/mobile/.env`. Dashboard values must be set separately for deployed environments.

| Variable                               | Where                                 | Meaning                                                                   |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Web/browser                           | Supabase API URL                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web/browser                           | Public client key; access still requires RLS policies                     |
| `APP_URL`                              | Web/server                            | Canonical web origin for redirect/origin validation                       |
| `SUPABASE_SECRET_KEY`                  | Web/server                            | Restricted admin operations and job processing; never normal user queries |
| `AI_PROVIDER`                          | Web/server                            | Provider selected during AI implementation                                |
| `AI_API_KEY`                           | Web/server                            | Provider credential                                                       |
| `AI_MODEL`                             | Web/server                            | Model selected after fictional evaluations                                |
| `JOB_TRIGGER_SECRET`                   | Web/server and scheduler secret store | Credential for protected job invocation                                   |
| `EXPO_PUBLIC_SUPABASE_URL`             | Mobile                                | Supabase API URL                                                          |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Mobile                                | Public client key                                                         |
| `EXPO_PUBLIC_API_URL`                  | Mobile                                | Reachable web/API origin, without `/api`                                  |

All `NEXT_PUBLIC_` and `EXPO_PUBLIC_` values are exposed to clients. Blank values in examples are deliberate. Use Supabase's publishable and secret key formats; if a project uses legacy anon/service-role keys, map those roles deliberately and keep the privileged key server-side.

## Phones, authentication, and local data

`localhost` on a phone refers to the phone. Set the mobile API origin to a reachable computer LAN address or staging HTTPS origin. The web dev command listens on all interfaces for LAN access. Keep the phone and computer on a reachable network. If using local Supabase on a phone, its URL must also be reachable; a staging Supabase project avoids that local networking setup.

Web will authenticate with server-managed Supabase cookies; mobile will store sessions using secure storage and send bearer tokens. Configure web and mobile redirect URLs during the authentication task. The provisional deep-link scheme is `beyond`; provider login, callback handling, and session storage remain to be implemented.

`supabase/config.toml` configures a local project. Startup downloads containers; migrations and seeds remain empty. Use only fictional local data. Local Supabase instances in multiple worktrees need different ports or one deliberately shared development instance.

## First implementation checklist

The foundation owner adds app entry points, the shared export, Next.js shared-package transpilation, ESLint configuration, and Vitest/Playwright configuration. Next.js/Expo can then generate their environment declaration files locally. See `docs/build-plan.md` for acceptance checks.

References: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started), [Expo Router manual setup](https://docs.expo.dev/router/installation/).
