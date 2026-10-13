# Workstreams

The user authorized one combined backend/frontend integration PR. Current authority and boundaries are in AGENTS; [connected app milestone](connected-app.md) defines the implementation. No subagents are automatically delegated by this task.

| Area              | Owned paths / handoff                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| API/database      | `apps/api`, `supabase`, backend/real HTTP tests and private contracts                                                        |
| Shared product/UI | `packages/shared`, `packages/app-ui`; keep credentials out of portable/UI code                                               |
| Web               | `apps/web`; preserve supplied marketing/presenter/app design                                                                 |
| Mobile            | `apps/mobile`; preserve identifiers/SDK pins and verify real native devices separately                                       |
| AI owner          | `services/ai`, later evaluations/provider setup; implement authenticated version1 HTTP contract without DB admin credentials |
| Release           | Hosted environments/migrations/Auth callbacks/email/CORS/worker schedules and EAS/store configuration; separately authorized |

Use isolated checkouts and real remote ancestry with a branch lease. Test fictional inputs and document actual checked heads/unavailable checks. Do not merge the combined PR, deploy, force-push or mutate hosted accounts as part of this integration task.
