# Beyond cloud setup

The user selected the **Beyond** Supabase organization and authorized provisioning/deployment. Supabase and Vercel are connected. This is the recorded state on 2026-10-13; it is not a completed deployment.

| Resource                  | Verified state                                                                   |
| ------------------------- | -------------------------------------------------------------------------------- |
| Supabase organization     | Beyond, `bxykxzncygzwhfjsgrtj`, Free plan                                        |
| Supabase project          | `beyond`, ref `wrjlpfnotylrdewvgsgn`, active/healthy                             |
| Database location/version | Singapore (`ap-southeast-1`), PostgreSQL17                                       |
| Supabase API              | `https://wrjlpfnotylrdewvgsgn.supabase.co`                                       |
| Database migrations       | First two applied; seven remaining, including the deployment-readiness follow-up |
| Vercel team               | `team_02QQnFeHIwIzAX4DT6bzSAEa` / `smigmi1278-9965`; connector returns403        |
| Vercel web/API projects   | Not created; no deployment URLs or live app                                      |
| GitHub                    | Combined integration merged through PR5; cloud preparation is a follow-up        |
| Optional workers/AI       | Not configured or enabled                                                        |

The nonsecret project IDs, migration checksums and observed cloud versions are recorded in [cloud state](cloud-state.json). No privileged credential, database password, provider token or publishable key is committed there. Workspace environment examples keep dummy values.

## Interrupted migration and resume

The initial eight migrations were taken from tested commit `ef20fc36e1b314eee10b72f6abb641020b994795`. Their SQL was sent unchanged. `writing` and `private_product` succeeded. `account_cleanup` returned the connector error `McpServerError: Invalid or expired requestState`; the subsequent history/catalog checks show only the first two migrations and no `private.account_deletions` table. No SQL syntax or PostgreSQL permission error was returned. Do not assume the failed migration ran, repeat the first two, reset the database or apply later files out of order.

Supabase documents [form-based SQL confirmations](https://supabase.com/docs/guides/troubleshooting/sql-confirmations-do-not-appear-in-your-mcp-client-sQf7Kp). The cleanup migration defines privileged deletion functions; applying it does not call those functions or delete accounts. The connector's confirmation/request lifecycle must work before continuing through that tool. The error is not evidence that the migration's SQL is invalid. No SQL has been rewritten to evade confirmation detection.

Resume by checking the project ref, migration history and the recorded checksums against the checked-out branch. Recheck the cleanup table and stop on any unexpected migration or schema drift. Apply each remaining migration once, in filename order, recording its returned cloud version. Requery history after a timeout/error before retrying. The final deployment-readiness migration supplies the `connected-text-v1` gate and an index for memory-source privacy cascades. Run catalog/privilege checks and both advisers after the full set applies. Do not deploy this API against the initial partial schema.

MCP assigns its own timestamp versions. The two observed mappings are:

| Name            | Repository version | Cloud version    |
| --------------- | ------------------ | ---------------- |
| writing         | `20261009150000`   | `20261013072835` |
| private_product | `20261010000000`   | `20261013072844` |

Before switching to CLI `db push`, align migration history only after confirming that each cloud record is the exact applied source SQL. Supabase CLI `migration repair` changes history, not product data. For the two verified records, an authenticated CLI explicitly targeting this project can mark the MCP versions reverted and the repository versions applied:

```sh
npx --no-install supabase migration repair --project-ref wrjlpfnotylrdewvgsgn --status reverted 20261013072835 20261013072844
npx --no-install supabase migration repair --project-ref wrjlpfnotylrdewvgsgn --status applied 20261009150000 20261010000000
```

These repair commands have **not** been executed. Review fresh history before using them, including any migrations applied since this checkpoint. Do not mark unapplied migrations applied. Re-list history after repair, review the pending set/dry run, and keep credentials out of command text/logs. Never reset or replay schema merely to fix version metadata.

## Verified initial database controls

Catalog inspection found RLS enabled on all five initial public tables, no anonymous table privileges or write RPC access, and empty search paths on the security-definer functions. Readable client columns use explicit grants; clients have no table-wide write grant. Later live-session enforcement, export/content-clearing and reflection migrations remain pending, so this is not final security acceptance.

The security adviser reports the deliberately callable catalog-only readiness function and authenticated mutation/read RPCs. Those RPCs validate arguments and derive ownership from Auth; privileged account workers are separately restricted. Review the [anonymous function](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated function](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) notices again after the complete schema, rather than treating zero warnings as the security goal.

The performance adviser reported [an unindexed foreign key](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) for `approved_memories.source_entry_id`. The new deployment-readiness migration adds its covering index; it is not yet applied in the cloud. [Unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) notices are expected on this new, unused project; retain the pagination indexes and evaluate actual usage after launch.

## Vercel access and project preparation

User-profile authentication succeeds, but reading this explicit team or listing its projects fails with403: “Not authorized: Trying to access resource under scope \"smigmi1278-9965\".” No signed-in CLI fallback is available. The Vercel connection must gain access to that exact team. Do not silently select a different team, remove the explicit scope or assume connecting the plugin alone fixed team authorization.

Prepare two projects, proposed names `beyond-api` and `beyond-web`, linked to private `Hassan1278/beyond` in that team. Set their Root Directories to `apps/api` and `apps/web`, Node version24.x, and **Include source files outside of the Root Directory in the Build Step** to true. Each app's `vercel.json` pins the root-lockfile npm install, runs its workspace build and selects one Singapore function region. Do not import the repository root as a single Next app. Main contains the integration merged through PR5; first test the cloud follow-up's release-specific readiness fix, then release its verified head.

Set the API's public Supabase configuration and exact web origin, then its stable deployment URL in web's build-time public environment. Keep production values scoped to production. A connected preview needs an isolated Supabase project/branch and the matching preview API/CORS/Auth callback setup; do not populate every preview with privileged production credentials. Unconfigured previews display setup information. See [deployment](deployment.md) for the environment matrix and verification steps.

## Still required for a usable hosted app

Finish/verify all database migrations, restore Vercel team access, create/configure/deploy both projects, and verify real hosted writing/auth/privacy flows. Configure Supabase site/reset/callback URLs, email confirmation and a delivery provider; configure Google provider credentials/callbacks if Google sign-in is enabled. Account deletion remains disabled until its isolated backend credential, independent trigger and durable cleanup scheduler have been deployed and tested. The independent AI service and reflection worker remain disabled. Native device checks, voice/transcription and real analysis screens remain separate work.
