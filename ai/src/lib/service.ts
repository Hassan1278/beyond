import { createHash, timingSafeEqual } from 'node:crypto';
import { parseConfig, type AiConfig, type Env } from './config';
import { letterInputSchema, letterRequest, validateLetter } from './letter';
import { noteInputSchema, noteRequest, validateNote } from './note';
import {
  generateValidated,
  ProviderError,
  SPOKEN,
  transcribe,
  type Fetcher,
  type SpokenLanguage,
} from './providers';

/**
 * HTTP surface of the AI service. Only the backend calls it, with a bearer token.
 * Responses never include upstream error text. Nothing is stored.
 *
 *   GET  /v1/health      { letters, notes, transcribe, provider, model }
 *   POST /v1/letters     letter input (v2)  -> { version, request_id, content, model }
 *   POST /v1/notes       note input (v2)    -> { text, model }
 *   POST /v1/transcribe  audio bytes        -> { text }
 *
 * Error bodies are { error: code } with code one of: unauthorized, bad_request,
 * not_configured, unavailable, invalid_output, refused, not_ready, too_large, no_speech.
 */
export type ErrorCode =
  | 'unauthorized'
  | 'bad_request'
  | 'not_configured'
  | 'unavailable'
  | 'invalid_output'
  | 'refused'
  | 'not_ready'
  | 'too_large'
  | 'no_speech';

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  bad_request: 400,
  not_configured: 503,
  unavailable: 502,
  invalid_output: 422,
  refused: 422,
  not_ready: 503,
  too_large: 413,
  no_speech: 422,
};

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: HEADERS });
}

export function failure(code: ErrorCode): Response {
  return json(STATUS[code], { error: code });
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function authorized(request: Request, token: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  return timingSafeEqual(digest(header), digest(`Bearer ${token}`));
}

class TooLarge extends Error {}

async function readBytes(request: Request, limit: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > limit) throw new TooLarge();
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new TooLarge();
      chunks.push(chunk.value);
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function readJson(request: Request, limit: number): Promise<unknown> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json'))
    return undefined;
  const bytes = await readBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return undefined;
  }
}

export type Route = 'health' | 'letters' | 'notes' | 'transcribe';

export function createService(env: Env, fetcher: Fetcher = fetch) {
  let config: AiConfig | null = null;
  let configError = false;
  try {
    config = parseConfig(env);
  } catch {
    configError = true;
  }

  return async function handle(route: Route, request: Request): Promise<Response> {
    if (configError || !config) return failure('not_ready');
    if (!authorized(request, config.token)) return failure('unauthorized');
    const method = route === 'health' ? 'GET' : 'POST';
    if (request.method !== method) return failure('bad_request');
    if (route !== 'transcribe' && new URL(request.url).search) return failure('bad_request');
    try {
      if (route === 'health') {
        return json(200, {
          letters: !!config.chat,
          notes: !!config.chat,
          transcribe: !!config.transcription,
          provider: config.chat?.kind ?? null,
          model: config.chat?.model ?? null,
        });
      }

      if (route === 'letters') {
        const parsed = letterInputSchema.safeParse(await readJson(request, 300_000));
        if (!parsed.success) return failure('bad_request');
        if (!config.chat) return failure('not_configured');
        const result = await generateValidated(
          config.chat,
          letterRequest(parsed.data),
          (raw) => validateLetter(raw, parsed.data),
          fetcher,
        );
        if (!result.ok) return failure('invalid_output');
        return json(200, {
          version: 2,
          request_id: parsed.data.request_id,
          content: result.value,
          model: config.chat.model,
        });
      }

      if (route === 'notes') {
        const parsed = noteInputSchema.safeParse(await readJson(request, 600_000));
        if (!parsed.success) return failure('bad_request');
        if (!config.chat) return failure('not_configured');
        const result = await generateValidated(
          config.chat,
          noteRequest(parsed.data),
          validateNote,
          fetcher,
        );
        if (!result.ok) return failure('invalid_output');
        return json(200, { text: result.value.text, model: config.chat.model });
      }

      const url = new URL(request.url);
      const keys = [...url.searchParams.keys()];
      const spoken = url.searchParams.get('lang') ?? 'mixed';
      if (keys.some((k) => k !== 'lang') || !(spoken in SPOKEN)) return failure('bad_request');
      const mime = (request.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      if (!/^audio\/[a-z0-9.+-]{1,40}$/.test(mime)) return failure('bad_request');
      if (!config.transcription) return failure('not_configured');
      const audio = await readBytes(request, 4_200_000);
      if (audio.byteLength < 100) return failure('bad_request');
      const text = await transcribe(
        config.transcription,
        audio,
        mime,
        spoken as SpokenLanguage,
        fetcher,
      );
      return text ? json(200, { text }) : failure('no_speech');
    } catch (error) {
      if (error instanceof TooLarge) return failure('too_large');
      if (error instanceof ProviderError) return failure(error.code);
      return failure('unavailable');
    }
  };
}
