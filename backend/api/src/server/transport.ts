import { Buffer } from 'node:buffer';
import {
  entryParamsSchema,
  entryListQuerySchema,
  entryCursorSchema,
  type ApiErrorCode,
} from '@beyond/shared';
import { type WritingConfig } from './config-parser';
import { dataResponse } from './http';
const maxBodyBytes = 128_000;
const bodyTimeoutMs = 5_000;
const upstreamTimeoutMs = 5_000;
const corsHeaders = ['authorization', 'content-type'] as const;
const unpairedSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const jsonContentType =
  /^application\/json(?:\s*;\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+\s*=\s*(?:[A-Za-z0-9!#$%&'*+.^_`|~-]+|"[^"\r\n]*"))*\s*$/i;

type Cursor = ReturnType<typeof entryCursorSchema.parse>;

export class WritingFailure extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
  }
}

export function fail(code: ApiErrorCode): never {
  throw new WritingFailure(code);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function withCors(response: Response, origin: string | null, preflight = false): Response {
  response.headers.set(
    'Vary',
    preflight ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers' : 'Origin',
  );
  if (origin !== null) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Expose-Headers', 'X-Request-Id, Retry-After');
  }
  return response;
}

export function preflight(
  request: Request,
  origin: string | null,
  methods: readonly string[],
): Response {
  if (
    origin === null ||
    !methods.includes(request.headers.get('Access-Control-Request-Method') ?? '')
  ) {
    fail('forbidden');
  }

  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  if (requestedHeaders !== null) {
    const names = requestedHeaders.split(',').map((name) => name.trim().toLowerCase());
    if (
      names.some((name) => !corsHeaders.some((allowed) => name === allowed)) ||
      new Set(names).size !== names.length
    ) {
      fail('forbidden');
    }
  }

  const response = dataResponse(null);
  response.headers.delete('Content-Type');
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', corsHeaders.join(', '));
  return new Response(null, { status: 204, headers: response.headers });
}

export async function boundedUpstream<T>(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new WritingFailure('not_ready'));
      controller.abort();
    }, upstreamTimeoutMs);
  });

  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher(url, {
          ...init,
          cache: 'no-store',
          redirect: 'error',
          signal: controller.signal,
        });
        const result = await consume(response);
        if (controller.signal.aborted) {
          fail('not_ready');
        }
        return result;
      })(),
      deadline,
    ]);
  } catch (error) {
    if (error instanceof WritingFailure) {
      throw error;
    }
    fail('not_ready');
  } finally {
    clearTimeout(timer);
  }
}

export async function upstreamJson(
  response: Response,
  invalidCode: ApiErrorCode,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(invalidCode);
    }
    fail('not_ready');
  }
}

export async function verifyIdentity(
  request: Request,
  config: WritingConfig,
  fetcher: typeof fetch,
): Promise<{ headers: Readonly<Record<string, string>>; userId: string }> {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/i.test(authorization)) {
    fail('unauthorized');
  }
  const headers = { apikey: config.supabasePublishableKey, Authorization: authorization };
  const userId = await boundedUpstream(
    fetcher,
    `${config.supabaseUrl}/auth/v1/user`,
    { method: 'GET', headers },
    async (response) => {
      if ([400, 401, 403, 422].includes(response.status)) {
        fail('unauthorized');
      }
      if (!response.ok) {
        fail('not_ready');
      }
      const user = await upstreamJson(response, 'not_ready');
      const parsed = entryParamsSchema.safeParse({ id: isRecord(user) ? user.id : undefined });
      if (!parsed.success) {
        fail('unauthorized');
      }
      return parsed.data.id.toLowerCase();
    },
  );

  return { headers, userId };
}

export async function authenticate(
  request: Request,
  config: WritingConfig,
  fetcher: typeof fetch,
): Promise<Readonly<Record<string, string>>> {
  const { headers, userId } = await verifyIdentity(request, config, fetcher);
  await boundedUpstream(
    fetcher,
    `${config.supabaseUrl}/rest/v1/profiles?select=id,status&id=eq.${userId}`,
    { method: 'GET', headers },
    async (response) => {
      if (response.status === 401) {
        fail('unauthorized');
      }
      if (response.status === 403) {
        fail('forbidden');
      }
      if (!response.ok) {
        fail('not_ready');
      }
      const profiles = await upstreamJson(response, 'not_ready');
      if (!Array.isArray(profiles)) {
        fail('not_ready');
      }
      if (profiles.length === 0) {
        fail('forbidden');
      }
      const profile: unknown = profiles[0];
      if (profiles.length !== 1 || !isRecord(profile)) {
        fail('not_ready');
      }
      if (profile.id !== userId || profile.status !== 'active') {
        fail('forbidden');
      }
    },
  );
  return headers;
}

export async function rpc(
  config: WritingConfig,
  fetcher: typeof fetch,
  headers: Readonly<Record<string, string>>,
  name: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return boundedUpstream(
    fetcher,
    `${config.supabaseUrl}/rest/v1/rpc/${name}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    async (response) => {
      if (response.status === 401) {
        fail('unauthorized');
      }
      if ([408, 502, 503, 504].includes(response.status)) {
        fail('not_ready');
      }
      const result = await upstreamJson(response, 'internal_error');
      if (!response.ok) {
        if (isRecord(result)) {
          if (result.code === '57014') {
            fail('not_ready');
          }
          if (result.code === 'P0001') {
            switch (result.message) {
              case 'unauthorized':
              case 'bad_request':
              case 'forbidden':
              case 'not_found':
              case 'conflict':
                fail(result.message);
            }
          }
        }
        fail('internal_error');
      }
      return result;
    },
  );
}

function validateJsonStrings(value: unknown): void {
  if (typeof value === 'string') {
    if (value.includes('\u0000') || unpairedSurrogate.test(value)) {
      fail('bad_request');
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      validateJsonStrings(item);
    }
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateJsonStrings(key);
      validateJsonStrings(item);
    }
  }
}

export async function readBody(
  request: Request,
  { mustBeEmpty = false }: { mustBeEmpty?: boolean } = {},
): Promise<unknown> {
  if (!mustBeEmpty && !jsonContentType.test(request.headers.get('Content-Type') ?? '')) {
    fail('bad_request');
  }
  if (!request.body) {
    if (mustBeEmpty) return undefined;
    fail('bad_request');
  }
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    fail('bad_request');
  }
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  let bytes = 0;
  let text = '';
  let pendingRead: ReturnType<typeof reader.read> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort!: () => void;
  const interruption = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new WritingFailure('bad_request'));
    timer = setTimeout(onAbort, bodyTimeoutMs);
    request.signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    if (request.signal.aborted) {
      fail('bad_request');
    }
    while (true) {
      pendingRead = reader.read();
      const { done, value } = await Promise.race([pendingRead, interruption]);
      pendingRead = undefined;
      if (request.signal.aborted) {
        fail('bad_request');
      }
      if (done) {
        break;
      }
      bytes += value.byteLength;
      if (bytes > maxBodyBytes || (mustBeEmpty && bytes > 0)) {
        fail('bad_request');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (mustBeEmpty) return undefined;
    if (text.includes('\u0000') || unpairedSurrogate.test(text)) {
      fail('bad_request');
    }
    const result: unknown = JSON.parse(text);
    validateJsonStrings(result);
    return result;
  } catch {
    void reader.cancel().catch(() => undefined);
    // Cancellation settles pending reads even if the source's cancel promise never settles.
    await pendingRead?.catch(() => undefined);
    fail('bad_request');
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(
    JSON.stringify({ created_at: cursor.created_at, id: cursor.id }),
    'utf-8',
  ).toString('base64url');
}

export function decodeCursor(value: string): Cursor {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.toString('base64url') !== value) {
      fail('bad_request');
    }
    const json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const raw: unknown = JSON.parse(json);
    const parsed = entryCursorSchema.safeParse(raw);
    if (!parsed.success || encodeCursor(parsed.data) !== value) {
      fail('bad_request');
    }
    return parsed.data;
  } catch {
    fail('bad_request');
  }
}

export function listQuery(url: URL): { limit: number; cursor: Cursor | null } {
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if ((key !== 'limit' && key !== 'cursor') || Object.hasOwn(query, key)) {
      fail('bad_request');
    }
    query[key] = value;
  }
  const parsed = entryListQuerySchema.safeParse(query);
  if (!parsed.success) {
    fail('bad_request');
  }
  return {
    limit: parsed.data.limit === undefined ? 20 : Number(parsed.data.limit),
    cursor: parsed.data.cursor === undefined ? null : decodeCursor(parsed.data.cursor),
  };
}
