# Dependency inventory

> Current feature-branch status: [private backend milestone](product-api.md) supersedes the Step003 status and unimplemented-route statements below. Settings, approved memories, standalone todos, the shared client and optional durable account cleanup now exist on `feat/private-backend`. Writing and the pitch prototype were merged into `main` at `6ef74e9`. Earlier source/CI/authorization notes below are historical; current user authorization permits backend implementation, commits and feature-branch pushes. AI/reflection processing and undesigned frontends remain deferred.

The scaffold's versions were resolved from npm on 3 October 2026; direct dependencies are exactly pinned with one root `package-lock.json`. Step001 (`93e473b`) is historical architecture-only work; step002 established API/shared tooling and workspace lock integration. **Step003 implements non-opted-in writing without adding packages or changing root pins/overrides.** Node.js `24.20.0` / npm `11.19.0` and root-lock clean-install reproducibility are verified on Linux CI. Local Windows `npm ci` remains host-guard constrained, not a project-wide reproducibility blocker. No vulnerability audit is claimed; existing deprecations/non-failing warnings remain in main's `docs/backend-changes.txt`. Installed dependency code stays in ignored `node_modules/`, not the repository.

Expo SDK 57 dictates React `19.2.3`, React Native `0.86.3`, and compatible native module versions. Web uses the same React version to avoid unnecessary duplicate runtimes. TypeScript `5.9.3` satisfies both SDK 57 and the pinned EAS CLI's older config-loader peer range. The SDK template suggests TypeScript 6, but the repository uses a version compatible with the complete installed toolchain. Reassess newer TypeScript versions with a coordinated EAS/tooling upgrade.

ESLint `9.39.5` is a compatibility pin: the React plugin shipped by the selected framework configs currently declares support through ESLint 9. ESLint 9 has reached end of support; the foundation owner must reassess lint tooling before beta and move to a supported combination when the required plugins permit it. Do not force incompatible peers to select ESLint 10.

## Repository tools

| Package             | Version   | Kind        |
| ------------------- | --------- | ----------- |
| `@playwright/test`  | `1.63.0`  | Development |
| `@types/node`       | `24.19.1` | Development |
| `eas-cli`           | `24.10.0` | Development |
| `eslint`            | `9.39.5`  | Development |
| `prettier`          | `3.9.9`   | Development |
| `supabase`          | `2.119.0` | Development |
| `typescript`        | `5.9.3`   | Development |
| `typescript-eslint` | `8.71.0`  | Development |
| `vitest`            | `5.0.3`   | Development |

## Existing web workspace inventory (not the target API manifest)

These pins describe the unchanged `apps/web` scaffold, including legacy server dependencies. They do not imply a running combined web/API service. Independent API-only `apps/api` has its own manifest/config and implemented health/verified writing source, with root-lock workspace integration complete and pins unchanged. Do not remove/move web dependencies or edit either frontend in this documentation update.

| Package                 | Version   | Kind        |
| ----------------------- | --------- | ----------- |
| `@beyond/shared`        | `0.0.0`   | Runtime     |
| `@supabase/ssr`         | `0.12.7`  | Runtime     |
| `@supabase/supabase-js` | `2.117.2` | Runtime     |
| `next`                  | `16.3.8`  | Runtime     |
| `react`                 | `19.2.3`  | Runtime     |
| `react-dom`             | `19.2.3`  | Runtime     |
| `server-only`           | `0.0.1`   | Runtime     |
| `@types/react`          | `19.2.18` | Development |
| `@types/react-dom`      | `19.2.7`  | Development |
| `eslint-config-next`    | `16.3.8`  | Development |

## Existing API workspace

`apps/api/package.json` now defines `@beyond/api` with `@beyond/shared` `0.0.0`, `@supabase/supabase-js` `2.117.2`, Next.js `16.3.8`, React/React DOM `19.2.3`, and `server-only` `0.0.1`. Its development dependencies reuse `@types/react` `19.2.18`, `@types/react-dom` `19.2.7`, and `eslint-config-next` `16.3.8`. Step003 implements verified writing identity/persistence with these existing pins; library presence alone is not proof of any later feature.

API dev/start binds `127.0.0.1:3002`; backend scripts, Vitest, health smoke and writing acceptance exist. GitHub Actions run `37958461995` completed **SUCCESS** for source commit `b192bde`; both backend and real-database jobs passed. Linux CI verified clean root-lock `npm ci`, `npm run check:deps`, root `npm run format:check`, backend lint/types, **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), the normal repository production Next build and HTTP health, without a temporary root workaround. **123 pgTAP checks** and **15 real Auth/Postgres two-user groups** passed with identity/RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup. Body deadline/cancellation regressions passed. This success covers `b192bde`, not later changes or the final documentation-record commit, which is not yet created.

## Native mobile

| Package                          | Version   | Kind        |
| -------------------------------- | --------- | ----------- |
| `@beyond/shared`                 | `0.0.0`   | Runtime     |
| `@expo/metro-runtime`            | `57.0.16` | Runtime     |
| `@supabase/supabase-js`          | `2.117.2` | Runtime     |
| `expo`                           | `57.0.26` | Runtime     |
| `expo-constants`                 | `57.0.20` | Runtime     |
| `expo-dev-client`                | `57.0.19` | Runtime     |
| `expo-linking`                   | `57.0.11` | Runtime     |
| `expo-router`                    | `57.0.24` | Runtime     |
| `expo-secure-store`              | `57.0.4`  | Runtime     |
| `expo-splash-screen`             | `57.0.9`  | Runtime     |
| `expo-status-bar`                | `57.0.1`  | Runtime     |
| `react`                          | `19.2.3`  | Runtime     |
| `react-dom`                      | `19.2.3`  | Runtime     |
| `react-native`                   | `0.86.3`  | Runtime     |
| `react-native-gesture-handler`   | `2.32.0`  | Runtime     |
| `react-native-reanimated`        | `4.5.1`   | Runtime     |
| `react-native-safe-area-context` | `5.7.0`   | Runtime     |
| `react-native-screens`           | `4.26.0`  | Runtime     |
| `react-native-url-polyfill`      | `3.0.0`   | Runtime     |
| `react-native-web`               | `0.21.3`  | Runtime     |
| `react-native-worklets`          | `0.10.1`  | Runtime     |
| `@react-native/metro-config`     | `0.86.3`  | Development |
| `@types/react`                   | `19.2.18` | Development |
| `eslint-config-expo`             | `57.0.2`  | Development |

## Portable shared package

| Package | Version | Kind    |
| ------- | ------- | ------- |
| `zod`   | `4.6.5` | Runtime |

## Native dependency overrides

The root overrides keep optional transitive Reanimated/Worklets peers on SDK 57-compatible `4.5.1` / `0.10.1` and Metro configuration on React Native `0.86.3`. Metro configuration is also an explicit mobile development dependency for Worklets' peer requirement. This prevents npm from installing newer incompatible native runtimes or bundler tooling. Update these pins together with the SDK and mobile manifest.

## Install-script settings

npm 11 records install-script decisions in the root `allowScripts` field. The reviewed `protobufjs` metadata check and `unrs-resolver` native resolver setup are allowed at their pinned versions; the optional DTrace build is disabled. Review new or changed install scripts during dependency upgrades.

## Changes and deferred choices

Only the coordinator integrates root lockfile changes. Add a dependency to the workspace that imports it; portable validation belongs in shared, framework packages belong in each app, and repository tools belong at the root. Native modules must remain compatible with the Expo SDK.

Keep Node.js `24.20.0` / npm `11.19.0`, pins/overrides, root lockfile and frontend manifests unchanged. API/shared writing input/resource/cursor/output contracts and local profiles/entries/RLS/grants/RPC migrations/tests are implemented with existing dependencies; the shared API client remains deferred. API example is writing-only and fixed to local Supabase port `55321`; frontend examples remain legacy. Writing uses bearer/publishable credentials only, no API admin/AI/job keys or AI health. Jobs/reflections/accepted todos/memory/voice/durable account deletion remain unimplemented; deleting-profile denial is not a deletion endpoint. API/AI deploy/tests/environments remain independent; AI implementation/tooling/provider credentials belong to its owner, no DB admin keys.

No AI provider/model or provider SDK is selected/installed; future SDK/provider key belongs only to `services/ai`. Fake independent AI HTTP fixtures remain future tests, not production fallback. Real local writing fixture exists: run `db:start`, `db:test`, `build:api`, then `test:api:writing`; it guards local target/captures runtime keys without dotenv or committed secrets/cleans fixture users and server. Local Supabase ports API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489` without OS changes. Root `npm run db:start` now configures writing-only exclusions by default and is the restart command. Supabase Docker default `0.0.0.0` binds are local-dev only, never production. The Beyond local Supabase stack is stopped; auth fixture users `0`, local data preserved in a Docker volume. Unrelated `usthing` services are running and untouched; Docker Desktop remains running. Restart with `npm run db:start`. No reset/hosted changes. Feature-branch push/local Docker/backend work is authorized, not main overwrite/force-push, hosted DB/deploy/PR or cross-owner implementation. Browsers/native SDKs/EAS credentials are separate prerequisites; preserve SDK-compatible voice requirements rather than upgrade native pins here.

Record actual runtime, dependency validation and environment blockers in `docs/backend-changes.txt` for each step. The architecture commit changes no dependency pins; the already-authorized backend foundation must use the pinned toolchain and preserve frontend manifests.

References: [Expo SDK compatibility](https://docs.expo.dev/versions/latest/), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo Router setup](https://docs.expo.dev/router/installation/), [ESLint support](https://eslint.org/version-support/), [npm install-script settings](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).
