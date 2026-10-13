# Database

Supabase (Postgres 17 + Auth) lives in [`supabase/`](../supabase). The folder keeps its standard name so the Supabase CLI and GitHub integration find it.

| Path                   | Contents                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `supabase/config.toml` | Local stack config (API 55321, DB 55322, Mailpit 55324)      |
| `supabase/migrations/` | Additive, ordered schema migrations; never edit applied ones |
| `supabase/tests/`      | pgTAP tests for permissions, RPCs, privacy and readiness     |

## Tables

| Table                         | Holds                                                         |
| ----------------------------- | ------------------------------------------------------------- |
| `public.profiles`             | One row per Auth user; active/deleting state                  |
| `public.journal_entries`      | Revisioned entries; deleted entries become content-free stubs |
| `public.user_settings`        | Voice, letter time, timezone, memory pause                    |
| `public.approved_memories`    | Memories the user explicitly approved                         |
| `public.todos`                | Standalone and accepted-action to-dos                         |
| `public.reflections`          | Stored letters, actions, provenance and corrections           |
| `private.reflection_jobs`     | Metadata-only letter jobs with leases and retries             |
| `private.account_deletions`   | Durable account-deletion queue                                |
| `private.api_request_budgets` | Per-user rate limits                                          |

Clients can only read their own live rows through RLS, and only while their Auth session is still live. All writes go through validated `security definer` RPCs with an empty search path. The `private` schema is never exposed to clients.

## Migrations

Apply in filename order. The API refuses to report ready until the latest release marker exists: `api_release_ready('connected-text-v1')`, installed by `20261013101058_deployment_readiness.sql`.

| File                                      | Adds                                       |
| ----------------------------------------- | ------------------------------------------ |
| `20261009150000_writing.sql`              | Profiles, journal entries, writing RPCs    |
| `20261010000000_private_product.sql`      | Settings, memories, todos, rate limits     |
| `20261010010000_account_cleanup.sql`      | Durable account deletion                   |
| `20261010020000_product_readiness.sql`    | Readiness catalog checks                   |
| `20261010030000_memory_edits_exports.sql` | Memory corrections, paginated exports      |
| `20261012120000_connected_account.sql`    | Account status, content clearing           |
| `20261012121000_session_revocation.sql`   | Live-session gate in RLS and RPCs          |
| `20261012130000_reflection_workflow.sql`  | Reflection consent, jobs, letters, actions |
| `20261013101058_deployment_readiness.sql` | Release marker and memory-source index     |

New schema work: add a new migration with a later timestamp, add pgTAP coverage in `supabase/tests/`, and if the API depends on it, add a new release marker and point `backend/api/src/server/health-check.ts` at it.

## Local

```sh
npm run db:start   # needs Docker
npm run db:test    # pgTAP
npm run db:stop
```

Hosted project details are in [deployment](deployment.md). Never run local fixture harnesses against the hosted project.
