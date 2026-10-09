# Workstreams and coding harnesses

Use one monorepo, shared contracts and acceptance gates regardless of harness. Step001 (`93e473b`) is historical architecture-only work; step002 established health/configuration/input schemas/unit tooling. **Step003 implements non-opted-in writing**: bearer/active-profile checks, entries CRUD/resource/cursor contracts, profiles/Auth trigger/backfill, RLS/grants/validated RPCs and real schema readiness. Frontends/legacy web backend placeholders and `services/ai` remain untouched.

Final checks passed: **536 unit tests across 9 files** (including **216 writing and 20 output-contract tests**), lint/types and body-limit/deadline/cancellation regressions. Production Next build passed dynamic health/entries routes in an isolated fresh mirror; its temporary Turbopack root adjustment for the shared dependency junction left repository Next config unchanged. Production unconfigured health passed `200`/`503`. Real Auth/Postgres passed **15 two-user groups** covering signed expired local/forged/revoked identity, RLS/grants, races, replay/tombstones/paging/deleting-profile denial, configured readiness `200` and fixture-user/server cleanup; pgTAP **123** passed. Main owns `docs/backend-changes.txt`. Root pins/overrides unchanged, no package addition. Separate real-DB CI and feature-branch push triggering are implemented; remote execution and clean `npm ci` remain unverified.

## Suggested ownership

| Lane                        | Human owner                     | Owned paths                                                           | Current / next result                                                             |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Integration / shared        | Hassan or nominated coordinator | Root config/lockfile, shared, CI, cross-team docs                     | Writing resource/output contracts + CI implemented; shared API client deferred    |
| Web                         | Hao                             | `apps/web` frontend                                                   | Separately authorized auth/journal independent API client migration               |
| Mobile                      | Hao                             | `apps/mobile`                                                         | Expo auth/journal client and Android/iOS previews; preserve native conventions    |
| API / database / deployment | Hassan for cloud actions        | `apps/api`, `supabase`, API acceptance tests, backend/deployment docs | Writing/final local checks passed; next durable jobs/finalization/account cleanup |
| AI service                  | Kyle/Gatik                      | `services/ai`, `evals`, independent AI tests                          | Unimplemented versioned HTTP generation/evaluations; optional RAG/transcription   |
| Product / QA / demo         | Peter                           | `tests`, MVP/demo docs, acceptance notes                              | Real writing checks passed; later durable AI/decisions/client acceptance          |

These are proposed human owners, not invitations/assignments. Combine lanes only without blurring authority. Coordinator owns contract/root-dependency integration; keep Node.js `24.20.0`, npm `11.19.0`, SDK-compatible native pins and one root lockfile.

Backend does not edit frontends or implement `services/ai`. Legacy `apps/web/src/app/api` and `apps/web/src/server` placeholders are unused, not running backend services; their removal and web/mobile origin/bearer/shared-client/env migration require separate owner authorization.

## Authority and handoffs

- Implemented writing API freshly verifies bearer/active profile, derives owner, uses user-scoped DB without admin credentials and no-store/exact-origin CORS/preflight. Supabase owns password/sign-in/reset/refresh. RLS/grants and authenticated validated RPCs independently enforce the boundary; security-definer writing RPCs have empty search path and active-profile lock.
- Writing compares live retries to private immutable original creation payload; equivalent replay returns current resource `200`, different original/retired key `409`. Revisions increment atomically. Tombstones NULL original/text/consent/revision/created/updated and retain minimum IDs, owner/key and `deleted_at`; DELETE returns `{ data: { id } }`, deleted/other-owner `404`. Direct PostgREST `P0001` HTTP `400` differs from product not_found/forbidden/conflict `404`/`403`/`409`; DB never returns wrong-owner content.
- Creation stays literal `false` opt-in: no AI/job table or AI-health prerequisite. Text is nonblank <=20000 UTF-16 units, whitespace preserved, no NUL/unpaired surrogates. Resource/cursor and canonical limit rules are in API. Body 128000-byte/total-5000-ms deadline and cancellation regressions passed final validation.
- API owns future queue/leases/fencing/backoff/recovery/finalization/deletion. AI owns prompts/providers and optional RAG/transcription behind versioned authenticated HTTP; no DB admin keys or automatic todos/memories. Backend AI client/fake HTTP fixture remain future work, never production fallback.
- Accepted-action decisions/todos, corrections, memory approval and source cascades remain unimplemented. Repeat acceptance must return surviving current todo, `409` after explicit deletion. Proposed source cascades leave unrelated standalone todos.
- Deleting-profile denial is implemented, not a durable account-deletion endpoint. Later cleanup needs durable retry before Auth deletion. Voice needs private Storage, separate consent and reviewed transcript; optional RAG needs owned provenance/deletion. No AI encryption/perfect-safety promise.

## Start sequence and acceptance gates

1. Final step003 unit/lint/types/body regressions, mirror production build, health and real DB checks passed; main records actual outcomes in the log. Docs-only delegates edit only assigned existing docs, without commands or log changes.
2. Writing acceptance order: `npm run db:start`, `npm run db:test`, `npm run build:api`, `npm run test:api:writing`. The local-only runner captures runtime keys without dotenv/committed secrets and cleans fixture users/server. Root `db:start` now configures writing-only exclusions by default and is the restart command. API port/sample `55321`, DB `55322`, Mailpit `55324`, Studio `55323` configured but not started avoid Windows exclusions `54290..54489` without OS changes. Docker default `0.0.0.0` binds are local-dev only, never production. Main will stop the stack before final handoff; shutdown has not happened yet. No resets/hosted changes.
3. Test UTC/IANA next-local-calendar-morning/date/DST resolution before opt-in; prototype times `07:00 | 07:30 | 08:00`, tones `friend | mentor | future | diary`. Add atomic opted-in entry/job, leases/fencing/backoff/recovery before AI. No production forced demo delivery.
4. Test API-side AI HTTP failure/stale-finalization fixtures; AI owner implements real service later. Add explicit decisions/unique todos, separate corrections and memory approval/removal/deletion.
5. Add durable account cleanup and voice proof, then separately authorized client migration/native release. Full patterns/Life Film are deferred; never fabricate statistics.

## Separate sessions safely

Use one clone/worktree and task branch per session, never concurrent harnesses editing a checkout. Guidance only; execution/results belong in main's log:

```sh
git fetch origin
git worktree add ../beyond-web -b feat/web-shell origin/main
git worktree add ../beyond-mobile -b feat/mobile-shell origin/main
git worktree add ../beyond-api -b feat/api-foundation origin/main
```

Install from each worktree root; keep env files out of Git. Use distinct service ports and an agreed local Supabase instance or independent ports; do not reset another owner's DB.

## Future harness prompt

> Work in branch `<branch>` in checkout `<path>`. Read `AGENTS.md`, architecture/API/build-plan/workstreams and task `<task brief>`. Backend/environment implementation, relevant local checks, small validated commits, feature-branch push and local Docker/backend work are authorized. Implement only `<owned paths>` for `<observable result>`. Preserve implemented step003 writing, portable contracts, pins and independent API/AI boundaries; leave frontend and AI-owner implementation untouched. Coordinate cross-owner/manifest/lockfile/schema/contract changes. Use fictional data and report actual results/missing checks/dependencies. Main maintains the backend log and final current validation. No main overwrite/force-push, hosted DB/deploy/account actions or PR creation without separate authorization if needed. Honor narrower task limits without making them repository-wide prohibitions.

## PR and release conventions

Use deliverable branches such as `feat/api-entries`, `feat/reflection-jobs`, `test/journal-flow`. Handoffs name owner, upstream contract/PR if any, actual checks and follow-ups. Existing WSL GitHub credentials are verified for read/push; Windows credentials remain unavailable. Remote `main` advanced to `2c9fa7e`, beyond the original base. Feature-branch push is authorized but not claimed yet; no automatic main merge/overwrite/force-push or PR creation. Coordinator integrates root dependencies/lockfile; do not upgrade React/Expo independently or bypass peers. Keep changes small, obtain auth/deletion/credential review and preserve old-client release compatibility. Deploy/cloud accounts/permissions/branch protection/native release need Hassan's separate authorization.
