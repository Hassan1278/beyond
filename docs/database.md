# Database

Supabase (Postgres 17 + Auth) lives in [`supabase/`](../supabase). The folder keeps its standard name so the Supabase CLI and GitHub integration find it.

| Path                   | Contents                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `supabase/config.toml` | Local stack config (API 55321, DB 55322, Mailpit 55324)      |
| `supabase/migrations/` | Additive, ordered schema migrations; never edit applied ones |
| `supabase/tests/`      | pgTAP tests for permissions, RPCs, privacy and readiness     |

## Tables

| Table                         | Holds                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public.profiles`             | One row per Auth user; active/deleting state                                                                                                           |
| `public.journal_entries`      | Revisioned nights; deleted ones become content-free stubs                                                                                              |
| `public.user_settings`        | Voice, letter language, delivery time, early opening, onboarding, welcome answers, directions, memory pause, timezone; private forgotten-memory hashes |
| `public.approved_memories`    | Memories you told Beyond (`told`) or a letter learned (`learned`, `edited` once you change it)                                                         |
| `public.letters`              | One letter per sealed night: status, checked content, delivery time, read/early/private, to-do states                                                  |
| `public.letter_notes`         | Month (`2026-10`) and year (`Y2026`) notes, with private source letter ids                                                                             |
| `public.todos`                | Standalone to-dos (API only; the journal app keeps to-dos on letters)                                                                                  |
| `private.letter_jobs`         | Metadata-only letter jobs with fenced leases and backoff                                                                                               |
| `private.ai_daily_usage`      | Daily letter/note/transcription counts per person                                                                                                      |
| `private.account_deletions`   | Durable account-deletion queue                                                                                                                         |
| `private.api_request_budgets` | Per-user request rate limits                                                                                                                           |

Clients can only read their own live rows through RLS, and only while their Auth session is still live. All writes go through validated `security definer` RPCs with an empty search path. The `private` schema is never exposed to clients.

## Migrations

Apply in filename order. The API reports ready only when the release marker matches: `api_release_ready('beyond-letters-v1')`, installed by `20261015000000_letters.sql`.

| File                                      | Adds                                                                |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `20261009150000_writing.sql`              | Profiles, journal entries, writing RPCs                             |
| `20261010000000_private_product.sql`      | Settings, memories, todos, rate limits                              |
| `20261010010000_account_cleanup.sql`      | Durable account deletion                                            |
| `20261010020000_product_readiness.sql`    | Readiness catalog checks                                            |
| `20261010030000_memory_edits_exports.sql` | Memory corrections, paginated exports                               |
| `20261012120000_connected_account.sql`    | Account status, content clearing                                    |
| `20261012121000_session_revocation.sql`   | Live-session gate in RLS and RPCs                                   |
| `20261012130000_reflection_workflow.sql`  | First letter workflow (replaced by letters below)                   |
| `20261013101058_deployment_readiness.sql` | Release marker and memory-source index                              |
| `20261013120000_owner_indexes.sql`        | Owner indexes                                                       |
| `20261015000000_letters.sql`              | Letters, jobs, notes, learned memories, daily AI limits, new marker |

New schema work:

1. Add a new migration with a later timestamp.
2. Add pgTAP coverage in `supabase/tests/`.
3. If the API depends on it, add a new release marker and point `backend/api/src/server/health-check.ts` at it.

## Local

```sh
npm run db:start   # needs Docker
npm run db:test    # pgTAP
npm run db:stop
```

Hosted project details are in [deployment](deployment.md). Never run local fixture harnesses against the hosted project.
