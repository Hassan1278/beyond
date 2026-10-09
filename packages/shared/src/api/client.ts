import { z } from 'zod';
import { apiErrorSchema } from '../schemas/health';
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
  ): Promise<T> {
    const token = await options.getAccessToken();
    if (!token || !/^[A-Za-z0-9._~+\/-]+=*$/.test(token))
      throw new ApiClientError('unauthorized', 401);
    const abort = new AbortController();
    const onAbort = () => abort.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) abort.abort();
    const timer = setTimeout(onAbort, timeoutMs);
    try {
      const response = await fetcher(`${origin.origin}/api/v1${path}`, {
        method,
        cache: 'no-store',
        redirect: 'error',
        signal: abort.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data: unknown = await response.json();
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
