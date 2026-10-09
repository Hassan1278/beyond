# Data handling

Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input/tooling. **Step003 implements and locally tests non-opted-in writing isolation/replay/deletion.** Future AI/jobs/source cascades/account cleanup/voice below remain design targets, not product guarantees. Frontends/legacy placeholders and AI implementation are untouched; no cloud setup is claimed. Journals, reflections, approved memories, todos and future voice media are personal data.

## Implemented writing boundaries

- Writing calls freshly verify Supabase bearer tokens and active profiles, deriving owner from verified identity. Supabase owns password/sign-in/reset/refresh; payload owner IDs, cookies and decoded claims alone are not product auth.
- Public active/deleting profiles have Auth trigger/backfill. Entries RLS reads only active own live rows; user grants cannot read private original creation payload/key columns. Authenticated validated `entry_create/update/delete/get/list` RPCs enforce input/owner/liveness with empty security-definer search path and active-profile lock.
- Normal writing uses publishable key plus verified user token, no API admin credentials. Direct DB/RPC cannot return wrong-owner content. Direct PostgREST `P0001` is HTTP `400`; product `not_found`/`forbidden`/`conflict` map safely to `404`/`403`/`409`, without revealing resource existence.
- Exact-origin browser CORS/preflight is implemented, not authentication. All private responses are no-store, never shared/CDN/framework cached; native callers need tokens too.
- Public live is dependency-free. Ready validates writing config and actual catalog-checking `api_schema_ready` within 1500 ms, successful boolean `true` only; configured `200` was tested. Health is minimal/no-store with no secrets/schema/user details and no AI prerequisite.
- Creation requires explicit literal `false` opt-in: no AI/job table or sending journal data to AI. Strict text <=20000 UTF-16 units preserves whitespace/valid Unicode and rejects blank/NUL/unpaired surrogates. Body 128000-byte/total-5000-ms limits and expanded stream/abort/deadline/cancellation regressions passed final validation.
- Writing resource/output contracts are implemented; resources expose only ID/text/revision/false opt-in/UTC created/updated, not owner/key/original payload. Canonical limits and positive-year exact UTC-microsecond cursors are specified in API. The shared API client remains deferred.

Keep content, prompts, media/transcripts/results, tokens, emails and secrets out of routine logs/analytics/change logs/issues. Use safe request/job IDs/error categories and fictional test/demo/evaluation content. Mobile secure-storage/session review is separately owned; backend does not edit frontend/native/AI-owner implementation.

## Replay, revision and entry deletion

Unique owner/key is enforced under concurrent creates. Live retries compare only private immutable original validated creation payload; equivalent replay returns **current edited resource `200`**, never reverting text or duplicating work. Different original payload returns `409`; PATCH atomically checks expected revision/increments it and stale writes conflict. Original payload is not mutable/user-readable.

Retired owner/key reuse returns `409` before payload comparison. Entry deletion sets original payload, text, consent, revision, created_at and updated_at to SQL `NULL`, retaining only minimum IDs, owner/key and `deleted_at`. DELETE success is `200` `{ data: { id } }`; deleted/other-owner resources return `404`. RLS/ordinary reads/RPC resources exclude tombstones, and replay guards reveal no deleted content. Entry deletion/no resurrection has been tested.

No dependent AI/job/memory/todo tables exist yet. Later opted-in saves require atomic eligible job and tested UTC/IANA next-local-calendar-morning scheduling (`07:00 | 07:30 | 08:00`, tones `friend | mentor | future | diary`, date/DST boundaries). Preference changes affect future jobs; edits invalidate old work. Before AI processing test leases/fencing/backoff/recovery and DB finalization rechecks active owner/live revision/eligibility/fence. No production forced demo delivery.

## Future AI and context boundaries

API owns future queue/finalization/deletion and isolates privileged Supabase keys to narrow jobs/account operations, never writing. Independent AI owns prompts/providers/optional RAG/transcription, no DB admin key or direct product writes. Provider credentials belong only in AI; no provider/model is selected.

Versioned authenticated AI HTTP takes entry/revision/tone/bounded owned authorized context and returns validated letter/actions/provenance. No automatic todos or memory approval. Acceptance/rejection and memory approval are explicit; corrections stay separate from original letter. Removing context must exclude it from future generation and invalidate/revalidate affected in-flight work. Optional RAG needs owned sources/provenance/retention/removal/deletion contracts first. AI client/fake independent HTTP fixture are future work; fixture is tests only, never production fallback.

## Future source cascade and durable account cleanup

Implemented entry deletion clears content/minimizes tombstones. Proposed future cascades cancel jobs and remove dependent reflections, source-linked memories and reflection-derived todos; unrelated standalone todos remain. DB relationships/transactions must enforce cleanup and reject late generation/transcription resurrection. Accepted todo deletion retains its decision while source survives; repeat acceptance returns `409`, otherwise the surviving current todo.

**Deleting-profile denial is implemented, not a full account-deletion endpoint.** Later durable cleanup must gate product/direct user DB/RPC/claim/finalize, retry owned product/jobs/Storage/media/indexed context cleanup and only then delete Auth. Define minimal replay-metadata retention/expiry with final cleanup. Do not delete Auth first and lose cleanup ability. Interrupted account-deletion tests remain unimplemented.

Before beta document actual hosted backup and selected-provider retention/training/deletion limits. Do not promise instantaneous backup/provider removal, end-to-end encrypted AI or perfect safety; AI is fallible and needs review.

## Later voice input

Private Storage, owned metadata/scoped policies and transcription jobs use the same lease/fencing/retry/deletion controls. Transcription consent is separate from reflection consent. Send consented media only; user reviews transcript before text writing, not automatic memory/todo. Define upload bounds/temporary access/retention/source/account cleanup before enabling voice. No media/bucket/transcription implementation exists.

## Environments and actual validation

Separate local/staging fictional data from production and API/frontend/AI environment scopes. Writing needs URL/publishable key/exact origins only, no admin/AI/job credentials or reachability. Future feature-boundary config validates isolated account/jobs secret, job trigger and AI HTTP credentials only when enabled. Never populate legacy frontend server-key slots; owners must separately migrate examples. Revoke exposed credentials rather than relying on repository privacy.

Local ports API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489` by changing ports, not OS settings. Root `npm run db:start` configures writing-only exclusions by default and is the restart command; the API env sample is fixed to `55321`. Supabase CLI Docker defaults bind `0.0.0.0`: local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet. No resets/hosted changes. Feature-branch push/local Docker/backend work are authorized, not hosted DB/deploy/main overwrite/PR/frontend/AI-owner actions.

Final checks passed: **536 unit tests across 9 files**, including **216 writing and 20 output-contract tests**, lint/types and body-bound/deadline/cancellation regressions. Production Next build passed dynamic health/entries routes in an isolated fresh mirror; a temporary Turbopack root adjustment for the shared dependency junction was mirror-only, not a repository Next config change. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked identity, RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup; **123 pgTAP** passed. `db:start`, `db:test`, `build:api`, then `test:api:writing` uses local-target guard/runtime keys without dotenv/committed secrets and fixture users only. Main owns the log. Separate real-DB CI and feature-branch push triggering are implemented; remote execution/clean `npm ci` remain unverified. Pins unchanged, no package addition or vulnerability-audit claim.

Remaining tests cover jobs/stale-fenced finalization, context/source deletion during processing, explicit decisions/unique todos, interrupted account cleanup, consent/private media/reviewed transcript and cross-client flow. Passed writing tests do not imply these future privacy guarantees.
