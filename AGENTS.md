# Working in Beyond

## Context and phase

Read `README.md`, `docs/architecture.md`, `docs/api.md`, and the assigned task before editing. For backend architecture/environment work also read existing workstreams, build-plan, deployment, setup, skeleton, MVP scope, data-handling, dependencies and root `.env.example`. The user has already authorized architecture-first work followed by backend/environment implementation with small validated commits; no new implementation authorization gate is required. Step001 adds no product implementation: configuration and legacy placeholders exist, but no API app source, migrations, executable product tests or cloud setup are added by that documentation milestone. Do not interpret the target as runnable functionality. A narrower assigned task may restrict its own edits or execution without changing this continuing authorization.

## Boundaries

- Follow the task's owned paths in `docs/workstreams.md`. Ask the coordinator before changing another owner's paths or an agreed API contract.
- Supersede the all-in-one web API: target API-only Next.js Node handlers in `apps/api/src/app/api`, product services in `apps/api/src/server/services`, and API-owned queue/job orchestration in `apps/api/src/server/jobs`. `apps/web` and `apps/mobile` stay untouched in backend-only tasks. Existing unused web API/server placeholders are legacy, not running; leave them for their owners' migration.
- Reserve independent `services/ai` for the AI owner: prompts, providers, optional RAG/transcription. Backend defines the HTTP contract/client and test fixtures, not the AI implementation. API owns auth/RLS/database/queue/jobs/finalize/deletion; AI receives no database admin keys.
- Keep `packages/shared` independent of React, React Native, Next.js, Node-only modules, and privileged credentials. Keep one monorepo with separate service deployments, tests and environments.
- Both first-party clients use freshly verified Supabase bearer tokens plus active profiles for `/api/v1` product requests. Supabase owns passwords/sign-in/reset/refresh; no trusted owner ID. Exact browser-origin CORS is not authentication; private responses must not be cached. Frontend origin/auth/environment migration is a separate authorized follow-up.
- Import backend modules only from server code; apply `server-only` guards during implementation. Isolate API admin credentials to jobs/account operations; provider credentials belong only in AI.
- Enforce ownership through RLS, grants and validated RPCs, not an API-only assumption. Writing with real local Auth/Postgres and two-user replay/revision tests comes first; AI downtime cannot block saves. Atomic entry/job applies only to opt-in. Lease/fencing/backoff/recovery and a tested next-morning resolver precede AI processing/scheduling.
- Follow the documented minimal replay tombstone, source-linked memory/derived-todo cascade and durable account deleting gate. User action acceptance/rejection, memory approval and corrections are separate from generation. Voice is a later private-storage/reviewed-transcript proof with separate consent; RAG is optional. Do not promise end-to-end encrypted AI or perfect safety.

## Dependencies and configuration

- Use npm workspaces, Node.js `24.20.0`, npm `11.19.0`, existing dependency pins and one root lockfile. Run dependency commands from the repository root within the authorized task scope; task management and relevant local validation are part of the authorized workflow.
- Coordinate dependency additions and version upgrades with Hassan. Expo native dependencies must match the selected SDK; do not force or ignore peer dependency failures.
- Environment examples contain names and dummy values only. Never commit tokens, real journal content, signing credentials, or local `.env` files.
- `apps/mobile/app.json` contains provisional app identifiers. Confirm these with Hassan before registration or store builds.

## Branches and handoffs

- Use a separate clone or worktree and one task branch per coding session. Do not have concurrent harnesses edit the same checkout.
- Prepare small validated local commits with the behavior changed, actual validation, and cross-owner follow-up under the existing authorization. Maintain the requested plain-text `docs/backend-changes.txt`; the main agent records actual validation and blockers before committing. Do not log emails, secrets, code, invented tests or commit hashes.
- Hosted actions are not authorized by this local backend/environment workflow: do not push to shared branches, open hosted PRs, deploy, change hosted databases/accounts/permissions, or invite collaborators without separate authorization.
- Document contract changes and dependency changes with the same deliverable. Avoid unrelated edits and broad refactors.

## Validation

Existing scaffold checks: `npm ci`, `npm run check:deps`, `npm run format:check`. Step001 adds no product implementation and is not a runtime acceptance result. `docs/backend-changes.txt` is the record of actual commands, validation results and environment blockers; do not treat session-specific execution restrictions as repository-wide rules.

Foundation work adds API-specific lint/typecheck/test/build commands, real source and real local Supabase tests; AI HTTP service checks are independent. Do not claim those commands/tests exist before implementation. Run relevant available checks under the existing authorization and report unavailable prerequisites. Frontend owners run `npm run build:web` or `npm run check:mobile` when their separately authorized changes affect those apps. Coordinate corresponding CI steps when ready. Do not hide missing tests with success placeholders or report a JS export as proof of a native build.

For every handoff, state what changed, checks run, checks unavailable, and remaining dependencies. Use fictional content for tests and AI evaluations.
