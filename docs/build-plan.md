# Build plan

This is the implementation sequence after the code-free scaffold. Durations are planning estimates, not promises. Assign human owners using `docs/workstreams.md`; parallel client work starts after the shared contract handoff.

## Stage 1: Foundation — first 1–2 working days

1. Hassan assigns owners and confirms API shapes, product limits, schedule semantics, and provisional native identifiers.
2. The integration/shared owner adds the portable shared export, health response type, API client, schemas, ESLint configuration, and test configuration. They add Next.js shared transpilation and coordinate app entry points with the UI owners.
3. The web owner creates root layout/homepage; the mobile owner creates router layouts and the first screen. Both call the same health endpoint.
4. The API/database owner implements the health route, verified session boundary, initial schema/RLS, and local access tests.
5. Hassan connects staging Supabase and Vercel, configures public/server environment values, and checks web/mobile against the staging origin. The mobile owner links EAS and creates the first development build when routes work.
6. Enable CI lint, type checks, real tests, web production build, and Android/iOS JS export as prerequisites land. Add a separate database test job once migrations and access tests exist.

Acceptance: both interfaces launch, both can import shared code, both call the same deployed health endpoint, current checks run in CI, and two-user ownership tests pass. Do not merge a feature as complete based only on a stubbed response.

## Stage 2: Core flow — week 1

Implement authentication, entry CRUD, initial reflection generation/read view, and session/error recovery. The backend persists an entry and job atomically. The AI owner uses a provider adapter and validated output; unit tests use a fake provider. The UI owners consume the same typed contracts.

Use a short staging schedule to exercise the complete pipeline. Deliver an installable preview build for the first beta platform and verify it against the staging API. Confirm a journal entry saved on one interface appears on the other.

Acceptance: login → save entry → process durable job → read reflection works on web and mobile. User A cannot read or mutate user B's content. Repeated requests do not create duplicate jobs/output. Failed generation has a visible, recoverable state.

## Stage 3: Complete MVP — week 2

Implement user-selected delayed schedules/timezone handling, explicit memory approval/removal, corrections, settings, source deletion, and account deletion. Add bounded claims, leases, retry backoff, maximum attempts, and stale-revision checks. Match core behavior across web and mobile.

Acceptance: edited/deleted entries invalidate old work, in-flight generation cannot recreate deleted content, removed memories are excluded from later processing, corrections remain distinct from the original letter, and account deletion completes safely after partial failures.

## Stage 4: Validation — weeks 3–4

Run beta feedback sessions, two-user integration tests, Playwright flows, real Android/iOS preview builds, and explicit fictional AI evaluations. Verify networking, deep links, expired sessions, pending/failed states, accessibility, logs, and rate limits. Rehearse `docs/demo.md` and prepare store assets/privacy text when behavior is stable.

Acceptance: agreed MVP flows pass on the supported platforms; release notes record tested commits/build IDs and known gaps. Store submission is a later explicit release action.

## CI progression

Current workflow: root `npm ci`, `npm run check:deps`, and `npm run format:check`.

Foundation adds, in order of prerequisites: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:web`, `npm run check:mobile`. Once the database/tests exist, start local Supabase in a dedicated job and run its access tests. Add Playwright with installed browsers and a controlled app/test database. Native EAS builds run at milestones; JS export does not validate signing or native modules.

Live AI evaluation and production deployment are explicit release steps, not automatic operations on every pull request. PR checks use fictional data and mocked providers. Production database migrations use the deployment sequence in `docs/deployment.md`.

## Merge order

Merge shared contracts/configuration first, then the app shells and API foundation. API/database and AI/jobs agree on claim/finalize operations before implementing the processor. Web/mobile can work against agreed fixtures during backend development, then replace them with the real API before claiming acceptance. Each feature PR names its upstream dependency and integration check.
