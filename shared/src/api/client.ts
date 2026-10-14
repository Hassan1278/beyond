import { z } from 'zod';
import {
  letterSchema,
  letterListSchema,
  requestLetterSchema,
  patchLetterSchema,
  noteSchema,
  noteListSchema,
  writeNoteSchema,
  aiStatusSchema,
  transcriptSchema,
  spokenLanguageSchema,
  type RequestLetter,
  type PatchLetter,
  type SpokenLanguage,
} from '../schemas/letters';
import { apiErrorSchema } from '../schemas/health';
import { accountSchema, clearedAccountDataSchema } from '../schemas/account';
import {
  createEntryBodySchema,
  patchEntryBodySchema,
  entrySchema,
  entryListSchema,
  entryListQuerySchema,
  entryParamsSchema,
} from '../schemas/entries';
import {
  settingsSchema,
  patchSettingsSchema,
  createMemorySchema,
  patchMemorySchema,
  memorySchema,
  memoryListSchema,
  createTodoSchema,
  patchTodoSchema,
  todoSchema,
  todoListSchema,
  deletingAccountSchema,
} from '../schemas/product';
import type { CreateEntryBody, PatchEntryBody } from '../schemas/entries';
import type {
  PatchSettings,
  CreateMemory,
  PatchMemory,
  CreateTodo,
  PatchTodo,
} from '../schemas/product';
import {
  accountExportQuerySchema,
  accountExportPageSchema,
  type AccountExportQuery,
} from '../schemas/export';

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly requestId: string | null = null,
  ) {
    super('The API request could not be completed.');
    this.name = 'ApiClientError';
  }
}
/** Token is obtained anew per call. This client stores no sessions or privileged keys. */
export function createApiClient(options: {
  origin: string;
  getAccessToken: () => string | null | Promise<string | null>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const origin = new URL(options.origin);
  const local =
    origin.hostname === 'localhost' ||
    origin.hostname === '[::1]' ||
    /^127(?:\.\d{1,3}){3}$/.test(origin.hostname);
  if (
    origin.origin !== options.origin ||
    origin.username ||
    origin.password ||
    (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local))
  )
    throw new Error('Invalid API origin.');
  const timeoutMs = options.timeoutMs ?? 20_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new Error('Invalid API timeout.');
  // Writing a note or transcribing waits on the AI service, so those calls get longer.
  const slowTimeoutMs = 180_000;
  const fetcher = options.fetcher ?? fetch;
  const id = (value: string) => entryParamsSchema.parse({ id: value }).id;
  const query = (value: { limit?: string; cursor?: string } = {}) => {
    const validated = entryListQuerySchema.parse(value);
    const params = new URLSearchParams(validated as Record<string, string>);
    return params.size ? `?${params}` : '';
  };
  async function call<T>(
    path: string,
    method: string,
    schema: z.ZodType<T>,
    body?: unknown,
    signal?: AbortSignal,
    extra: { raw?: { body: Blob; type: string }; timeoutMs?: number } = {},
  ): Promise<T> {
    const raw = extra.raw;
    const abort = new AbortController();
    let rejectCancelled: (error: ApiClientError) => void = () => undefined;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectCancelled = reject;
    });
    void cancelled.catch(() => undefined);
    const onAbort = () => {
      abort.abort();
      rejectCancelled(new ApiClientError('cancelled', 0));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(onAbort, extra.timeoutMs ?? timeoutMs);
    if (signal?.aborted) onAbort();
    const bounded = <R>(work: Promise<R>): Promise<R> => Promise.race([work, cancelled]);
    try {
      if (abort.signal.aborted) throw new ApiClientError('cancelled', 0);
      const token = await bounded(Promise.resolve().then(options.getAccessToken));
      if (!token || !/^[A-Za-z0-9._~+\/-]+=*$/.test(token))
        throw new ApiClientError('unauthorized', 401);
      const response = await bounded(
        fetcher(`${origin.origin}/api/v1${path}`, {
          method,
          cache: 'no-store',
          redirect: 'error',
          signal: abort.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(raw
              ? { 'Content-Type': raw.type }
              : body === undefined
                ? {}
                : { 'Content-Type': 'application/json' }),
          },
          ...(raw ? { body: raw.body } : body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
      if (!response.body) throw new ApiClientError('invalid_response', response.status);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        for (;;) {
          const next = await bounded(reader.read());
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 8_000_000) {
            void reader.cancel().catch(() => undefined);
            throw new ApiClientError('invalid_response', response.status);
          }
          chunks.push(next.value);
        }
      } finally {
        if (abort.signal.aborted) void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const all = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
      }
      const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all));
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(data);
        throw new ApiClientError(
          error.success ? error.data.error.code : 'invalid_response',
          response.status,
          error.success ? error.data.error.request_id : null,
        );
      }
      const parsed = z.strictObject({ data: schema }).safeParse(data);
      if (!parsed.success) throw new ApiClientError('invalid_response', response.status);
      return parsed.data.data;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError(abort.signal.aborted ? 'cancelled' : 'unavailable', 0);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  return {
    letters: {
      list: (page?: { limit?: string; cursor?: string }, signal?: AbortSignal) =>
        call(`/letters${query(page)}`, 'GET', letterListSchema, undefined, signal),
      get: (value: string, signal?: AbortSignal) =>
        call(`/letters/${id(value)}`, 'GET', letterSchema, undefined, signal),
      /** Seal a saved night: asks for one letter about it. */
      request: (body: RequestLetter, signal?: AbortSignal) =>
        call('/letters', 'POST', letterSchema, requestLetterSchema.parse(body), signal),
      update: (value: string, body: PatchLetter, signal?: AbortSignal) =>
        call(`/letters/${id(value)}`, 'PATCH', letterSchema, patchLetterSchema.parse(body), signal),
      retry: (value: string, signal?: AbortSignal) =>
        call(`/letters/${id(value)}/retry`, 'POST', letterSchema, undefined, signal),
    },
    notes: {
      list: (signal?: AbortSignal) => call('/notes', 'GET', noteListSchema, undefined, signal),
      write: (key: string, signal?: AbortSignal) =>
        call('/notes', 'POST', noteSchema, writeNoteSchema.parse({ key }), signal, {
          timeoutMs: slowTimeoutMs,
        }),
    },
    ai: {
      status: (signal?: AbortSignal) => call('/ai', 'GET', aiStatusSchema, undefined, signal),
      /** One recording in, words out. The backend and AI service keep nothing. */
      transcribe: (audio: Blob, spoken: SpokenLanguage, signal?: AbortSignal) => {
        const type = (audio.type || 'audio/webm').split(';')[0]!.trim().toLowerCase();
        if (!/^audio\/[a-z0-9.+-]{1,40}$/.test(type) || audio.size < 100 || audio.size > 4_000_000)
          throw new ApiClientError('bad_request', 0);
        return call(
          `/transcribe?lang=${encodeURIComponent(spokenLanguageSchema.parse(spoken))}`,
          'POST',
          transcriptSchema,
          undefined,
          signal,
          { raw: { body: audio, type }, timeoutMs: slowTimeoutMs },
        );
      },
    },
    entries: {
      list: (page?: { limit?: string; cursor?: string }, signal?: AbortSignal) =>
        call(`/entries${query(page)}`, 'GET', entryListSchema, undefined, signal),
      get: (value: string, signal?: AbortSignal) =>
        call(`/entries/${id(value)}`, 'GET', entrySchema, undefined, signal),
      create: (body: CreateEntryBody, signal?: AbortSignal) =>
        call('/entries', 'POST', entrySchema, createEntryBodySchema.parse(body), signal),
      update: (value: string, body: PatchEntryBody, signal?: AbortSignal) =>
        call(
          `/entries/${id(value)}`,
          'PATCH',
          entrySchema,
          patchEntryBodySchema.parse(body),
          signal,
        ),
      delete: (value: string, signal?: AbortSignal) =>
        call(`/entries/${id(value)}`, 'DELETE', entryParamsSchema, undefined, signal),
    },
    settings: {
      get: (signal?: AbortSignal) => call('/settings', 'GET', settingsSchema, undefined, signal),
      update: (body: PatchSettings, signal?: AbortSignal) =>
        call('/settings', 'PATCH', settingsSchema, patchSettingsSchema.parse(body), signal),
    },
    memories: {
      list: (page?: { limit?: string; cursor?: string }, signal?: AbortSignal) =>
        call(`/memories${query(page)}`, 'GET', memoryListSchema, undefined, signal),
      get: (value: string, signal?: AbortSignal) =>
        call(`/memories/${id(value)}`, 'GET', memorySchema, undefined, signal),
      create: (body: CreateMemory, signal?: AbortSignal) =>
        call('/memories', 'POST', memorySchema, createMemorySchema.parse(body), signal),
      update: (value: string, body: PatchMemory, signal?: AbortSignal) =>
        call(
          `/memories/${id(value)}`,
          'PATCH',
          memorySchema,
          patchMemorySchema.parse(body),
          signal,
        ),
      delete: (value: string, signal?: AbortSignal) =>
        call(`/memories/${id(value)}`, 'DELETE', entryParamsSchema, undefined, signal),
    },
    todos: {
      list: (page?: { limit?: string; cursor?: string }, signal?: AbortSignal) =>
        call(`/todos${query(page)}`, 'GET', todoListSchema, undefined, signal),
      get: (value: string, signal?: AbortSignal) =>
        call(`/todos/${id(value)}`, 'GET', todoSchema, undefined, signal),
      create: (body: CreateTodo, signal?: AbortSignal) =>
        call('/todos', 'POST', todoSchema, createTodoSchema.parse(body), signal),
      update: (value: string, body: PatchTodo, signal?: AbortSignal) =>
        call(`/todos/${id(value)}`, 'PATCH', todoSchema, patchTodoSchema.parse(body), signal),
      delete: (value: string, signal?: AbortSignal) =>
        call(`/todos/${id(value)}`, 'DELETE', entryParamsSchema, undefined, signal),
    },
    account: {
      get: (signal?: AbortSignal) => call('/account', 'GET', accountSchema, undefined, signal),
      clearData: (signal?: AbortSignal) =>
        call('/account/data', 'DELETE', clearedAccountDataSchema, undefined, signal),
      exportPage: async (page: AccountExportQuery, signal?: AbortSignal) => {
        const validated = accountExportQuerySchema.parse(page);
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(validated))
          if (value !== undefined) params.set(key, value);
        const result = await call(
          `/account/export?${params}`,
          'GET',
          accountExportPageSchema,
          undefined,
          signal,
        );
        if (result.section !== validated.section) throw new ApiClientError('invalid_response', 200);
        return result;
      },
      delete: (signal?: AbortSignal) =>
        call('/account', 'DELETE', deletingAccountSchema, undefined, signal),
    },
  };
}
