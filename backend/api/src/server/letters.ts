import { z } from 'zod';
import {
  aiHealthSchema,
  aiLetterInputSchema,
  aiLetterOutputSchema,
  aiNoteOutputSchema,
  aiStatusSchema,
  entryParamsSchema,
  letterListSchema,
  letterSchema,
  noteInputSchema,
  noteListSchema,
  noteSchema,
  patchLetterSchema,
  requestLetterSchema,
  spokenLanguageSchema,
  transcriptSchema,
  writeNoteSchema,
  type AiStatus,
} from '@beyond/shared';
import { validTrigger } from './account';
import { requireBudget } from './budget';
import {
  isAllowedBrowserOrigin,
  type WritingConfig,
  type WritingEnvironment,
} from './config-parser';
import { dataResponse, errorResponse } from './http';
import {
  authenticate,
  encodeCursor,
  fail,
  listQuery,
  preflight,
  readBody,
  rpc,
  withCors,
  WritingFailure,
} from './transport';

/**
 * Letters, Patterns notes and voice. The backend owns the queue and every
 * database write; the AI service only turns one prepared input into text.
 */
export interface AiServiceConfig {
  url: string;
  token: string;
}
export interface LetterWorkerConfig {
  secretKey: string;
  triggerSecret: string;
  ai: AiServiceConfig;
}

const TOKEN = /^[-A-Za-z0-9_]{32,256}$/;

/** AI service address and bearer. Missing means letters stay queued and the app says so. */
export function parseAiServiceConfig(env: WritingEnvironment): AiServiceConfig {
  const raw = env.AI_SERVICE_URL?.trim() ?? '';
  const token = env.AI_SERVICE_TOKEN?.trim() ?? '';
  const url = new URL(raw);
  const local =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.origin !== raw ||
    url.username ||
    url.password ||
    !(url.protocol === 'https:' || local) ||
    !TOKEN.test(token)
  )
    throw new Error('Invalid AI service configuration.');
  return { url: url.origin, token };
}

export function parseLetterWorkerConfig(env: WritingEnvironment): LetterWorkerConfig {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim() ?? '';
  const triggerSecret = env.LETTER_JOB_TRIGGER_SECRET?.trim() ?? '';
  if (
    !/^(?:sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$/.test(secretKey) ||
    !TOKEN.test(triggerSecret)
  )
    throw new Error('Invalid letter worker configuration.');
  const ai = parseAiServiceConfig(env);
  if (ai.token === triggerSecret) throw new Error('Secrets must differ.');
  return { secretKey, triggerSecret, ai };
}

type AiReply = { status: number; body: unknown };

/** Bounded, redirect-free call to the AI service. Never forwards upstream text to clients. */
export async function callAi(
  ai: AiServiceConfig,
  path: '/v1/health' | '/v1/letters' | '/v1/notes' | `/v1/transcribe?lang=${string}`,
  init: { method: 'GET' | 'POST'; json?: unknown; bytes?: Uint8Array; type?: string },
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<AiReply> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('AI deadline.'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const headers: Record<string, string> = { Authorization: `Bearer ${ai.token}` };
        let body: BodyInit | undefined;
        if (init.json !== undefined) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(init.json);
        } else if (init.bytes) {
          headers['Content-Type'] = init.type ?? 'application/octet-stream';
          body = init.bytes as BodyInit;
        }
        const response = await fetcher(ai.url + path, {
          method: init.method,
          cache: 'no-store',
          redirect: 'error',
          signal: controller.signal,
          headers,
          ...(body === undefined ? {} : { body }),
        });
        if (!response.body) return { status: response.status, body: null };
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let bytes = 0;
        let text = '';
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 200_000) throw new Error('AI reply too large.');
            text += decoder.decode(chunk.value, { stream: true });
          }
          text += decoder.decode();
        } finally {
          void reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        return { status: response.status, body: parsed };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

const aiErrorSchema = z.object({ error: z.string().max(40) });
function aiError(reply: AiReply): string {
  const parsed = aiErrorSchema.safeParse(reply.body);
  return parsed.success ? parsed.data.error : 'unavailable';
}

const OFF: AiStatus = { letters: false, notes: false, transcribe: false };
let statusCache: { at: number; key: string; value: AiStatus } | null = null;

/** What the AI service can do right now. Cached briefly; any failure reads as "off". */
export async function aiStatus(
  ai: AiServiceConfig | null,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<AiStatus> {
  if (!ai) return OFF;
  if (statusCache && statusCache.key === ai.url && now - statusCache.at < 30_000)
    return statusCache.value;
  let value = OFF;
  try {
    const reply = await callAi(ai, '/v1/health', { method: 'GET' }, 4_000, fetcher);
    const parsed = aiHealthSchema.safeParse(reply.body);
    if (reply.status === 200 && parsed.success)
      value = aiStatusSchema.parse({
        letters: parsed.data.letters,
        notes: parsed.data.notes,
        transcribe: parsed.data.transcribe,
      });
  } catch {
    value = OFF;
  }
  statusCache = { at: now, key: ai.url, value };
  return value;
}
export function resetAiStatusCache(): void {
  statusCache = null;
}

const MAX_AUDIO_BYTES = 4_000_000;
async function readAudio(request: Request): Promise<{ bytes: Uint8Array; type: string }> {
  const type = (request.headers.get('Content-Type') ?? '').split(';')[0]!.trim().toLowerCase();
  if (!/^audio\/[a-z0-9.+-]{1,40}$/.test(type)) fail('bad_request');
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (!Number.isFinite(declared) || declared > MAX_AUDIO_BYTES) fail('bad_request');
  if (!request.body) fail('bad_request');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_AUDIO_BYTES) fail('bad_request');
      chunks.push(chunk.value);
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    if (error instanceof WritingFailure) throw error;
    fail('bad_request');
  } finally {
    reader.releaseLock();
  }
  if (size < 100) fail('bad_request');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { bytes, type };
}

export type LetterRoute = 'letters' | 'letter' | 'retry' | 'notes' | 'ai' | 'transcribe';
const METHODS: Record<LetterRoute, string[]> = {
  letters: ['GET', 'POST'],
  letter: ['GET', 'PATCH'],
  retry: ['POST'],
  notes: ['GET', 'POST'],
  ai: ['GET'],
  transcribe: ['POST'],
};

export function createLetterHandler(
  config: WritingConfig,
  env: WritingEnvironment,
  fetcher: typeof fetch = fetch,
) {
  let ai: AiServiceConfig | null = null;
  try {
    ai = parseAiServiceConfig(env);
  } catch {
    ai = null;
  }
  return async (request: Request, route: LetterRoute, id?: string): Promise<Response> => {
    let origin: string | null = null;
    try {
      const incoming = request.headers.get('Origin');
      if (incoming !== null) {
        if (!isAllowedBrowserOrigin(config, incoming)) fail('forbidden');
        origin = incoming;
      }
      const methods = METHODS[route];
      if (request.method === 'OPTIONS')
        return withCors(preflight(request, origin, methods), origin, true);
      if (!methods.includes(request.method)) fail('bad_request');
      const url = new URL(request.url);
      const listing = route === 'letters' && request.method === 'GET';
      if (!listing && route !== 'transcribe' && url.search) fail('bad_request');
      const headers = await authenticate(request, config, fetcher);
      await requireBudget(request, config, fetcher, headers);
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, fetcher, headers, name, params);
      const parse = <T>(
        schema: z.ZodType<T>,
        value: unknown,
        code: 'bad_request' | 'internal_error',
      ): T => {
        const result = schema.safeParse(value);
        if (!result.success) fail(code);
        return result.data;
      };
      const letterId =
        id === undefined ? undefined : entryParamsSchema.parse({ id }).id.toLowerCase();
      let data: unknown;

      if (route === 'letters' && request.method === 'GET') {
        const { limit, cursor } = listQuery(url);
        const rows = parse(
          letterSchema.array().max(limit + 1),
          await call('letter_list', {
            p_limit: limit + 1,
            p_before_created_at: cursor?.created_at ?? null,
            p_before_id: cursor?.id ?? null,
          }),
          'internal_error',
        );
        const items = rows.slice(0, limit);
        const last = items.at(-1);
        data = parse(
          letterListSchema,
          { items, next_cursor: rows.length > limit && last ? encodeCursor(last) : null },
          'internal_error',
        );
      } else if (route === 'letters') {
        const body = parse(requestLetterSchema, await readBody(request), 'bad_request');
        data = parse(
          letterSchema,
          await call('letter_request', {
            p_entry_id: body.entry_id.toLowerCase(),
            p_expected_revision: body.expected_revision,
            p_journal_date: body.journal_date,
            p_deliver_at: body.deliver_at,
          }),
          'internal_error',
        );
        if ((data as { entry_id: string }).entry_id !== body.entry_id.toLowerCase())
          fail('internal_error');
      } else if (route === 'letter') {
        const result =
          request.method === 'PATCH'
            ? await call('letter_update', {
                p_id: letterId,
                p_patch: parse(patchLetterSchema, await readBody(request), 'bad_request'),
              })
            : await call('letter_get', { p_id: letterId });
        data = parse(letterSchema, result, 'internal_error');
        if ((data as { id: string }).id !== letterId) fail('internal_error');
      } else if (route === 'retry') {
        await readBody(request, { mustBeEmpty: true });
        data = parse(
          letterSchema,
          await call('letter_retry', { p_id: letterId }),
          'internal_error',
        );
        if ((data as { id: string }).id !== letterId) fail('internal_error');
      } else if (route === 'notes' && request.method === 'GET') {
        data = parse(noteListSchema, { items: await call('note_list', {}) }, 'internal_error');
      } else if (route === 'notes') {
        const { key } = parse(writeNoteSchema, await readBody(request), 'bad_request');
        if (!(await aiStatus(ai, fetcher)).notes || !ai) fail('not_ready');
        const input = parse(
          noteInputSchema,
          await call('note_input', { p_key: key }),
          'internal_error',
        );
        if (input.key !== key) fail('internal_error');
        if (!input.letters.length) fail('conflict');
        if ((await call('ai_spend', { p_kind: 'note' })) !== true) fail('internal_error');
        let reply: AiReply;
        try {
          reply = await callAi(
            ai,
            '/v1/notes',
            {
              method: 'POST',
              json: {
                version: 2,
                key,
                voice: input.voice,
                language: input.language,
                // Letter ids stay here; they are only needed to record the note's sources.
                letters: input.letters.map((l) => ({
                  date: l.date,
                  headline: l.headline,
                  tone: l.tone,
                  themes: l.themes,
                  theirWords: l.theirWords,
                  openQuestions: l.openQuestions,
                  todos: l.todos,
                })),
              },
            },
            170_000,
            fetcher,
          );
        } catch {
          fail('not_ready');
        }
        const output = aiNoteOutputSchema.safeParse(reply.body);
        if (reply.status !== 200 || !output.success) fail('not_ready');
        data = parse(
          noteSchema,
          await call('note_save', {
            p_key: key,
            p_text: output.data.text,
            p_model: output.data.model,
            p_source_ids: input.letters.map((l) => l.id),
          }),
          'internal_error',
        );
      } else if (route === 'ai') {
        data = await aiStatus(ai, fetcher);
      } else {
        const keys = [...url.searchParams.keys()];
        const spoken = spokenLanguageSchema.safeParse(url.searchParams.get('lang') ?? 'mixed');
        if (keys.some((k) => k !== 'lang') || keys.length > 1 || !spoken.success)
          fail('bad_request');
        const audio = await readAudio(request);
        if (!(await aiStatus(ai, fetcher)).transcribe || !ai) fail('not_ready');
        if ((await call('ai_spend', { p_kind: 'transcribe' })) !== true) fail('internal_error');
        let reply: AiReply;
        try {
          reply = await callAi(
            ai,
            `/v1/transcribe?lang=${spoken.data}`,
            { method: 'POST', bytes: audio.bytes, type: audio.type },
            130_000,
            fetcher,
          );
        } catch {
          fail('not_ready');
        }
        if (reply.status === 422 && aiError(reply) === 'no_speech') data = { text: '' };
        else {
          const output = transcriptSchema.safeParse(reply.body);
          if (reply.status !== 200 || !output.success) fail('not_ready');
          data = output.data;
        }
      }
      return withCors(dataResponse(data), origin);
    } catch (error) {
      return withCors(
        errorResponse(
          error instanceof WritingFailure
            ? error.code
            : error instanceof z.ZodError
              ? 'bad_request'
              : 'internal_error',
        ),
        origin,
        request.method === 'OPTIONS',
      );
    }
  };
}

const claimsSchema = z.array(z.strictObject({ id: z.uuid(), lease_token: z.uuid() })).max(5);
const processBody = z.strictObject({ limit: z.int().min(1).max(5).optional() });

/**
 * Scheduled worker: claims due letters, sends each prepared input to the AI
 * service and stores the checked result. Unconfigured AI leaves work untouched.
 */
export function createLetterProcessor(
  config: WritingConfig,
  worker: LetterWorkerConfig,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    try {
      if (request.method !== 'POST' || new URL(request.url).search) fail('bad_request');
      if (request.headers.has('Origin') || !validTrigger(request, worker.triggerSecret))
        fail('unauthorized');
      const body = processBody.safeParse(await readBody(request));
      if (!body.success) fail('bad_request');
      resetAiStatusCache();
      if (!(await aiStatus(worker.ai, fetcher)).letters)
        return dataResponse({
          claimed: 0,
          written: 0,
          failed: 0,
          released: 0,
          skipped: 0,
          waiting: true,
        });
      const headers = { apikey: worker.secretKey, Authorization: `Bearer ${worker.secretKey}` };
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, fetcher, headers, name, params);
      const claims = claimsSchema.safeParse(
        await call('letter_claim', { p_limit: body.data.limit ?? 3 }),
      );
      if (!claims.success) fail('internal_error');
      const counts = { written: 0, failed: 0, released: 0, skipped: 0 };
      await Promise.all(
        claims.data.map(async (job) => {
          const fence = { p_id: job.id, p_lease_token: job.lease_token };
          let input: z.infer<typeof aiLetterInputSchema>;
          try {
            input = aiLetterInputSchema.parse(await call('letter_input', fence));
            if (input.request_id !== job.id) throw new Error('Mismatched job.');
          } catch {
            // Context changed, the night was edited, or the account is closing: the
            // lease was cleared (or will expire) and the job is picked up fresh.
            counts.skipped++;
            return;
          }
          let outcome: 'finish' | 'release' | 'unavailable' | 'invalid_output' | 'refused' =
            'unavailable';
          let output: z.infer<typeof aiLetterOutputSchema> | null = null;
          try {
            const reply = await callAi(
              worker.ai,
              '/v1/letters',
              { method: 'POST', json: input },
              170_000,
              fetcher,
            );
            if (reply.status === 200) {
              const parsed = aiLetterOutputSchema.safeParse(reply.body);
              if (parsed.success && parsed.data.request_id === job.id) {
                output = parsed.data;
                outcome = 'finish';
              } else outcome = 'invalid_output';
            } else {
              const code = aiError(reply);
              outcome =
                code === 'not_configured'
                  ? 'release'
                  : code === 'invalid_output' || code === 'refused'
                    ? code
                    : 'unavailable';
            }
          } catch {
            outcome = 'unavailable';
          }
          try {
            if (outcome === 'finish' && output) {
              await call('letter_finish', {
                ...fence,
                p_content: output.content,
                p_model: output.model,
              });
              counts.written++;
            } else if (outcome === 'release') {
              await call('letter_release', fence);
              counts.released++;
            } else {
              await call('letter_fail', { ...fence, p_error: outcome });
              counts.failed++;
            }
          } catch {
            counts.skipped++;
          }
        }),
      );
      return dataResponse({ claimed: claims.data.length, ...counts, waiting: false });
    } catch (error) {
      return errorResponse(error instanceof WritingFailure ? error.code : 'internal_error');
    }
  };
}
