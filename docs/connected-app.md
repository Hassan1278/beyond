# Connected app milestone

This branch combines the frontend merged through PR4 with the private backend in PR5. The integration checks and implementation are described below. A subsequent authorized cloud setup created the selected Supabase project and applied the first two migrations; [cloud setup](cloud-setup.md) records the exact state and blockers. Web/API deployment and PR5 merge remain pending.

## Repository and design

`apps/web` contains the marketing site, hash routing, QR/presenter and Next production entry points. `packages/app-ui` contains the existing app screens, typography, CSS and shared controller. `apps/mobile` embeds those screens through Expo DOM components with native authentication, SecureStore, API requests and file sharing. This preserves the supplied design across clients; it is a DOM/WebView UI inside an Expo native app. A future full React Native widget rewrite is a separate design/implementation decision.

The original pitch source/assets were moved and its isolated package/lock, duplicated provider endpoints and deployment configs removed. Production AI areas stay empty. Explicit `?demo=1#/app` preserves the fictional presenter rehearsal; production `#/app` never substitutes fictional history or generated results.

## Accounts and product APIs

Supabase handles passwords, email confirmation/recovery, OAuth, refresh and session revocation. Web callbacks exchange a PKCE code once and scrub it from the URL. Native callbacks use the installed `beyond` scheme, validate the callback target and exchange the code without exposing credentials to the DOM screen. Callback URLs/provider credentials must be configured before these flows work on a hosted deployment.

Every product call verifies the bearer with Auth, checks an active profile, and reaches owner-derived RLS/validated RPCs. Database reads and RPCs also require a live, owned `auth.sessions` row from the verified JWT's `session_id`. Signing out a session therefore prevents that still-unexpired JWT from reading private data: fresh Auth rejection returns401, and the independent database session gate also denies access. Local logout immediately clears app state, blocks stale refresh callbacks and erases only this app's stored credentials. If network logout fails, the UI reports that server revocation could not be confirmed; local erasure is still attempted.

Journals, preferences, approved memories and todos use the contracts in [product API](product-api.md) and [writing API](api.md). The shared client binds every request to the acting account and bounds token acquisition, HTTP and response consumption. Account switches cancel outstanding requests and prevent late responses from restoring old content. Lost creates reuse their original key/payload before applying newer edits. Preference writes queue against the latest revision. Production journal text has no local persistence or service-worker cache.

| Route                                    | Behavior                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/v1/account`                    | Active status and configured optional feature capabilities                              |
| `DELETE /api/v1/account/data`            | Recent-sign-in content clear, retains Auth account and retired creation keys            |
| `GET /api/v1/account/export?section=…`   | Recent-sign-in pages of settings, entries, memories, todos or reflections; up to50/page |
| `DELETE /api/v1/account`                 | Optional202 durable account deletion                                                    |
| `POST /api/v1/internal/accounts/process` | Independent fenced account cleanup worker; see product API                              |

Export pages are current live resources, not a consistent cross-page snapshot. No export copy is stored on the server. Browser/device downloads are user-owned copies; later account deletion cannot remove them. Client export is bounded to10000 rows and32MB of serialized page data; larger accounts need a future streamed export. Text content clearing scrubs original/current payloads and linked AI content, resets preferences and retains only content-free idempotency tombstones until account deletion. API quotas are600 reads/180 mutations per user per60seconds, independent across windows/operations;429 includes `Retry-After:60`.

## Non-AI reflection framework

Saving writing does not grant AI consent: entry creation and the legacy automatic-reflection settings flag remainfalse. A separate explicit request grants consent for a particular saved entry revision. API requests are disabled until the independent service and worker credentials are configured. No AI provider, prompt, model, transcription or production generation is included.

| Route                                       | Behavior                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST /api/v1/entries/:id/reflection`       | `{consent:true,expected_revision}` atomically creates/replays a job for owned live text     |
| `DELETE /api/v1/entries/:id/reflection`     | Cancel permission/job and remove the letter/derived tasks                                   |
| `GET /api/v1/reflections`                   | Paged owned letters; empty while no real results exist                                      |
| `GET /api/v1/reflections/:id`               | Owned letter, actions, provenance and correction                                            |
| `PATCH /api/v1/reflections/:id`             | `{text,expected_revision}` records an explicit correction                                   |
| `POST /api/v1/reflections/:id/actions`      | `{action_id,decision}`; accepted or rejected, one current todo per accepted action          |
| `POST /api/v1/internal/reflections/process` | Trigger-authenticated batch1..5; claims leases, calls independent service and fences commit |

Scheduling uses the next **local calendar day**, including entries written before today's morning, with IANA zones and07:00/07:30/08:00. PostgreSQL resolves nonexistent civil times by shifting forward and overlaps to the later instant. Timezone/time/voice changes apply to future requests; scheduled jobs retain that preference snapshot. Jobs receive at most five attempts,60-second leases and bounded exponential backoff. Crashed/expired workers recover; stale lease tokens cannot read or commit content. Terminal failed jobs require cancelling and a fresh explicit request. No accelerated production delivery is provided.

The backend calls authenticated `POST <AI_SERVICE_URL>/v1/reflections` with:

```json
{
  "version": 1,
  "request_id": "job UUID",
  "entry": { "id": "entry UUID", "revision": 1, "text": "fictional input" },
  "voice": "friend",
  "memories": [],
  "corrections": []
}
```

Inputs contain only the consented current entry, at most20 explicitly approved memories unless paused, and at most5 owned explicit prior corrections. Pausing memory excludes both kinds of historical context. They contain no database/admin keys. Service input contracts bound content to70000 UTF-16 units plus metadata; the AI owner should accept a bounded256KB JSON request. Output must match job ID and entry revision and contain version1, a five-part letter (`greet/said/rec/step/sign`, each <=5000 units), <=5 distinct UUID/title actions, and bounded `model/prompt_version` provenance. `packages/shared/src/schemas/reflections.ts` is authoritative. Response consumption is bounded to128KB/25seconds. Malformed, mismatched, unreachable or timed-out responses retry durably; there is no production fictional fallback.

Only a fenced commit can store results. It serializes against product privacy mutations, verifies live source revision/active account/context, and clears its lease. Edits/deletion revoke old jobs and remove linked letters/tasks. Memory changes/pause revoke queued work and remove results derived from that context. Removing a source correction also removes dependent letters/tasks. Corrections revoke queued context so a running response cannot return old information. Standalone todos remain independent. AI suggestions never automatically approve memories or create todos. Accepted actions return the surviving current todo on retry; an explicitly deleted todo cannot be resurrected by acceptance replay.

The designed letter UI reads these resources, accepts/rejects actions and records corrections. Consent controls appear only when configured. Pattern/Theme/Wrapped views stay empty for real accounts because analysis is deferred; fictional marketing/presenter views retain the supplied design.

## Configuration and checks

See workspace environment examples and [deployment](deployment.md). Optional workers use different trigger secrets and run on an authenticated external scheduler; merely enabling a flag is insufficient deployment setup. Migration/readiness catalog checks include session enforcement, reflection RLS/private grants and worker privileges. All new migrations are additive; existing historical migrations are untouched.

CI runs clean root installs/dependency/format/lint/types, backend and frontend units, all original design renders/map/feed/palette checks, web/API production builds, Android/iOS JavaScript exports and real local Supabase pgTAP/HTTP/browser acceptance. Tests use fictional users/service fixtures, not a provider. See the PR checks for the tested head. Local embedded Postgres tests are supplementary and do not replace real Supabase acceptance.

## Remaining work

- The AI owner implements and deploys the versioned independent service, generation/safety/provenance/retention policy and realistic evaluation. Configure/verify its secrets and reflection scheduler afterward.
- Finish the remaining migrations in the selected Supabase project, deploy web/API, configure email delivery/confirmation/reset URLs, enable Google provider callbacks, exact CORS and public client environments. Enable/test account cleanup only after its scheduler is running. See [cloud setup](cloud-setup.md) for applied migrations and current provider errors.
- Build/install and test Android/iOS on devices: DOM sizing/keyboard, encrypted storage, browser redirects/recovery, background refresh and file sharing. The existing bundle identifiers remain provisional; confirm them before registration/store release.
- Voice capture, private media Storage, separate transcription consent, reviewed transcript UI and transcription service are a later feature. No audio is recorded/uploaded; Speak is disabled in the production text MVP. This is additional work, not just a missing model key.
- Patterns/themes/Quarterly Wrapped/Life Film need real analysis contracts and population. Their real-user areas remain empty and keep the supplied design. Offline sync, notifications, billing and social features remain outside this MVP.
- Optional later improvements include streamed consistent exports and a full native-widget frontend if required. JavaScript exports do not prove native/device acceptance.
