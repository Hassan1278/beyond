# Workstreams

The user authorized one combined backend/frontend integration PR and subsequently authorized cloud setup and deployment in the selected Beyond account/project. Current authority and boundaries are in AGENTS; [connected app milestone](connected-app.md) defines the implementation and [cloud setup](cloud-setup.md) records the deployment state. No subagents are automatically delegated by this task.

| Area              | Owned paths / handoff                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| API/database      | `apps/api`, `supabase`, backend/real HTTP tests and private contracts                                                           |
| Shared product/UI | `packages/shared`, `packages/app-ui`; keep credentials out of portable/UI code                                                  |
| Web               | `apps/web`; preserve supplied marketing/presenter/app design                                                                    |
| Mobile            | `apps/mobile`; preserve identifiers/SDK pins and verify real native devices separately                                          |
| AI owner          | `services/ai`, later evaluations/provider setup; implement authenticated version1 HTTP contract without DB admin credentials    |
| Release           | Authorized Beyond hosted environments/migrations/Auth callbacks/email/CORS/worker schedules; EAS/store release remains separate |

Use isolated checkouts and real remote ancestry with a branch lease. Test fictional inputs and document actual checked heads/unavailable checks. Preserve the combined PR review workflow, never force-push, and keep hosted acceptance separate from local fixture harnesses. Do not reset hosted data or modify unrelated accounts/projects.
