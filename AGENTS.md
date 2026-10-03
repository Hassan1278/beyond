# Working in Beyond

## Context and phase

Read `README.md`, `docs/architecture.md`, `docs/api.md`, and the assigned task before editing. The repository currently contains configuration and planning only. The initial setup request excludes application code, SQL, tests, and assets; a subsequent explicit implementation task can authorize those files. Do not interpret the initial scaffold as an already runnable app.

## Boundaries

- Follow the task's owned paths in `docs/workstreams.md`. Ask the coordinator before changing another owner's paths or an agreed API contract.
- Keep UI in app components, HTTP handlers in `apps/web/src/app/api`, business rules in `apps/web/src/server/services`, and AI/job work in their server folders.
- Keep `packages/shared` independent of React, React Native, Next.js, Node-only modules, and privileged credentials.
- Web and mobile share API contracts and validation. Do not create a second backend in the mobile app.
- Import backend modules only from server code; apply `server-only` guards during implementation.
- Treat authentication, ownership, row-level security, job retries, and deletion as part of the feature, not optional polish.

## Dependencies and configuration

- Use npm workspaces, the pinned Node/npm versions, and one root lockfile. Run dependency commands from the repository root.
- Coordinate dependency additions and version upgrades with Hassan. Expo native dependencies must match the selected SDK; do not force or ignore peer dependency failures.
- Environment examples contain names and dummy values only. Never commit tokens, real journal content, signing credentials, or local `.env` files.
- `apps/mobile/app.json` contains provisional app identifiers. Confirm these with Hassan before registration or store builds.

## Branches and handoffs

- Use a separate clone or worktree and one task branch per coding session. Do not have concurrent harnesses edit the same checkout.
- Open small pull requests with the behavior changed, actual validation, and any cross-owner follow-up.
- Do not push implementation directly to `main`, deploy, change hosted databases, or invite collaborators as part of a local coding task unless that task authorizes it.
- Document contract changes and dependency changes in the same pull request. Avoid unrelated edits and broad refactors.

## Validation

Current checks: `npm ci`, `npm run check:deps`, `npm run format:check`.

Foundation tasks add ESLint/test configuration and real source. After those are available, run relevant lint/type checks and meaningful tests, plus `npm run build:web` or `npm run check:mobile` when the change affects those apps. Enable the corresponding CI steps when their prerequisites exist. Do not hide missing tests with success placeholders or report a JS export as proof of a native build.

For every handoff, state what changed, checks run, checks unavailable, and remaining dependencies. Use fictional content for tests and AI evaluations.
