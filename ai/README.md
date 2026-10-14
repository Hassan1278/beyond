# ai/ — the letter-writing service (`@beyond/ai`)

A small, stateless HTTP service that writes morning letters and Patterns notes, and turns voice recordings into text. Only the backend API calls it. It never sees the database, Supabase keys or who the person is: just one night's words, the chosen voice and language, a few usable memories and outlines of up to four earlier kept letters.

The prompts, letter shape and quality checks are ported from the Beyond prototype, so letters read the same as in the original app.

## Routes

All need `Authorization: Bearer $AI_SERVICE_TOKEN`. Responses are `no-store` and never contain upstream error text.

| Route                 | In                                                    | Out                                               |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `GET /v1/health`      | —                                                     | `{ letters, notes, transcribe, provider, model }` |
| `POST /v1/letters`    | letter input v2 (JSON)                                | `{ version: 2, request_id, content, model }`      |
| `POST /v1/notes`      | note input v2 (JSON)                                  | `{ text, model }`                                 |
| `POST /v1/transcribe` | audio bytes, `?lang=mixed\|yue-Hant-HK\|zh-CN\|en-US` | `{ text }`                                        |

Errors are `{ "error": code }`: `unauthorized` 401, `bad_request` 400, `not_configured` 503 (no key yet), `unavailable` 502, `invalid_output` 422 (failed the checks twice), `refused` 422, `too_large` 413, `no_speech` 422, `not_ready` 503 (token missing). Full contract: [docs/ai-service.md](../docs/ai-service.md).

## Turning it on

Copy `.env.example`. Only `AI_SERVICE_TOKEN` is required. With the keys empty the whole app still works: sealed letters wait in the queue and the app says the letter writer isn't switched on yet. Add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` for any OpenAI-compatible endpoint) and queued letters are written within a minute. Voice uses `TRANSCRIBE_API_KEY` or the OpenAI key.

```sh
npm run dev:ai          # http://127.0.0.1:3003
npm run test:ai         # unit tests with mocked providers, no key needed
```

## Rules

- Called only by the backend API. Browsers and apps never call it.
- No database or Supabase admin credentials, no storage, no logging of journal text or upstream errors.
- No fake or template letters. A missing or failing provider means the letter waits or shows "couldn't be written", with Try again.
- Evaluations: see [evals/README.md](evals/README.md).
