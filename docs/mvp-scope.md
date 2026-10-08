# MVP scope

The target is one consistent writing-first product across web, Android and iOS, with an independent API and opted-in AI reflections. This documentation-only backend step implements none of the flows: no API app source, migrations, executable tests or cloud setup. Frontends and their unused legacy web API/server placeholders remain untouched.

## Acceptance order

1. **Text writing first:** real local Supabase Auth/Postgres save/read/edit/delete with two users, replay/creation equality, expected revisions, cleared-content replay tombstones and ownership tests. Both clients will use bearer tokens; API freshly verifies identity and active profiles, with RLS/grants/validated RPCs. AI downtime must not prevent saves. No frontend edits are required for the backend proof.
2. **Safe opt-in jobs before AI:** only explicitly opted-in entry plus eligible job is atomic. Test next-local-calendar-morning resolution using UTC storage, IANA timezone, morning times `07:00`, `07:30`, `08:00` and tones `friend`, `mentor`, `future`, `diary` before enabling scheduling. Preference changes affect future jobs; edits invalidate old revisions. Bounded claims, leases/fencing, backoff and crash recovery must exist before first AI processing.
3. **Independent HTTP generation:** backend tests use a fake independent AI HTTP service, never a production fallback. AI owner later implements real `services/ai`; no provider/model is selected. Versioned authenticated `POST /v1/reflections:generate` takes entry/revision/tone/bounded authorized context and returns letter/actions/provenance. API owns all DB writes/queue/finalization/deletion; AI gets no DB admin keys.
4. **Explicit decisions:** read reflections; keep user corrections separate from generated letters; accept/reject suggestions explicitly and create owned todos unique to accepted suggestions. No automatic todos/memories. Explicitly approve/remove memories. Source deletion follows the proposed privacy-first cascade for reflections, source-linked memories and derived todos; standalone todos remain.
5. **Deletion and second core input:** durably gate deleting accounts and retry owned product/storage/context cleanup before Auth deletion. Voice is the later second input proof: private Supabase Storage, owned metadata and transcription jobs, separate consent and user-reviewed transcript into the same text flow. No UI edits/native dependency upgrades are authorized here.
6. **Client integration/release:** later separately authorize independent API-origin, bearer, `/api/v1` client and frontend env-example migration. Test loading/empty/errors/expired sessions and the same core behavior on supported clients/native previews before beta.

All gates need meaningful tests, not fake success responses. API-only `apps/api`, frontend and AI service deployment/tests/environments are separate within one monorepo/root lockfile. Public health is `/api/health/live` and bounded config/DB-schema `/api/health/ready`, independent of AI and without secrets; protected dependency/queue status is later. Exact browser CORS is not authentication; no private response caching.

A fictional local/staging accelerated rehearsal may be explicitly enabled only after durable scheduling/recovery gates; it does not validate next-morning semantics. No production forced demo delivery, phone timers or post-response background work as durability guarantees.

## Deferred / optional

Full patterns and Life Film, social/shared journals, billing, offline synchronization, complex notifications, broad attachments, multiple providers and custom native modules are outside this slice. Later analytics must use actual authorized data; fake counts are never acceptable. Voice is a later core proof, not a generic attachment feature. RAG is optional and requires bounded user-scoped source/provenance and deletion contracts if added. Store submission follows beta and explicit release authorization; Docker packaging is optional after services launch.

## Settled design and remaining implementation choices

Settled here: separate API/AI ownership and deploys, first-party bearer product auth, writing-first gates, prototype tone/morning options, replay/revision/tombstone semantics and proposed privacy-first source cascades. Before enabling features, freeze payload/context limits, exact DST gap/overlap policy in the tested resolver, suggestion decision conflicts, credential version/rotation, provider/model/retention and first beta platform with their owners. No subscription/cloud/store registration happens here. Do not claim end-to-end encrypted AI or perfect safety; transcription consent is separate and outputs need review.
