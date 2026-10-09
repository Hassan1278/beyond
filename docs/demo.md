# Demo plan

This is a future cross-client rehearsal, not a completed product demo. Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input/unit tooling. **Step003 implements backend non-opted-in writing.** Frontends/legacy backend placeholders remain untouched. Writing resource/output contracts are implemented; the shared API client and frontend bearer integration remain deferred. `services/ai` is reserved for its owner; no provider is selected.

Final local checks passed: **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), lint/types and body 128000-byte/total-5000-ms deadline/cancellation regressions. Production Next build passed dynamic health/entries routes in an isolated fresh mirror; its temporary Turbopack root adjustment for the shared dependency junction did not change repository Next config. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked tokens, RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup; **123 pgTAP** passed. Main owns the log. Separate real-DB CI and feature-branch push triggering are implemented; remote execution/clean `npm ci` remain unverified. Pins unchanged, no package addition.

## Backend writing rehearsal available now

Use `db:start`, `db:test`, `build:api`, then `test:api:writing`: local-target guarded, runtime key capture without dotenv/committed secrets, fixture users only and user/server cleanup. Demonstrate current-resource `200` creation/replay after edit, expected-revision `409`, DELETE `200` ID-only and deleted/other-owner `404`, cleared-content tombstones and no resurrection. Writing stays literal `false` opt-in; no AI/job table or AI-health prerequisite. Direct DB `P0001` HTTP `400` is not product `404`/`403`/`409` mapping and never exposes wrong-owner content. Deleting-profile denial is not durable account deletion.

Local API/Auth `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489` with no OS changes. Root `npm run db:start` now configures the writing-only exclusions by default; use it to restart after main's planned shutdown. Shutdown has not happened yet. Docker Supabase defaults bind `0.0.0.0`: local-dev only, never production. Do not reset any stack or use real/hosted data for this local proof.

## Future cross-client rehearsal

Only after owners implement/validate the required interfaces and durable feature gates, use fictional staging accounts/content:

1. Open website and installed Android/iOS preview; sign in as the same fictional user.
2. Save on one interface and read/edit on the other; show current replay and revision behavior.
3. Show explicitly opted-in pending state only after next-morning UTC/IANA/date/DST and lease/fencing/backoff/recovery tests. Explicitly enabled accelerated fictional staging rehearsal never replaces those checks or forces production delivery; fake AI HTTP is tests only, not production fallback.
4. Read/correct reflection separately from original letter; explicitly accept/reject a suggestion, show unique owned todo and repeat current todo/`409` after deletion behavior.
5. Explicitly approve/remove memory and confirm absence from future context.
6. Delete entry/pending work without late output/replay resurrection; future source-linked memories/derived todos cascade, unrelated standalone todos remain.
7. Show second user's inability to read first user's content.
8. Demonstrate durable account cleanup only after endpoint/retry/interruption tests exist; current deleting-profile denial is not that proof.

Voice is later private Storage/owned media/transcription-job proof with separate consent and reviewed transcript into text flow. Optional RAG needs owned source/provenance/deletion contracts; full patterns/Life Film remain deferred and statistics must never be fabricated. No end-to-end encrypted AI/perfect-safety claim.

Prepare screen recording for unreliable networking only once rehearsal exists. Record actual tested commit, independent API origin, service/native build IDs and known gaps, never invented demo results. Preserve native identifiers/EAS/SDK pins; no UI/native/AI-owner edits in backend docs tasks. Feature-branch push/local Docker/backend work are authorized, not main overwrite/force-push, hosted DB/deploy/account changes or PR creation. Hosted/staging/native release work needs separate authorization. Actual validation/commit outcomes/session blockers belong in main's existing log.
