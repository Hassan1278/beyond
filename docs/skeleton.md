# Repository structure

| Path                                               | Contents                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web/src/app`                                 | Next layouts/pages and PKCE callback                                 |
| `apps/web/src/site`, `presenter`, `data`, `styles` | Existing marketing/presenter/router assets and design                |
| `apps/web/public`                                  | Original icons/manifest and retirement worker                        |
| `apps/mobile/src/app`, `dom`, `connection.ts`      | Expo routes, shared DOM screen, native auth/API/export bridge        |
| `packages/app-ui/src`                              | Existing screens/components/styles plus demo and authenticated state |
| `packages/shared/src`                              | Portable input/output/AI handoff contracts and authenticated client  |
| `apps/api/src/app/api`, `server`                   | Independent API routes, transport/services and optional processors   |
| `supabase/migrations`, `tests`                     | Additive owned schema/RPC/privacy/session/job migrations and pgTAP   |
| `tests`                                            | Production HTTP/browser/local build and design acceptance harnesses  |
| `services/ai`                                      | Reserved separate implementation; no provider code                   |

There is one root package lock. The duplicated pitch folder and unused web backend placeholders are removed. [Connected app milestone](connected-app.md) lists current behavior and deferred work.
