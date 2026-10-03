# Dependency inventory

Versions were resolved from the npm registry on 3 October 2026. Direct dependencies are pinned exactly; the root `package-lock.json` records the full dependency tree. Installed dependency code stays in ignored `node_modules/`, not in the repository.

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

## Web and Node.js API

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

No AI provider SDK is installed yet because the provider is an implementation decision. Use a provider adapter and add the selected SDK in the web workspace when that task begins. Playwright browsers, local Supabase container images, native SDKs, and EAS signing/store credentials are separate setup items; npm installation does not provision them.

References: [Expo SDK compatibility](https://docs.expo.dev/versions/latest/), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo Router setup](https://docs.expo.dev/router/installation/), [ESLint support](https://eslint.org/version-support/), [npm install-script settings](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).
