# Data handling

This is the authorized privacy/security design target, not implemented guarantees. This documentation-only step adds no API source, migrations, executable tests, storage provisioning or cloud setup. Journals, reflections, approved memories, todos and future voice media are personal data.

## Identity and data boundaries

- Both first-party clients send verified Supabase bearer tokens to the independent `apps/api` `/api/v1` product API. Supabase handles password/sign-in/reset/refresh. The API freshly verifies tokens and active profiles and derives ownership; no trusted payload owner IDs or cookie-based product auth assumption.
- Require user-scoped database access, RLS, grants and validated RPCs on every user-data table and operation. Direct DB/RPC access must enforce ownership, active/deleting gates and tombstone exclusion, not merely rely on API checks. Test with real local Supabase Auth/Postgres and two users.
- Browser CORS permits exact configured origins and is not authentication. Private product responses are `no-store` and never shared/CDN/framework cached. Public liveness is cheap; readiness is bounded config/DB-schema only, independent of AI and without sensitive details. Detailed dependency/queue status is protected and deferred.
- API owns auth/database/queue/jobs/finalization/deletion. Isolate its privileged Supabase secret to narrow jobs/account operations, never normal queries. The independent AI service owns prompts/provider calls and optional RAG/transcription and receives no DB admin keys. Provider keys belong only to AI.
- Send only entry/revision/tone and bounded owner-authorized context over the versioned authenticated AI HTTP contract. Validate letter/actions/provenance before product finalization. No automatic todos or memory writes; suggestions require separate explicit acceptance/rejection or memory approval. Corrections do not overwrite the original letter.
- Removing approved context excludes it from future generation. Optional RAG requires user-scoped source authorization, provenance, retention/removal and deletion contracts before use; define how in-flight work is invalidated or revalidated if an authorized source is removed.
- Keep prompts, media, transcripts, results, tokens, emails and secrets out of routine logs, analytics, change logs, fixtures and issue descriptions. Use safe request/job IDs and error categories, with fictional content for tests/demos/evaluations.
- Mobile secure-storage/session lifecycle review belongs to the mobile owner. No UI edits, native upgrades or frontend environment edits are authorized here.

## Save, scheduling and replay

Writing-first acceptance uses real local Auth/Postgres save/read/edit/delete and two-user replay/revision tests. AI downtime cannot prevent ordinary saves. Only explicitly opted-in entry plus eligible job is atomic; no job for a non-opted-in save. Test leases/fencing/backoff/recovery before first processing, and recheck active owner, live source revision/eligibility and fencing token at database finalization.

Use unique owner/idempotency key. LIVE entries store the immutable ORIGINAL validated creation payload separately from mutable fields and use it alone for creation equality. Equivalent retries return the CURRENT persisted entry state without reverting edits or duplicating jobs; different original payloads return `409`. Edits leave the original payload unchanged and invalidate older revision jobs. Check an owner's retired key before payload comparison: reuse always returns `409`. Deletion clears the original payload and all content/consent, retaining only minimum IDs, owner/key and `deleted_at` as a replay-prevention tombstone. Ordinary deleted-resource reads return `404`. Product APIs, RLS visibility and RPC resource results exclude tombstones; internal retired-key checks reveal no content.

UTC storage and IANA timezone settings use prototype tones `friend`, `mentor`, `future`, `diary` and morning choices `07:00`, `07:30`, `08:00`. Opted-in next-local-calendar-morning scheduling remains disabled until UTC/date/DST resolver tests exist. Preference changes apply to future jobs; edits invalidate old revisions. No forced production demo delivery.

## Proposed privacy-first deletion contract

Entry deletion cancels work, clears the original creation payload and all entry content/consent, and removes dependent reflections, source-linked approved memories and reflection-derived todos. Unrelated standalone todos remain. Schema relationships and transactional/RPC checks must enforce the cascade; no late generation/transcription response may recreate content. Retain only minimum IDs, owner/key and deletion time in the replay tombstone, never original text, creation payload, generated content, consent or media references. Explicit deletion of an accepted-action todo preserves its acceptance decision while its source survives: repeat acceptance returns `409`, never a recreated todo; otherwise repeat acceptance returns the same surviving todo.

Account deletion first durably gates the profile as deleting and rejects product operations, direct user DB/RPC access, claims and finalization. A durable, idempotent cleanup workflow retries product data, jobs, future Storage/media and any optional indexed context cleanup before deleting Supabase Auth. Define retention/expiry of minimal replay metadata consistently with final account cleanup. Do not delete Auth first and lose the ability to finish cleanup. No runtime account-deletion tests exist or ran at this step.

Before beta, document actual hosted backup retention and the selected provider's retention/training/deletion limits; no provider is selected. Do not promise instantaneous removal from backups/provider systems, end-to-end encrypted AI processing or perfect safety. AI output remains fallible and subject to user review.

## Later voice input

Voice is the later second core input proof: private Supabase Storage, owned media metadata and scoped storage grants/policies, plus transcription jobs using lease/fencing/retry/deletion controls. Transcription consent is separate from reflection consent; send only consented media to AI. A user-reviewed transcript enters the same text-writing flow, not an automatically saved/approved memory or todo. Define upload limits, temporary authorized access, retention and source/account cleanup before enabling voice. No media schema, buckets or transcription implementation is created here.

## Environments and validation plan

Keep local/staging fictional data separate from production. API, frontends and AI have separate environments, deploys and tests in one monorepo. Writing requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and exact `CORS_ALLOWED_ORIGINS`; writing startup/readiness requires no AI credentials or reachability. Optional later config is validated only for enabled features: isolated `SUPABASE_SECRET_KEY` for jobs/account operations, `JOB_TRIGGER_SECRET` for protected job invocation, and `AI_SERVICE_URL`/versioned `AI_SERVICE_TOKEN` for AI processing. AI alone holds provider credentials. Frontend examples remain legacy and require a separately authorized migration; do not populate their old server-key slots. Revoke exposed credentials rather than relying on repository privacy.

Planned tests: real bearer/active-profile and two-user RLS/grants/RPC isolation, no private caching, exact CORS, save during AI downtime, replay/revisions/tombstones, stale-fenced finalization, context removal and source deletion during processing, explicit decisions/unique todos, interrupted account cleanup, and later consent/private-media/reviewed-transcript isolation. A fake independent AI HTTP service is a test fixture only, never a production fallback. No runtime results are claimed by this document.
