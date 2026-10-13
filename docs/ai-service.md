# AI service

This is the one remaining product feature. Everything around it (consent, scheduling, retries, storage, the letter screen, accept/reject of suggested tasks, corrections and privacy cleanup) is already built and tested. The AI service only has to turn one journal entry into one letter over a single authenticated HTTP call.

Build it in [`ai/`](../ai). It is a separate deployable service: it never touches the database and never receives database credentials.

## How it is called

```
user saves entry ──► user taps "send for a letter" ──► POST /api/v1/entries/:id/reflection {consent:true}
                                                         │ (job scheduled for next local morning 07:00/07:30/08:00)
scheduler ──► POST /api/v1/internal/reflections/process  │
                 │ claims ≤5 due jobs with 60 s leases   ▼
                 └──► POST <AI_SERVICE_URL>/v1/reflections   ◄── your service
                         Authorization: Bearer <AI_SERVICE_TOKEN>
                 ◄── letter JSON ──► validated, fenced commit ──► GET /api/v1/reflections shows it
```

The backend sends at most one request per job attempt, waits at most **25 seconds**, reads at most **128 KB** of response, and retries failures up to 5 attempts with exponential backoff. Any non-2xx, malformed, oversized or mismatched response counts as a failure. There is no fallback letter.

## Request

`POST /v1/reflections` with `Content-Type: application/json`:

```json
{
  "version": 1,
  "request_id": "6f1c…-uuid",
  "entry": { "id": "uuid", "revision": 3, "text": "The journal entry, 1–20000 UTF-16 units" },
  "voice": "friend",
  "memories": [{ "id": "uuid", "text": "Approved memory, ≤2000 units" }],
  "corrections": [
    { "id": "uuid", "text": "A correction the user made to an earlier letter, ≤2000 units" }
  ]
}
```

- `voice` is one of `friend`, `mentor`, `future`, `diary` (the app labels the last one "Plain diary").
- `memories`: up to 20, only ones the user explicitly approved. Empty when memory is paused.
- `corrections`: up to 5 of the user's own earlier corrections. Empty when memory is paused.
- Accept requests up to about 256 KB. Reject anything without the correct bearer token.

## Response

Return `200` with:

```json
{
  "version": 1,
  "request_id": "same as request",
  "entry_revision": 3,
  "letter": {
    "greet": "Hey,",
    "said": "What you wrote, reflected back (must be non-empty)",
    "rec": "What you noticed / a gentle observation",
    "step": "One small next step",
    "sign": "Talk tonight,"
  },
  "actions": [{ "id": "uuid", "title": "Optional suggested task, ≤2000 units" }],
  "provenance": { "model": "provider/model-name", "prompt_version": "letters-v1" }
}
```

- Each letter part is at most 5000 UTF-16 units, with no NUL characters or unpaired surrogates.
- `actions`: at most 5, with unique UUIDs. They only become to-dos if the user accepts them.
- `provenance.model` must match `[A-Za-z0-9_.:/-]{1,100}` and `prompt_version` must match `[A-Za-z0-9_.-]{1,100}`.
- `request_id` and `entry_revision` must echo the request, or the result is discarded as stale.

The authoritative schemas are `aiInputSchema` and `aiOutputSchema` in [`shared/src/schemas/reflections.ts`](../shared/src/schemas/reflections.ts). Import them from `@beyond/shared` if the service is written in TypeScript.

## Turning it on

1. Deploy the service on HTTPS and generate a random `AI_SERVICE_TOKEN` (32+ URL-safe characters) that it requires.
2. On the `beyond-api` Vercel project, set `REFLECTIONS_ENABLED=true`, `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`, a different `REFLECTION_JOB_TRIGGER_SECRET`, and `SUPABASE_SECRET_KEY` (API only; never in a client or the AI service). Redeploy.
3. Schedule `POST https://<api>/api/v1/internal/reflections/process` every few minutes with `Authorization: Bearer <REFLECTION_JOB_TRIGGER_SECRET>`, for example from a Vercel Cron job or Supabase `pg_cron` + `pg_net`.
4. The consent button appears in the app automatically once `GET /api/v1/account` reports reflections as available.

## What the service owns

- Choosing the provider/model, writing the prompts, and the safety behaviour for difficult content.
- The retention policy for anything it sends to a provider.
- Evaluations in [`ai/evals`](../ai/evals/README.md), run with fictional entries before launch.

Patterns, themes, Quarterly Wrapped and Life Film are later analysis features with no contract yet. Their screens stay empty for real accounts until one is designed.
