# Build plan

The combined branch implements the non-AI **text MVP** and the backend interface/lifecycle for the separate AI service. See [connected app milestone](connected-app.md) and the combined PR checks for current validation.

| Gate                 | Current behavior / remaining work                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private text product | Auth/session/ownership, writing CRUD/revisions/retries, preferences, approved memories, todos, export/clear/account cleanup and connected clients implemented                                       |
| Reflection backend   | Explicit consent, next-local-calendar-morning jobs, leases/fencing/backoff/recovery, independent HTTP contract, stored letters/corrections and action decisions implemented with fictional fixtures |
| Original frontend    | Pitch source split into web/mobile/shared folders; design retained; real states/loading/errors and empty AI areas implemented                                                                       |
| Independent AI       | AI owner must implement/deploy/evaluate providers/generation/safety/provenance/retention; no production provider work here                                                                          |
| Deployment           | Hosted migrations, Auth email/Google callbacks, origins/environments and authenticated worker schedulers need provisioning/verification                                                             |
| Native acceptance    | Android/iOS JS export gate plus real device/native-build/keyboard/auth/storage/sharing QA before release                                                                                            |
| Later features       | Voice capture/private media/transcription/review, real patterns/Wrapped, notifications and offline sync remain separate work                                                                        |

CI gates clean root install/dependency/format, lint/types/units, design renders/map/feed/palette, API/web builds, Android/iOS JS exports, pgTAP, real HTTP and real browser/Supabase acceptance. No provider is invoked. A passing code milestone does not configure/deploy hosted resources or prove native hardware acceptance.
