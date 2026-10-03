# Workstreams and coding harnesses

Use the same repository, task briefs, contracts, and acceptance checks regardless of each friend's coding tool. A harness is the terminal, IDE, or cloud coding environment an owner uses; it is not a separate repository or backend. Tool choice is independent of work ownership.

## Suggested ownership

| Lane                        | Human owner                                    | Owned paths                                                                                          | First implementation result                                                                       |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Integration / shared        | Hassan or nominated coordinator                | Root config/lockfile, `packages/shared`, `.github`, cross-team docs                                  | Freeze health/API contracts, portable shared exports/client, lint/test config, merge coordination |
| Web                         | Friend A                                       | `apps/web/src/app` excluding `api`, `apps/web/src/components`, `apps/web/src/lib`, `apps/web/public` | Web shell → auth → journal UI calling shared API                                                  |
| Mobile                      | Friend B                                       | `apps/mobile`                                                                                        | Expo shell → secure auth → matching journal UI; Android/iOS preview builds                        |
| API / database / deployment | Friend C with Hassan for cloud account actions | `apps/web/src/app/api`, `apps/web/src/server` excluding `ai`/`jobs`, `supabase`, deployment docs     | Health, auth/ownership, schema/RLS, entry CRUD, job database primitives, staging setup            |
| AI / jobs                   | Friend D                                       | `apps/web/src/server/ai`, `apps/web/src/server/jobs`, `evals`                                        | Provider adapter, validated reflection output, durable processing/retry orchestration             |
| Product / QA / demo         | Friend E                                       | `tests`, MVP/demo docs, task acceptance notes                                                        | Fictional two-user fixtures, cross-client flow checks, browser E2E, beta/demo feedback            |

These are proposed owners, not invitations or assignments already made. With fewer people, combine integration + API/deployment, and AI + QA; keep web and mobile distinct if possible. One mobile lane owns both Android and iOS because they share the Expo codebase.

Workspace manifests/tsconfigs and root dependency changes remain coordinated, even where an app folder has an owner. Web and API share `apps/web`, so their ownership split is by subfolder. QA coordinates API/service test files placed beside implementation with those owners.

## Start sequence

1. Hassan assigns human owners and creates a task brief using `docs/tasks/TEMPLATE.md`.
2. Integration and API owners agree on health response, request/error shapes, auth, data revisions, limits, and job claim/finalize interfaces. Merge the first shared contract/config PR.
3. Web/mobile owners create app shells in parallel against those agreed contracts. API/database owner implements the corresponding endpoints; AI/jobs owner uses a mocked provider/claim interface until upstream pieces land.
4. QA defines acceptance scenarios early, then adds executable tests as real flows become available.
5. Merge small PRs with explicit upstream dependencies. Integrate one feature across web + mobile + backend before widening scope.

The scaffolding phase does not authorize implementation by itself. These tasks are ready for the team's implementation kickoff; no coding sessions, branches, issues, or harness jobs have been started here.

## Separate sessions safely

Each friend uses their own clone. If one developer runs several harnesses locally, give each session a different worktree and branch. Do not point several sessions at `/home/hassan/projects/beyond` concurrently.

For example, once the foundation contract is merged:

```sh
git fetch origin
git worktree add ../beyond-web -b feat/web-shell origin/main
git worktree add ../beyond-mobile -b feat/mobile-shell origin/main
git worktree add ../beyond-api -b feat/api-foundation origin/main
```

Run `npm ci` separately in each worktree. Keep local environment files out of Git and configure each session's working directory explicitly. Multiple dev servers need different ports. Use one agreed local Supabase instance or configure independent ports; do not have unrelated sessions reset a shared database.

## Task prompt to use in any harness

Copy this text into the chosen tool and replace its fields:

> Work in branch `<branch>` in checkout `<path>`. Read `AGENTS.md`, `docs/architecture.md`, `docs/api.md`, `docs/build-plan.md`, and task `<task brief>`. Implement only `<owned paths>` to deliver `<observable result>`. Follow the merged shared contracts and pinned dependencies. Coordinate changes to another owner's paths, root manifests, lockfile, migrations, or contracts before editing them. Use fictional data. Run the relevant available checks and report their results, unavailable checks, and remaining dependencies. Prepare a small pull request; deployment and account changes follow the assigned release task.

Starter task scopes after contract kickoff:

- **Web:** Create the root layout/homepage and shared health-client integration. Add basic loading/error states. Own web UI paths only; coordinate Next.js config with integration.
- **Mobile:** Create router layouts and first screen, import shared client, and call the same health endpoint. Confirm physical-device networking. Own mobile source/assets; coordinate manifest changes.
- **API/database:** Create health and verified identity boundaries, initial schema/RLS, and two-user tests. Agree on atomic entry/job and claim/finalize interfaces with AI. Own API/database paths.
- **AI/jobs:** Define provider input/output contracts and fictional evaluation scenarios first; then implement generation, lease/retry handling, and stale/deleted-entry checks using the merged database interface.
- **QA:** Define the login/save/read/delete and two-user scenarios; implement tests once corresponding source exists. Record real platform results and known gaps.
- **Integration/shared:** Implement portable types/schemas/client and coordinated config/CI, review API compatibility, integrate dependency changes, and verify cross-client behavior.

## PR and handoff rules

Use names such as `feat/web-journal`, `feat/mobile-journal`, `feat/api-entries`, `feat/reflection-jobs`, or `test/journal-flow`. The branch name describes one deliverable. Pull requests name the owner, upstream contract/PR, actual checks, and follow-up needed.

Only the coordinator merges dependency changes to the root lockfile. Feature owners propose needed packages rather than independently upgrading React/Expo. Rebase against merged contracts regularly, keep changes small, and let another human review access, deletion, and credential-related changes. Add branch protection/rules only after Hassan confirms the desired policy and available GitHub plan; none has been assumed here.
