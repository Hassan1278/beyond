# AI service

The letter writer lives in [`ai/`](../ai) and deploys as its own Vercel project (`beyond-ai`). It turns one prepared input into one checked result and stores nothing. It never sees the database, Supabase keys, the person's email or account. The prompts, the example letter, the four voices and the quality checks are the prototype's, ported unchanged.

Everything works before provider keys are added. Sealed nights wait in the queue, and the app says the letter writer isn't switched on yet. Once a key is set, the next scheduled run writes them.

## How a letter is written

```
seal ──► POST /api/v1/entries (the night) ──► POST /api/v1/letters {consent:true} ──► queued
pg_cron every minute ──► POST /api/v1/internal/letters/process  (LETTER_JOB_TRIGGER_SECRET)
   │ GET  <AI_SERVICE_URL>/v1/health        letters: false? stop here, claim nothing
   │ letter_claim (≤5, 240 s fenced leases) ─► letter_input (DB builds the input below)
   │ POST <AI_SERVICE_URL>/v1/letters        Authorization: Bearer AI_SERVICE_TOKEN
   └ 200 ─► letter_finish (stores content, learns ≤2 checked memories)
     503 not_configured ─► letter_release (no attempt spent)
     422 invalid_output | refused, 5xx, timeout ─► letter_fail (retries after 1, 5, 15, 60, 180 min; refusal is final)
```

The backend waits up to 170 s per letter and reads at most 200 KB. The service may ask the model twice: the second time it says what was wrong with the first answer.

## `POST /v1/letters`

Request (built by the database; nothing else is sent):

```json
{
  "version": 2,
  "request_id": "uuid of the letter",
  "journal_date": "2026-10-14",
  "language": "auto | en | zh-hant | zh-hans",
  "voice": "friend | mentor | future | diary",
  "memories": ["memories the person can see, ≤20; [] when paused"],
  "earlier_letters": [
    {
      "date": "2026-10-12",
      "headline": "…",
      "themes": ["rest"],
      "openQuestions": ["…"],
      "stepsTheyMarkedNotForMe": ["…"]
    }
  ],
  "entries": [{ "id": "uuid", "written_at": "22:40", "text": "the sealed night, ≤20000 units" }]
}
```

Learned memories are included only while a letter they came from is kept in Patterns. Earlier letters are at most four, and only ones kept in Patterns.

Response `200`: `{ "version": 2, "request_id", "content", "model" }`. `content` is **letter format 3** (the letter writer prompt in [`ai/src/lib/letter-prompt.ts`](../ai/src/lib/letter-prompt.ts)) after `validateLetter`:

- `title`, `body` (one flowing letter, paragraphs separated by blank lines, greeting with the `{{name}}` placeholder the app fills in), `reflection_question`, `small_step` `{ text, minutes ≤ 15, category }`
- `night_type` (`heavy`, `good`, `mixed`, `comparison`, `decision`, `quiet`) and `safety_flag` (`none`, `watch`, `urgent`). An urgent night has no question and no step, and always ends with the Hong Kong contacts.
- `themes` (1–3 from the fixed list) and `evidence` (phrases kept only when they are the person's exact words; not shown)
- Growth fields, from that night only: `activities` (≤6 of `{ name, energy −2..2, absorption −2..2 }`), `compass` (`loves`, `good_at`, `matters`, `within_reach`, ≤2 labels each) and `interests` (≤3)
- `remember` (≤2; none on a heavy, watch or urgent night)
- Repeated for the database and older screens: `headline` (= title), `steps` (the one step, or none), `openQuestions` (the one question), `tone` (from `night_type`) and `safetyConcern` (`safety_flag` is not `none`)

The checks reject a body with headings, bullets or bold, quotation marks around the person's own words, or a missing question or step, and the model is asked once more with the problems. Letters written before the switch keep format 2 (sections and three steps); the app shows both the same way. Migration `20261018000000_letters_v3` lets the database store format 3.

The shared `letterContentSchema` in [`shared/src/schemas/letters.ts`](../shared/src/schemas/letters.ts) is what the backend accepts: format 3 or format 2.

## `POST /v1/notes`

Request: `{ "version": 2, "key": "2026-10" | "Y2026", "voice", "language", "letters": [...] }`. Each letter carries its date, headline, tone, themes, the quoted words, open questions and the status of its to-dos. Only delivered letters kept in Patterns are included. Response: `{ "text", "model" }`.

## `POST /v1/transcribe?lang=mixed|yue-Hant-HK|zh-CN|en-US`

The request body is the raw audio (`audio/*`, ≤4.2 MB); the response is `{ "text" }`. The recording is passed to an OpenAI-compatible `/audio/transcriptions` endpoint with the prototype's Cantonese, Mandarin and English hints. Nothing is kept. The app records only when transcription is configured; otherwise Speak uses the browser's own speech recognition or the keyboard's dictation.

## `GET /v1/health`

Returns `{ letters, notes, transcribe, provider, model }`. Every route requires the bearer token. Errors are `{ "error": code }` and never contain upstream text.

## Turning it on

**On the hosted project, everything below except the provider key is already done.** To switch letters on:

1. Vercel → `beyond-ai` → Settings → Environment Variables → `ANTHROPIC_API_KEY` → paste the key (Production).
2. Optional, for recorded voice: fill `OPENAI_API_KEY` the same way. Without it, Speak uses the browser's or keyboard's dictation.
3. Deployments → latest production deployment → **Redeploy**.

Within a minute, `GET /api/v1/ai` reports `letters: true` and the scheduled writer starts clearing the queue, including nights sealed before the key was added.

The full setup, for a new environment:

1. **AI project:** on the Vercel project `beyond-ai` (Root Directory `ai`), set `AI_SERVICE_TOKEN` to a random value of 32+ URL-safe characters.
   - For letters and notes, set `ANTHROPIC_API_KEY`, and optionally `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
   - Or use `OPENAI_API_KEY`, `OPENAI_MODEL` and `OPENAI_BASE_URL` for any OpenAI-compatible endpoint. `AI_PROVIDER=auto|anthropic|openai` picks between them.
   - For voice, set `TRANSCRIBE_API_KEY` (or reuse the OpenAI key) and `TRANSCRIBE_MODEL` (default `whisper-1`).
2. **API project:** on `beyond-api`, set:
   - `AI_SERVICE_URL`: the AI origin
   - `AI_SERVICE_TOKEN`: the same token as the AI project
   - `LETTER_JOB_TRIGGER_SECRET`: a different random value
   - `SUPABASE_SECRET_KEY`: already set for account deletion

   Then redeploy.

3. **Scheduler:** in Supabase, the `beyond-letter-writer` `pg_cron` job POSTs `{"limit":3}` every minute to `/api/v1/internal/letters/process`, with the trigger bearer from Vault. See [deployment](deployment.md#schedulers).

Leave the provider keys empty and steps 1–3 still work. Letters simply wait until a key is added.

## Limits and safety

- Each person gets 6 letters, 10 notes and 40 transcriptions per day (UTC), enforced in the database.
- Letters never diagnose. When the model flags a safety concern, the letter points to people and to the app's Hong Kong support contacts.
- The keyword check in the app shows support while the person is still writing.
- The provider sees what is sent, under its own retention terms. Review those terms before real users write.
- Evaluations: see [`ai/evals`](../ai/evals/README.md). Unit tests mock the provider; CI runs the real service against a stub model.
