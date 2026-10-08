# Build plan

The user has already authorized architecture-first work followed by backend/environment implementation with small validated commits; no new implementation authorization gate is required. This plan describes the sequence, not completed implementation. Step001 adds no product implementation: no API app source, migrations, executable product tests, AI service or cloud setup. `apps/web` and `apps/mobile` remain untouched; their unused web API/server placeholders are legacy and are not removed. `services/ai` implementation belongs to its separate owner. Coordinate owned paths using `docs/workstreams.md`; hosted actions remain unauthorized.

## Gate 1: Independent API and writing proof

1. Freeze portable `/api/v1` contracts, health shapes, bearer/active-profile rules, replay/revision semantics and bounded payloads. Reserve `services/ai` for the AI owner. No provider selection is required for writing.
2. Under the existing backend/environment authorization, add API-only `apps/api` Next.js Node handlers and server modules, with its own environment/tests/deployment configuration. Coordinate new manifests/scripts and one root lockfile with integration; retain Node.js `24.20.0` and npm `11.19.0` and existing pins. Do not upgrade native packages or perform hosted actions.
3. Use real local Supabase Auth/Postgres. Supabase handles password/sign-in/reset/refresh; API product requests freshly verify bearer tokens and active profiles. Add profiles, entries and required schema primitives with RLS, grants and validated RPCs, not an API-only access assumption.
4. Implement text save/read/edit/delete, unique owner/key equality against a separately stored immutable original validated creation payload for live entries, expected revisions and replay tombstones that clear the original payload and all content/consent. Equivalent retries return current persisted state without reverting edits or duplicating jobs; different original payloads return `409`. Own retired keys return `409` before payload comparison; ordinary deleted-resource reads return `404`. Add cheap public `/api/health/live` and bounded config/DB-schema `/api/health/ready`, both without secrets; writing startup/readiness requires URL, publishable key and exact allowed origins, not optional later admin/job/AI credentials or AI reachability. Exact browser-origin CORS is not authentication; private responses are never cached.
5. Prove the flow with two users and real database/auth tests, including direct grants/RLS/RPC access, expired/invalid sessions, inactive profiles, equal/unequal replay, replay after edits/deletion and AI-down saves. Non-opted-in saves create no AI job.

Acceptance: writing works independently of AI, without frontend edits. Health/stub responses or fake database tests do not establish acceptance. Step001 adds no product implementation; `docs/backend-changes.txt` records actual validation and gate results.

## Gate 2: Scheduling and durable processing before AI

1. Add `reflection_jobs`, `reflections`, `approved_memories` and `todos` design primitives as needed. Entry plus eligible job is atomic only on explicit opt-in; ordinary saves remain independent.
2. Prototype tones are `friend`, `mentor`, `future`, `diary`; morning times are `07:00`, `07:30`, `08:00`, with an IANA timezone and UTC storage. Test the next-local-calendar-morning resolver, UTC/date boundaries and DST gaps/overlaps before enabling opted-in schedules. Preference changes affect future jobs; edits invalidate older revisions. No production forced demo delivery.
3. Implement bounded atomic claims, leases, fencing tokens, backoff/maximum attempts, lease-expiry/crash recovery and revision-unique jobs/output before first AI processing. Finalization must check active profile, live entry, current revision/eligibility and fencing token in the database.
4. Build the API-side authenticated HTTP client for `POST /v1/reflections:generate`: entry/revision/tone/bounded authorized context in, letter/actions/provenance out. AI credentials are versioned; provider credentials stay outside the API. Backend does not implement `services/ai`.
5. Use a fake independent AI HTTP service only in tests to prove downtime, timeouts, malformed output, duplicate/retry behavior, stale leases and edit/delete while processing. Never use it as a production fallback.

Acceptance: replay produces no duplicate jobs/output; stale workers cannot finalize or resurrect content; interrupted processing recovers. Lease/fencing/backoff/recovery cannot be postponed until after first AI processing.

## Gate 3: Real AI and explicit user decisions

The AI owner implements and independently tests/deploys `services/ai`, selects a provider/model only after fictional evaluations and retention review, and owns prompts/provider behavior. No database admin keys go to AI. Product API retains all database writes, queue orchestration, finalization and deletion.

Add explicit action acceptance/rejection and owned todos unique to each reflection suggestion; no auto-todos or auto-approved memories. Repeat acceptance returns the same surviving todo in its current state; explicit todo deletion preserves the acceptance decision while its source survives, and repeat acceptance then returns `409` without recreation. Keep corrections separate from original letters. Implement memory approval/removal and the proposed privacy-first source-deletion cascade for reflections, source-linked memories and derived todos; standalone todos survive unrelated entry deletion.

Implement an account deleting gate covering API, RLS/RPC and claim/finalize paths, with durable retry of product/storage/context cleanup before Auth deletion. Account deletion and provider/backups retention need later failure tests and honest disclosure; no end-to-end encrypted AI or perfect-safety guarantee.

Acceptance: real-service integration and fictional evaluations, explicit decision/replay/ownership tests including repeat acceptance after todo deletion, deletion during processing and interrupted account cleanup. These are acceptance requirements; `docs/backend-changes.txt` records actual validation.

## Gate 4: Voice as second core input

Voice follows the writing proof, not a native upgrade in this backend task. Add private Supabase Storage with owned media metadata, scoped policies and transcription job-kind support. AI owns transcription. Capture separate transcription consent; return a transcript for user review before feeding the same text-entry flow. Test isolation, expiry/retry, review and source/account cleanup. Optional RAG is added only with bounded user-scoped source/provenance and deletion contracts.

## Gate 5: Client integration and release validation

Separately authorize web/mobile work to migrate API origins, shared `/api/v1` paths and bearer adapters/environment examples. Do not remove legacy web API placeholders until that migration is owned and authorized. Later verify cross-client writing, reflections, actions, reviewed voice and deletion on real supported devices. Preserve native identifiers, EAS instructions and SDK-compatible pins; no UI or native package changes occur in this step.

Run two-user integration tests, Playwright flows, native preview builds, deep-link/session/network recovery, accessibility and fictional AI evaluations before beta. Full patterns/Life Film, broad attachments and custom native modules are outside this slice. Never fabricate counts or statistics, including in later analytics. Store submission is a later explicit release action.

## CI and merge progression

Existing scaffold checks are root `npm ci`, `npm run check:deps` and `npm run format:check`; consult `docs/backend-changes.txt` for actual validation. Foundation adds real API-specific lint/typecheck/test/build commands and an independent database job once source/migrations/tests exist. Coordinate script/CI changes rather than claiming those commands already exist. Use real local Supabase for auth/data acceptance and the fake independent AI HTTP service for API integration tests. AI-service tests/evaluations stay independent; live provider quota and deployments require explicit authorization.

Later frontend validation uses `npm run build:web`, `npm run check:mobile` and Playwright when their prerequisites exist. EAS milestone builds remain separate: JavaScript export is not proof of native signing/modules. Follow `docs/deployment.md` for cloud actions and rollback.

Finalize architecture first, portable contracts next, then independent API/writing foundation, durable scheduling tests and API-side AI integration under the already granted backend/environment authorization. Use task management, relevant local commands and small validated local commits within owned paths; step001 adds no product implementation. The main agent updates `docs/backend-changes.txt` with actual validation and blockers before committing. Do not turn a documentation-only review's execution limits into persistent workflow prohibitions. Frontend paths remain untouched, `services/ai` implementation belongs to its separate owner, and hosted pushes/PRs/deployments/database/account changes require separate authorization.
