# Beyond

Private web, Android and iOS journaling app with Supabase Auth/Postgres and an independent product API. The designed pitch frontend now lives in the production workspaces. Production AI remains a separate, unimplemented service.

| Workspace         | Responsibility                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js marketing site, presenter and connected web app                                                 |
| `apps/mobile`     | Expo native app, encrypted sessions and native auth/API/export bridge                                   |
| `packages/app-ui` | Existing designed screens, CSS and shared React DOM app state                                           |
| `packages/shared` | Portable contracts and bounded authenticated API client                                                 |
| `apps/api`        | Journals, settings, approved memories, todos, privacy controls and durable reflection/account workflows |
| `services/ai`     | Reserved for the independent AI owner; no provider implementation                                       |

The pitch folder and its separate dependency lock/provider endpoints have been removed. Marketing previews and `?demo=1#/app` use explicitly fictional data. `#/app` uses real accounts and private APIs, with empty AI areas until that service is connected. The original styles, assets, fonts and presentation layouts are retained.

The non-AI text MVP includes sign-up/sign-in, Google OAuth handoff, password recovery, session refresh, server authorization, writing/editing/deletion, revision conflicts and safe retries, preferences, explicitly approved memory corrections, standalone and accepted-action todos, paginated exports, content clearing and optional durable account deletion. The backend supports consent, next-local-morning jobs, independent versioned AI HTTP handoff, bounded retries, lease fencing, letter storage/corrections and explicit action decisions. Writing always works independently of AI configuration.

See [the connected app milestone](docs/connected-app.md) for exact contracts, setup, privacy behavior, validation and remaining work. PR5 remains open. [Cloud setup](docs/cloud-setup.md) records the selected Supabase project, partial migration state and provider blockers; the web/API have not been deployed.

Use Node `24.20.0`, npm `11.19.0` and one root lockfile:

```sh
npm ci
npm run dev:api
npm run dev:web
npm run dev:mobile
```

Copy each workspace's `.env.example` to `.env.local` and fill in its own environment. Clients receive public Supabase keys and the API URL only. Configure Supabase Auth callback allowlists and exact API CORS origins. Native devices need a reachable HTTPS API. See [setup](docs/setup.md) and [deployment](docs/deployment.md).

```sh
npm run check:deps
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:design
npm run test:palette
npm run build:api
npm run build:web
npm run check:mobile
```

Real local acceptance requires Docker:

```sh
npm run db:start
npm run db:test
npm run build:api
npm run test:api:writing
```

CI also builds the configured website and runs real browser account/writing/privacy checks against local Supabase. JS exports are distinct from device/native build validation. Voice capture/transcription and analytics/Life Film remain later features; their production areas are empty. Packages are private and must not be published to npm.
