# ai/ — independent letter service (not built yet)

This folder is reserved for the AI service that writes the morning letters. It is intentionally empty apart from the evaluation plan.

- **Contract, request/response shapes and how to switch it on:** [docs/ai-service.md](../docs/ai-service.md)
- **Evaluation plan:** [evals/README.md](evals/README.md)

Rules:

- It is called only by the backend API over authenticated HTTPS. Browsers and apps never call it directly.
- It never receives database or Supabase admin credentials and never reads the database.
- Do not add a fake/fallback generator. A missing or failing service simply means no letter.
