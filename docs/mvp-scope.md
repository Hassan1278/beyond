# MVP scope

Target one writing-first product across web, Android and iOS, with independent API and opted-in delayed AI reflections. Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input/unit tooling. **Step003 implements non-opted-in backend writing, not the full MVP.** Frontends/unused legacy backend placeholders and AI-owner implementation remain untouched; no cloud setup is claimed.

## Current implemented writing slice

- Fresh bearer verification and active profile every call, exact-origin CORS/preflight/no-store; writing uses no API admin credentials.
- Entries GET/POST and `/:id` GET/PATCH/DELETE; strict input/resource/cursor schemas, immutable-original replay returning current edit `200`, atomic expected revisions/conflict `409` and cleared-content tombstones. DELETE `200` `{ data: { id } }`; deleted/other-owner `404`.
- Public active/deleting profiles/Auth trigger/backfill; entries active-own-live RLS, private original/key column grants and authenticated validated RPCs with empty search path/active-profile lock.
- Real catalog-checking `api_schema_ready`, configured readiness `200` tested; no AI-health prerequisite or AI/job table. Creation opt-in is literal `false`.
- Text <=20000 UTF-16 units preserving whitespace/valid Unicode, canonical limit 1..100/default20 and positive-year UTC-microsecond base64url cursor. Body 128000-byte/total-5000-ms deadline and cancellation regressions passed final validation.

Final checks passed: **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), lint/types and body deadline/cancellation regressions. Production Next build passed dynamic health/entries routes in an isolated fresh mirror; a temporary Turbopack root adjustment for the shared dependency junction affected only that mirror, not repository Next config. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked identity, RLS/grants, races, replay/tombstones/paging/deleting-profile denial and fixture-user/server cleanup; **123 pgTAP** passed. Main owns the log. Separate real-DB CI and feature-branch push triggering are implemented; remote execution/clean `npm ci` remain unverified. Pins unchanged, no package addition or vulnerability-audit claim.

## Acceptance order

1. **Text writing — implemented, final local checks passed:** real Supabase Auth/Postgres writing, expanded unit/lint/types/body regressions, production health and mirror build passed independently of AI and without UI edits. Clean-install and remote CI verification remain open. Run `db:start`, `db:test`, `build:api`, then `test:api:writing`; local-only guard/runtime key capture without dotenv/committed secrets and fixture-user cleanup are required.
2. **Safe opt-in jobs — unimplemented:** extend contract for atomic opted-in entry/eligible job. Test next-local-calendar-morning UTC/IANA/date/DST resolver for `07:00 | 07:30 | 08:00` and tones `friend | mentor | future | diary`. Preference changes affect future jobs, edits invalidate old work. Bounded claims/leases/fencing/backoff/recovery precede AI processing.
3. **Independent AI HTTP — unimplemented:** backend failure fixtures first, never production fallback; AI owner implements service/provider later. Versioned authenticated generation takes entry/revision/tone/authorized context and returns letter/actions/provenance, no DB admin keys or automatic product writes.
4. **Explicit decisions — unimplemented:** reflections/corrections, accept/reject unique todos, repeat surviving current todo or `409` after explicit deletion, separate memory approval/removal. Source cascades remove linked reflections/memories/derived todos, not standalone todos.
5. **Durable account cleanup and voice — unimplemented:** implemented deleting-profile denial is not account-deletion endpoint. Add durable cleanup retry before Auth deletion and interrupted tests. Voice needs private Storage/owned media/transcription jobs, separate consent and reviewed transcript into text flow.
6. **Client integration/release — unimplemented:** separately authorize origins/bearer/shared `/api/v1` client/env migration. Verify cross-client loading/empty/errors/expiry/core behavior and real native previews. Preserve identifiers/EAS/SDK-compatible pins; JS export is not native-build proof.

All gates need meaningful tests, not fake success. API/frontend/AI deploy/tests/environments are separate in one monorepo/root lockfile. Public health is dependency-free live and bounded DB-schema ready, not AI readiness. Exact CORS is not auth; no private caches. A future explicitly enabled fictional accelerated rehearsal cannot replace morning/DST/durability tests or force production delivery.

## Local safety and authorization

Local Supabase ports API `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489`; ports changed, not OS settings. Root `npm run db:start` configures writing-only exclusions by default and is the restart command; the API env sample is fixed to `55321`. Docker defaults bind `0.0.0.0`: local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet. No reset/hosted change required. Feature-branch push/local Docker/backend work are authorized, not main overwrite/force-push, hosted DB/deploy/account/PR or frontend/AI-owner work.

## Deferred / optional

Full patterns/Life Film, social/shared journals, billing, offline sync, complex notifications, broad attachments, multiple providers and custom native modules are outside this slice. Never fabricate analytics/statistics. Voice is a later core proof, RAG optional with owned bounded source/provenance/deletion contracts. Store submission needs explicit release authorization; optional app Docker packaging is distinct from the already-used local Supabase containers.

## Settled design and future choices

Writing input/resource/cursor/output/replay/revision/tombstone rules are implemented; the shared API client remains deferred. See API. Freeze remaining AI/context/output bounds, DST policy, decision conflicts, credential rotation/version, provider/model/retention and first beta platform with owners before enabling those features. No subscription/cloud/store registration here. No end-to-end encrypted AI/perfect-safety claim; separate transcription consent and user review remain required.
