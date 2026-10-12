# Dependency inventory

Node24.20.0/npm11.19.0, exact workspace pins and one root lockfile. Install/check from the root with `npm ci` and `npm run check:deps`; never force peer resolution.

The existing React19.2.3, Next16.3.8, Expo57.0.26/React Native0.86.3 and Supabase2.117.2 pins remain. The standalone prototype's incompatible duplicate React/lock and provider SDK are removed. Marketing QR uses its original qrcode1.5.4. Shared UI uses the existing workspace React/Supabase versions. Vite8.3.4/plugin-react6.1.2/jsdom30.1.2 moved into root test tooling for original design/controller checks.

Mobile additions match Expo's SDK57 bundled module inventory: `@expo/dom-webview`57.0.1, expo-web-browser57.0.3, expo-file-system57.0.7, expo-sharing57.0.22 and expo-crypto57.0.3. They preserve the supplied DOM design, handle native OAuth/export and provide cryptographic PKCE primitives. SecureStore remains the existing SDK pin. JavaScript bundle export does not prove native installation/device behavior.

No AI SDK/provider library is required by the connected backend. It uses a bounded independent authenticated HTTP contract. Repository package files and the root lockfile are authoritative for every exact pin. Dependency resolution checks are not a vulnerability audit; routine deprecation/non-failing tool warnings may remain.
