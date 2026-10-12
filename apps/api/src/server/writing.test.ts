import { Buffer } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, entryListSchema, entrySchema, type ApiErrorCode } from '@beyond/shared';
import { parseWritingConfig } from './config-parser';
import { createWritingHandler } from './writing';

vi.mock('server-only', () => ({}));
vi.mock('./config', () => ({ loadWritingConfig: vi.fn() }));
import { loadWritingConfig } from './config';
import { handleWritingRequest } from './writing-runtime';
import * as collectionRoute from '../app/api/v1/entries/route';
import * as itemRoute from '../app/api/v1/entries/[id]/route';

const config = parseWritingConfig({
  SUPABASE_URL: 'https://database.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fictional_key',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test,http://localhost:3000',
});
const origin = 'https://web.example.test';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const key = '33333333-3333-4333-8333-333333333333';
const authorization = 'Bearer fictional.access.token';
const entry = {
  id,
  text: '  Fictional journal text.\n',
  revision: 1,
  reflection_opt_in: false,
  created_at: '2026-10-09T12:30:00.123456Z',
  updated_at: '2026-10-09T12:30:00.123456Z',
} as const;
const createBody = { text: entry.text, idempotency_key: key, reflection_opt_in: false };
const patchBody = { text: ' Fictional edited text. ', expected_revision: 1 };
const encoder = new TextEncoder();

function request(method = 'GET', init: RequestInit = {}, query = ''): Request {
  const headers = new Headers({ Authorization: authorization, Origin: origin });
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  return new Request(`https://api.example.test/api/v1/entries${query}`, {
    ...init,
    method,
    headers,
  });
}

function jsonRequest(method: string, value: unknown, query = ''): Request {
  return request(
    method,
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(value),
    },
    query,
  );
}

function rawRequest(
  body: string | Uint8Array<ArrayBuffer>,
  contentType = 'application/json',
): Request {
  return request('POST', { headers: { 'Content-Type': contentType }, body });
}

function streamedRequest(chunks: readonly Uint8Array[], contentLength?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (contentLength !== undefined) {
    headers['Content-Length'] = contentLength;
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  const init: RequestInit & { duplex: 'half' } = { body, headers, duplex: 'half' };
  return request('POST', init);
}

function authenticatedFetch(result: unknown = entry, status = 200) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id: userId }))
    .mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]))
    .mockResolvedValueOnce(Response.json(result, { status }));
}

function cursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64url');
}

function rpcBody(fetcher: ReturnType<typeof authenticatedFetch>): unknown {
  const body = fetcher.mock.calls[2]?.[1]?.body;
  expect(typeof body).toBe('string');
  return JSON.parse(body as string);
}

async function expectError(response: Response, status: number, code: ApiErrorCode): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const body = apiErrorSchema.parse(await response.json());
  expect(body.error.code).toBe(code);
  expect(body.error.request_id).toBe(response.headers.get('X-Request-Id'));
  expect(JSON.stringify(body)).not.toContain('Fictional private');
  expect(JSON.stringify(body)).not.toContain(config.supabasePublishableKey);
  expect(JSON.stringify(body)).not.toContain(authorization);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('writing identity boundary (mock fixtures, not live Auth/Postgres acceptance)', () => {
  it.each([null, '', 'Basic fictional', 'Bearer', 'Bearer first second', 'Bearer a,b'])(
    'rejects malformed authorization %j before any upstream or body read',
    async (value) => {
      const req = jsonRequest('POST', createBody);
      if (value === null) {
        req.headers.delete('Authorization');
      } else {
        req.headers.set('Authorization', value);
      }
      const fetcher = vi.fn<typeof fetch>();
      await expectError(await createWritingHandler(config, fetcher)(req), 401, 'unauthorized');
      expect(fetcher).not.toHaveBeenCalled();
      expect(req.bodyUsed).toBe(false);
    },
  );

  it.each([400, 401, 403, 422])(
    'rejects expired or invalid Auth status %s without profile access',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: 'Fictional private token detail.' }, { status }),
        );
      const req = jsonRequest('POST', createBody);
      await expectError(await createWritingHandler(config, fetcher)(req), 401, 'unauthorized');
      expect(fetcher).toHaveBeenCalledOnce();
      expect(req.bodyUsed).toBe(false);
    },
  );

  it.each(
    [{}, null, { id: 'not-a-uuid' }, { id: `${userId}&status=eq.active` }, [userId]].map(
      (result) => ({ result }),
    ),
  )('requires a raw Auth user object with a UUID identity: $result', async ({ result }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
    await expectError(await createWritingHandler(config, fetcher)(request()), 401, 'unauthorized');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(
    [[], [{ id: userId, status: 'deleting' }], [{ id: otherUserId, status: 'active' }]].map(
      (profiles) => ({ profiles }),
    ),
  )('rejects missing, deleting or wrong profiles: $profiles', async ({ profiles }) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json(profiles));
    const req = jsonRequest('POST', createBody);
    await expectError(await createWritingHandler(config, fetcher)(req), 403, 'forbidden');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(req.bodyUsed).toBe(false);
  });

  it.each(
    [
      null,
      {},
      [null],
      [
        { id: userId, status: 'active' },
        { id: userId, status: 'active' },
      ],
    ].map((profiles) => ({ profiles })),
  )('fails closed on malformed profile result $profiles', async ({ profiles }) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json(profiles));
    await expectError(await createWritingHandler(config, fetcher)(request()), 503, 'not_ready');
  });

  it.each([
    { upstreamStatus: 401, status: 401, code: 'unauthorized' },
    { upstreamStatus: 403, status: 403, code: 'forbidden' },
  ] as const)(
    'maps profile HTTP $upstreamStatus without reading the request body',
    async ({ upstreamStatus, status, code }) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ id: userId }))
        .mockResolvedValueOnce(
          new Response('Fictional private profile error.', { status: upstreamStatus }),
        );
      const req = jsonRequest('POST', createBody);
      await expectError(await createWritingHandler(config, fetcher)(req), status, code);
      expect(req.bodyUsed).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('freshly verifies Auth and active profile with the same user token/key and uncached bounded fetch', async () => {
    const fetcher = authenticatedFetch();
    const response = await createWritingHandler(config, fetcher)(request(), id);
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${config.supabaseUrl}/auth/v1/user`);
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      `${config.supabaseUrl}/rest/v1/profiles?select=id,status&id=eq.${userId}`,
    );
    expect(fetcher.mock.calls[2]?.[0]).toBe(`${config.supabaseUrl}/rest/v1/rpc/entry_get`);
    for (const [, init] of fetcher.mock.calls) {
      expect(init).toMatchObject({
        cache: 'no-store',
        redirect: 'error',
        signal: expect.any(AbortSignal),
      });
      expect(new Headers(init?.headers).get('Authorization')).toBe(authorization);
      expect(new Headers(init?.headers).get('apikey')).toBe(config.supabasePublishableKey);
      expect(init?.signal?.aborted).toBe(false);
    }
    expect(fetcher.mock.calls.slice(0, 2).every(([, init]) => init?.method === 'GET')).toBe(true);
    expect(fetcher.mock.calls[2]?.[1]?.method).toBe('POST');
    expect(rpcBody(fetcher)).toStrictEqual({ p_id: id });
  });

  it('accepts uppercase UUID identity and route params while using canonical database IDs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: userId.toUpperCase() }))
      .mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]))
      .mockResolvedValueOnce(Response.json({ ...entry, id: otherUserId }));
    const response = await createWritingHandler(config, fetcher)(
      request(),
      otherUserId.toUpperCase(),
    );
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[1]?.[0]).toContain(`id=eq.${userId}`);
    expect(rpcBody(fetcher)).toStrictEqual({ p_id: otherUserId });
  });
});

describe('writing CORS', () => {
  it.each([
    '*',
    'null',
    'https://other.example.test',
    `${origin}/`,
    'https://WEB.example.test',
    `${origin}:443`,
    `${origin}, https://other.example.test`,
  ])(
    'blocks nonlisted or noncanonical origin %j without ACAO or upstream access',
    async (blockedOrigin) => {
      const fetcher = vi.fn<typeof fetch>();
      const response = await createWritingHandler(
        config,
        fetcher,
      )(request('GET', { headers: { Origin: blockedOrigin } }));
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
      expect(response.headers.get('Vary')).toBe('Origin');
      await expectError(response, 403, 'forbidden');
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('does not treat a wildcard in injected configuration as permission', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const handler = createWritingHandler({ ...config, corsAllowedOrigins: ['*'] }, fetcher);
    await expectError(
      await handler(request('GET', { headers: { Origin: '*' } })),
      403,
      'forbidden',
    );
    await expectError(await handler(request()), 403, 'forbidden');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('allows the configured canonical loopback development origin', async () => {
    const fetcher = authenticatedFetch();
    const response = await createWritingHandler(config, fetcher)(
      request('GET', { headers: { Origin: 'http://localhost:3000' } }),
      id,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('allows native requests without Origin only with bearer verification', async () => {
    const req = request();
    req.headers.delete('Origin');
    const fetcher = authenticatedFetch();
    const response = await createWritingHandler(config, fetcher)(req, id);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
    req.headers.delete('Authorization');
    await expectError(await createWritingHandler(config, fetcher)(req, id), 401, 'unauthorized');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('exposes only request ID for an allowed origin on success and errors, without credentials', async () => {
    const success = await createWritingHandler(config, authenticatedFetch())(request(), id);
    const failure = await createWritingHandler(
      config,
      vi.fn<typeof fetch>(),
    )(request('GET', { headers: { Authorization: 'Basic fictional' } }));
    for (const response of [success, failure]) {
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Expose-Headers')).toBe('X-Request-Id');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
      expect(response.headers.get('Vary')).toBe('Origin');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it.each([
    { method: 'GET', item: false, allowed: 'GET, POST' },
    { method: 'POST', item: false, allowed: 'GET, POST' },
    { method: 'GET', item: true, allowed: 'GET, PATCH, DELETE' },
    { method: 'PATCH', item: true, allowed: 'GET, PATCH, DELETE' },
    { method: 'DELETE', item: true, allowed: 'GET, PATCH, DELETE' },
  ])(
    'allows unauthenticated route-specific $method preflight (item=$item)',
    async ({ method, item, allowed }) => {
      const req = request('OPTIONS', {
        headers: {
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': 'Authorization, Content-Type',
        },
      });
      req.headers.delete('Authorization');
      const fetcher = vi.fn<typeof fetch>();
      const response = await createWritingHandler(config, fetcher)(req, item ? id : undefined);
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(response.headers.get('Content-Type')).toBeNull();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(allowed);
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'authorization, content-type',
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
      expect(response.headers.get('Access-Control-Expose-Headers')).toBe('X-Request-Id');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.headers.get('Vary')).toBe(
        'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    { method: '*', headers: 'authorization', item: false },
    { method: 'PATCH', headers: 'authorization', item: false },
    { method: 'POST', headers: 'authorization', item: true },
    { method: 'GET, POST', headers: 'authorization', item: false },
    { method: 'post', headers: 'authorization', item: false },
    { method: 'POST', headers: '*', item: false },
    { method: 'POST', headers: 'authorization, cookie', item: false },
    { method: 'POST', headers: 'authorization,', item: false },
    { method: 'POST', headers: 'authorization, Authorization', item: false },
  ])(
    'rejects unsupported preflight $method/$headers (item=$item)',
    async ({ method, headers, item }) => {
      const fetcher = vi.fn<typeof fetch>();
      const req = request('OPTIONS', {
        headers: {
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': headers,
        },
      });
      const response = await createWritingHandler(config, fetcher)(req, item ? id : undefined);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeNull();
      expect(response.headers.get('Vary')).toContain('Access-Control-Request-Headers');
      await expectError(response, 403, 'forbidden');
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('allows omitted requested headers but rejects missing preflight method or origin', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const handler = createWritingHandler(config, fetcher);
    const req = request('OPTIONS', { headers: { 'Access-Control-Request-Method': 'GET' } });
    expect((await handler(req)).status).toBe(204);
    req.headers.delete('Origin');
    await expectError(await handler(req), 403, 'forbidden');
    req.headers.set('Origin', origin);
    req.headers.delete('Access-Control-Request-Method');
    await expectError(await handler(req), 403, 'forbidden');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('writing input validation and RPC dispatch', () => {
  it.each([true, false])(
    'returns only the current entry resource for create/replay (created=%s)',
    async (created) => {
      const current = { ...entry, revision: 3, text: 'Fictional current text after edits.' };
      const fetcher = authenticatedFetch({ entry: current, created });
      const response = await createWritingHandler(config, fetcher)(jsonRequest('POST', createBody));
      expect(response.status).toBe(200);
      expect(await response.json()).toStrictEqual({ data: current });
      expect(fetcher.mock.calls[2]?.[0]).toBe(`${config.supabaseUrl}/rest/v1/rpc/entry_create`);
      expect(rpcBody(fetcher)).toStrictEqual({
        p_text: entry.text,
        p_idempotency_key: key,
        p_reflection_opt_in: false,
      });
    },
  );

  it('PATCH passes only text, ID and expected revision; DELETE returns only ID', async () => {
    const updated = { ...entry, text: patchBody.text, revision: 2 };
    const patchFetch = authenticatedFetch(updated);
    const patched = await createWritingHandler(config, patchFetch)(
      jsonRequest('PATCH', patchBody),
      id,
    );
    expect(await patched.json()).toStrictEqual({ data: updated });
    expect(patchFetch.mock.calls[2]?.[0]).toBe(`${config.supabaseUrl}/rest/v1/rpc/entry_update`);
    expect(rpcBody(patchFetch)).toStrictEqual({
      p_id: id,
      p_text: patchBody.text,
      p_expected_revision: 1,
    });
    const deleteFetch = authenticatedFetch({ id });
    const deleted = await createWritingHandler(config, deleteFetch)(request('DELETE'), id);
    expect(await deleted.json()).toStrictEqual({ data: { id } });
    expect(deleteFetch.mock.calls[2]?.[0]).toBe(`${config.supabaseUrl}/rest/v1/rpc/entry_delete`);
    expect(rpcBody(deleteFetch)).toStrictEqual({ p_id: id });
  });

  it.each(
    [
      {},
      null,
      [],
      { ...createBody, owner_id: userId },
      { ...createBody, text: '' },
      { ...createBody, text: ' \n\t' },
      { ...createBody, text: 'x'.repeat(20_001) },
      { ...createBody, text: 'bad\u0000text' },
      { ...createBody, text: '\ud800' },
      { ...createBody, text: '\udfff' },
      { ...createBody, idempotency_key: 'invalid' },
      { ...createBody, reflection_opt_in: true },
      { text: entry.text, idempotency_key: key },
    ].map((body) => ({ body })),
  )('rejects invalid or extra create fields: $body', async ({ body }) => {
    const fetcher = authenticatedFetch();
    await expectError(
      await createWritingHandler(config, fetcher)(jsonRequest('POST', body)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ...patchBody, expected_revision: 0 },
    { ...patchBody, expected_revision: 2_147_483_648 },
    { ...patchBody, expected_revision: '1' },
    { ...patchBody, expected_revision: 1.5 },
    { ...patchBody, reflection_opt_in: false },
    { ...patchBody, owner_id: userId },
    { text: patchBody.text },
    { expected_revision: 1 },
    { ...patchBody, text: '\ud800' },
  ])('rejects invalid PATCH body %j', async (body) => {
    const fetcher = authenticatedFetch();
    await expectError(
      await createWritingHandler(config, fetcher)(jsonRequest('PATCH', body), id),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    'text/plain',
    'application/jsonp',
    'application/problem+json',
    'application/json; charset',
    'application/json, text/plain',
  ])('requires a valid JSON media type rather than %j', async (contentType) => {
    const fetcher = authenticatedFetch();
    const req = rawRequest(JSON.stringify(createBody), contentType);
    await expectError(await createWritingHandler(config, fetcher)(req), 400, 'bad_request');
    expect(req.bodyUsed).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    '',
    '{',
    '{} trailing',
    '\u0000',
    '{"text":"\\uD800"}',
    '{"text":"\\u0000"}',
    '{"\\uDFFF":"value"}',
    '{"text":NaN}',
    '\ufeff{}',
  ])('rejects malformed or invalid-Unicode JSON %j', async (body) => {
    const fetcher = authenticatedFetch();
    await expectError(
      await createWritingHandler(config, fetcher)(rawRequest(body)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects missing body and missing content type', async () => {
    const noBodyFetch = authenticatedFetch();
    await expectError(
      await createWritingHandler(
        config,
        noBodyFetch,
      )(request('POST', { headers: { 'Content-Type': 'application/json' } })),
      400,
      'bad_request',
    );
    const noTypeFetch = authenticatedFetch();
    const req = jsonRequest('POST', createBody);
    req.headers.delete('Content-Type');
    await expectError(await createWritingHandler(config, noTypeFetch)(req), 400, 'bad_request');
  });

  it.each(
    [
      [0xc0, 0x80],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
      [0xe2, 0x82],
    ].map((bytes) => ({ bytes })),
  )('rejects malformed UTF-8 bytes $bytes rather than replacing them', async ({ bytes }) => {
    const fetcher = authenticatedFetch();
    await expectError(
      await createWritingHandler(config, fetcher)(rawRequest(new Uint8Array(bytes))),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PATCH'])(
    'bounds a never-ending %s body to 5000ms total and cancels before releasing its reader',
    async (method) => {
      vi.useFakeTimers();
      let streamController!: ReadableStreamDefaultController<Uint8Array>;
      const cancel = vi.fn(() => new Promise<void>(() => undefined));
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
          controller.enqueue(
            encoder.encode(JSON.stringify(method === 'POST' ? createBody : patchBody)),
          );
        },
        pull: () => new Promise<void>(() => undefined),
        cancel,
      });
      const init: RequestInit & { duplex: 'half' } = {
        body,
        headers: { 'Content-Type': 'application/json' },
        duplex: 'half',
      };
      const req = request(method, init);
      const reader = req.body!.getReader();
      vi.spyOn(req.body!, 'getReader').mockReturnValue(reader);
      const read = vi.spyOn(reader, 'read');
      const cancelReader = vi.spyOn(reader, 'cancel');
      const release = vi.spyOn(reader, 'releaseLock');
      const addListener = vi.spyOn(req.signal, 'addEventListener');
      const removeListener = vi.spyOn(req.signal, 'removeEventListener');
      const fetcher = authenticatedFetch();
      const pending = createWritingHandler(config, fetcher)(
        req,
        method === 'PATCH' ? id : undefined,
      );
      let settled = false;
      void pending.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(4_999);
      expect(read).toHaveBeenCalledTimes(2);
      streamController.enqueue(encoder.encode(' '));
      await vi.advanceTimersByTimeAsync(0);
      expect(read).toHaveBeenCalledTimes(3);
      expect(settled).toBe(false);
      expect(cancelReader).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);

      await expectError(await pending, 400, 'bad_request');
      expect(cancelReader).toHaveBeenCalledOnce();
      expect(cancel).toHaveBeenCalledOnce();
      await expect(read.mock.results.at(-1)?.value).resolves.toStrictEqual({
        done: true,
        value: undefined,
      });
      expect(release).toHaveBeenCalledOnce();
      expect(release.mock.invocationCallOrder[0]).toBeGreaterThan(
        cancelReader.mock.invocationCallOrder[0]!,
      );
      expect(req.body!.locked).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(addListener).toHaveBeenCalledOnce();
      expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0]?.[1]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([true, false])(
    'cancels an aborted body safely without RPC (already aborted=%s)',
    async (alreadyAborted) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const cancel = vi.fn(() =>
        Promise.reject(new Error('Fictional private cancellation detail.')),
      );
      const body = new ReadableStream<Uint8Array>({
        start(streamController) {
          streamController.enqueue(encoder.encode(JSON.stringify(createBody)));
        },
        pull: () => new Promise<void>(() => undefined),
        cancel,
      });
      const init: RequestInit & { duplex: 'half' } = {
        body,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        duplex: 'half',
      };
      const req = request('POST', init);
      const reader = req.body!.getReader();
      vi.spyOn(req.body!, 'getReader').mockReturnValue(reader);
      const read = vi.spyOn(reader, 'read');
      const cancelReader = vi.spyOn(reader, 'cancel');
      const release = vi.spyOn(reader, 'releaseLock');
      const addListener = vi.spyOn(req.signal, 'addEventListener');
      const removeListener = vi.spyOn(req.signal, 'removeEventListener');
      const reason = new Error('Fictional private request abort detail.');
      if (alreadyAborted) {
        controller.abort(reason);
      }
      const fetcher = authenticatedFetch();
      const pending = createWritingHandler(config, fetcher)(req);
      if (!alreadyAborted) {
        await vi.advanceTimersByTimeAsync(0);
        expect(read).toHaveBeenCalledTimes(2);
        expect(cancelReader).not.toHaveBeenCalled();
        controller.abort(reason);
      }

      await expectError(await pending, 400, 'bad_request');
      if (alreadyAborted) {
        expect(read).not.toHaveBeenCalled();
      } else {
        await expect(read.mock.results.at(-1)?.value).resolves.toStrictEqual({
          done: true,
          value: undefined,
        });
      }
      expect(cancelReader).toHaveBeenCalledOnce();
      expect(cancel).toHaveBeenCalledOnce();
      expect(release).toHaveBeenCalledOnce();
      expect(release.mock.invocationCallOrder[0]).toBeGreaterThan(
        cancelReader.mock.invocationCallOrder[0]!,
      );
      expect(req.body!.locked).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(fetcher.mock.calls.every(([, options]) => options?.signal?.aborted === false)).toBe(
        true,
      );
      expect(addListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0]?.[1]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(['valid JSON', 'malformed JSON', 'invalid schema', 'invalid UTF-8', 'stream failure'])(
    'cleans up the body timer, abort listener and reader after %s',
    async (fixture) => {
      vi.useFakeTimers();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          if (fixture === 'stream failure') {
            controller.error(new Error('Fictional private body transport detail.'));
            return;
          }
          controller.enqueue(
            fixture === 'invalid UTF-8'
              ? new Uint8Array([0xff])
              : encoder.encode(
                  fixture === 'malformed JSON'
                    ? '{'
                    : JSON.stringify(fixture === 'invalid schema' ? {} : createBody),
                ),
          );
          controller.close();
        },
      });
      const init: RequestInit & { duplex: 'half' } = {
        body,
        headers: { 'Content-Type': 'application/json' },
        duplex: 'half',
      };
      const req = request('POST', init);
      const addListener = vi.spyOn(req.signal, 'addEventListener');
      const removeListener = vi.spyOn(req.signal, 'removeEventListener');
      const fetcher = authenticatedFetch({ entry, created: true });
      const pending = createWritingHandler(config, fetcher)(req);
      await vi.advanceTimersByTimeAsync(0);
      const response = await pending;
      if (fixture === 'valid JSON') {
        expect(response.status).toBe(200);
        expect(fetcher).toHaveBeenCalledTimes(3);
      } else {
        await expectError(response, 400, 'bad_request');
        expect(fetcher).toHaveBeenCalledTimes(2);
      }
      expect(req.body!.locked).toBe(false);
      expect(addListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledOnce();
      expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0]?.[1]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('preserves valid Unicode even across chunk boundaries', async () => {
    const text = ' Fictional \u{20000} writing. ';
    const body = encoder.encode(JSON.stringify({ ...createBody, text }));
    const chunks = Array.from(body, (byte) => new Uint8Array([byte]));
    const fetcher = authenticatedFetch({ entry: { ...entry, text }, created: true });
    const response = await createWritingHandler(config, fetcher)(streamedRequest(chunks));
    expect(response.status).toBe(200);
    expect(rpcBody(fetcher)).toMatchObject({ p_text: text });
  });

  it.each([undefined, '1', '999999999'])(
    'accepts exactly 128000 streamed bytes independently of declared length %j',
    async (length) => {
      const json = JSON.stringify(createBody);
      const body = encoder.encode(`${json}${' '.repeat(128_000 - encoder.encode(json).length)}`);
      const fetcher = authenticatedFetch({ entry, created: true });
      const response = await createWritingHandler(
        config,
        fetcher,
      )(streamedRequest([body.slice(0, 64_000), body.slice(64_000)], length));
      expect(response.status).toBe(200);
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );

  it.each([undefined, '1', '128000'])(
    'rejects 128001 streamed bytes even with declared length %j',
    async (length) => {
      const json = JSON.stringify(createBody);
      const body = encoder.encode(`${json}${' '.repeat(128_001 - encoder.encode(json).length)}`);
      const fetcher = authenticatedFetch();
      await expectError(
        await createWritingHandler(
          config,
          fetcher,
        )(streamedRequest([body.slice(0, 128_000), body.slice(128_000)], length)),
        400,
        'bad_request',
      );
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('counts bytes, not string characters, for body limits', async () => {
    const body = encoder.encode(`${JSON.stringify(createBody)}${'\u3000'.repeat(43_000)}`);
    const fetcher = authenticatedFetch();
    await expectError(
      await createWritingHandler(config, fetcher)(streamedRequest([body], '1')),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(['not-a-uuid', `${id}/other`, ''])(
    'rejects invalid item ID %j before RPC',
    async (invalidId) => {
      const fetcher = authenticatedFetch();
      await expectError(
        await createWritingHandler(config, fetcher)(request(), invalidId),
        400,
        'bad_request',
      );
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['?limit=1', '?cursor=abc', '?unknown=1', '?&'])(
    'rejects any item query %s',
    async (query) => {
      const fetcher = authenticatedFetch();
      await expectError(
        await createWritingHandler(config, fetcher)(request('GET', {}, query), id),
        400,
        'bad_request',
      );
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('rejects queries on mutations and methods outside the route contract', async () => {
    const fetcher = authenticatedFetch();
    const req = jsonRequest('POST', createBody, '?unknown=1');
    await expectError(await createWritingHandler(config, fetcher)(req), 400, 'bad_request');
    expect(req.bodyUsed).toBe(false);
    const noFetch = vi.fn<typeof fetch>();
    await expectError(
      await createWritingHandler(config, noFetch)(request('PUT'), id),
      400,
      'bad_request',
    );
    await expectError(
      await createWritingHandler(config, noFetch)(request('PATCH')),
      400,
      'bad_request',
    );
    expect(noFetch).not.toHaveBeenCalled();
  });
});

describe('writing cursor pagination and output validation', () => {
  it.each([
    { query: '', limit: 20 },
    { query: '?limit=1', limit: 1 },
    { query: '?limit=100', limit: 100 },
  ])('uses bounded list defaults/limits for $query', async ({ query, limit }) => {
    const fetcher = authenticatedFetch([]);
    const response = await createWritingHandler(config, fetcher)(request('GET', {}, query));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ data: { entries: [], next_cursor: null } });
    expect(fetcher.mock.calls[2]?.[0]).toBe(`${config.supabaseUrl}/rest/v1/rpc/entry_list`);
    expect(rpcBody(fetcher)).toStrictEqual({
      p_limit: limit + 1,
      p_before_created_at: null,
      p_before_id: null,
    });
  });

  it.each([
    '?limit=020',
    '?limit=0',
    '?limit=101',
    '?limit=-1',
    '?limit=1.5',
    '?limit=1e2',
    '?limit=',
    '?limit=+1',
    '?limit=1&limit=2',
    '?cursor=a&cursor=b',
    '?unknown=1',
    '?owner_id=x',
    '?cursor=',
    '?cursor=*',
    '?cursor=abc=',
    `?cursor=${'A'.repeat(513)}`,
  ])('rejects invalid, duplicate or unknown list query %s', async (query) => {
    const fetcher = authenticatedFetch([]);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, query)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses limit+1 lookahead and cursor from the last returned row, preserving microseconds', async () => {
    const second = { ...entry, id: secondId, created_at: '2026-10-09T12:30:00.123455Z' };
    const fetcher = authenticatedFetch([entry, second]);
    const response = await createWritingHandler(config, fetcher)(request('GET', {}, '?limit=1'));
    const body = (await response.json()) as { data: unknown };
    const page = entryListSchema.parse(body.data);
    expect(page.entries).toStrictEqual([entry]);
    expect(page.next_cursor).toBe(cursor({ created_at: entry.created_at, id }));
    const nextFetch = authenticatedFetch([second]);
    const next = await createWritingHandler(
      config,
      nextFetch,
    )(request('GET', {}, `?limit=1&cursor=${page.next_cursor}`));
    expect(rpcBody(nextFetch)).toStrictEqual({
      p_limit: 2,
      p_before_created_at: '2026-10-09T12:30:00.123456Z',
      p_before_id: id,
    });
    expect(await next.json()).toStrictEqual({ data: { entries: [second], next_cursor: null } });
  });

  it.each(
    [
      null,
      [],
      {},
      { created_at: entry.created_at, id: 'invalid' },
      { created_at: '2026-10-09T12:30:00+00:00', id },
      { created_at: '2026-02-30T12:30:00Z', id },
      { created_at: entry.created_at, id, owner_id: userId },
    ].map((value) => ({ value })),
  )('rejects decoded cursor schema violations $value', async ({ value }) => {
    const fetcher = authenticatedFetch([]);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, `?cursor=${cursor(value)}`)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects a canonical JSON cursor with year 0000 before RPC', async () => {
    const encoded = cursor({ created_at: '0000-01-01T00:00:00.000000Z', id });
    const fetcher = authenticatedFetch([]);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, `?cursor=${encoded}`)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    Buffer.from(`{ "created_at": "${entry.created_at}", "id": "${id}" }`).toString('base64url'),
    cursor({ id, created_at: entry.created_at }),
    Buffer.from(`{"created_at":"${entry.created_at}","id":"${id}","id":"${id}"}`).toString(
      'base64url',
    ),
    Buffer.from(`{"created_at":"${entry.created_at}","id":"${id}"}\n`).toString('base64url'),
    Buffer.from('not-json').toString('base64url'),
    Buffer.from([0xff]).toString('base64url'),
    'Zh',
  ])('rejects noncanonical base64url/JSON cursor %j', async (encoded) => {
    const fetcher = authenticatedFetch([]);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, `?cursor=${encoded}`)),
      400,
      'bad_request',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('validates lookahead rows as resources rather than hiding malformed output', async () => {
    const fetcher = authenticatedFetch([entry, { ...entry, id: secondId, owner_id: userId }]);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, '?limit=1')),
      500,
      'internal_error',
    );
  });

  it.each(
    [{}, null, [entry, entry, entry], Array.from({ length: 102 }, () => entry)].map((result) => ({
      result,
    })),
  )('rejects nonarray or excessive list output', async ({ result }) => {
    const fetcher = authenticatedFetch(result);
    await expectError(
      await createWritingHandler(config, fetcher)(request('GET', {}, '?limit=1')),
      500,
      'internal_error',
    );
  });

  it('accepts at most 101 RPC rows and returns at most 100 resources', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...entry,
      id: `${index.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`,
    }));
    const fetcher = authenticatedFetch(rows);
    const response = await createWritingHandler(config, fetcher)(request('GET', {}, '?limit=100'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown };
    const page = entryListSchema.parse(body.data);
    expect(page.entries).toHaveLength(100);
    expect(page.next_cursor).toBe(cursor({ created_at: rows[99]?.created_at, id: rows[99]?.id }));
    expect(rpcBody(fetcher)).toMatchObject({ p_limit: 101 });
  });

  it.each(
    [
      null,
      [],
      {},
      { ...entry, owner_id: userId },
      { ...entry, reflection_opt_in: true },
      { ...entry, revision: 0 },
      { ...entry, created_at: 'not-a-timestamp' },
      { ...entry, id: secondId },
    ].map((result) => ({ result })),
  )('rejects invalid or mismatched item resource output $result', async ({ result }) => {
    const fetcher = authenticatedFetch(result);
    await expectError(
      await createWritingHandler(config, fetcher)(request(), id),
      500,
      'internal_error',
    );
  });

  it.each([
    { entry },
    { entry, created: 'true' },
    { entry, created: true, secret: 'Fictional private data.' },
    { entry: { ...entry, owner_id: userId }, created: true },
  ])('rejects incompatible create RPC output %j', async (result) => {
    const fetcher = authenticatedFetch(result);
    await expectError(
      await createWritingHandler(config, fetcher)(jsonRequest('POST', createBody)),
      500,
      'internal_error',
    );
  });

  it.each([{ id: secondId }, { id, text: 'Fictional private deleted data.' }, null])(
    'rejects incompatible delete RPC output %j',
    async (result) => {
      const fetcher = authenticatedFetch(result);
      await expectError(
        await createWritingHandler(config, fetcher)(request('DELETE'), id),
        500,
        'internal_error',
      );
    },
  );

  it('shared resource contract accepts the fictional microsecond timestamp fixture', () => {
    expect(entrySchema.parse(entry)).toStrictEqual(entry);
  });
});

describe('writing safe upstream failures', () => {
  it.each([
    { code: 'bad_request', status: 400 },
    { code: 'forbidden', status: 403 },
    { code: 'not_found', status: 404 },
    { code: 'conflict', status: 409 },
  ] as const)('maps only exact P0001 $code to its safe envelope', async ({ code, status }) => {
    const fetcher = authenticatedFetch(
      {
        code: 'P0001',
        message: code,
        details: 'Fictional private DB detail.',
        hint: 'Fictional private hint.',
      },
      400,
    );
    const response = await createWritingHandler(config, fetcher)(request(), id);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    await expectError(response, status, code);
  });

  it.each(['GET', 'PATCH', 'DELETE'])(
    'returns the same safe ownership not_found envelope for %s',
    async (method) => {
      const fetcher = authenticatedFetch(
        { code: 'P0001', message: 'not_found', details: 'Fictional private owner detail.' },
        400,
      );
      const req = method === 'PATCH' ? jsonRequest(method, patchBody) : request(method);
      await expectError(await createWritingHandler(config, fetcher)(req, id), 404, 'not_found');
    },
  );

  it.each([
    { code: 'P0001', message: 'Fictional private DB error.' },
    { code: 'P0001', message: 'not_found extra' },
    { code: '23505', message: 'conflict' },
    { code: '42501', message: 'forbidden' },
    { message: 'not_found' },
    null,
  ])('maps unknown database errors to 500 without raw details %j', async (result) => {
    const fetcher = authenticatedFetch(result, 400);
    await expectError(
      await createWritingHandler(config, fetcher)(request(), id),
      500,
      'internal_error',
    );
  });

  it('maps a database statement timeout to 503', async () => {
    const fetcher = authenticatedFetch(
      { code: '57014', message: 'Fictional private SQL timeout.' },
      500,
    );
    await expectError(await createWritingHandler(config, fetcher)(request(), id), 503, 'not_ready');
  });

  it('maps a token that expires before the RPC to 401 without exposing its response', async () => {
    const fetcher = authenticatedFetch({ message: 'Fictional private expired token detail.' }, 401);
    await expectError(
      await createWritingHandler(config, fetcher)(request(), id),
      401,
      'unauthorized',
    );
  });

  it.each([408, 502, 503, 504])(
    'maps unavailable RPC transport status %s to 503',
    async (status) => {
      const fetcher = authenticatedFetch({ message: 'Fictional private gateway error.' }, status);
      await expectError(
        await createWritingHandler(config, fetcher)(request(), id),
        503,
        'not_ready',
      );
    },
  );

  it.each(['auth', 'profile', 'rpc'] as const)(
    'maps %s network exceptions to safe 503',
    async (stage) => {
      const fetcher = vi.fn<typeof fetch>();
      if (stage !== 'auth') {
        fetcher.mockResolvedValueOnce(Response.json({ id: userId }));
      }
      if (stage === 'rpc') {
        fetcher.mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]));
      }
      fetcher.mockRejectedValueOnce(new Error('Fictional private upstream URL/token detail.'));
      await expectError(
        await createWritingHandler(config, fetcher)(request(), id),
        503,
        'not_ready',
      );
    },
  );

  it.each(['auth', 'profile'] as const)(
    'maps %s unavailable status or malformed JSON to 503',
    async (stage) => {
      for (const upstream of [
        new Response('Fictional private non-JSON.'),
        new Response('Unavailable', { status: 503 }),
      ]) {
        const fetcher = vi.fn<typeof fetch>();
        if (stage === 'profile') {
          fetcher.mockResolvedValueOnce(Response.json({ id: userId }));
        }
        fetcher.mockResolvedValueOnce(upstream);
        await expectError(
          await createWritingHandler(config, fetcher)(request(), id),
          503,
          'not_ready',
        );
      }
    },
  );

  it('maps RPC malformed success JSON to 500 and interrupted body transport to 503', async () => {
    const malformedFetch = authenticatedFetch();
    malformedFetch
      .mockReset()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]))
      .mockResolvedValueOnce(new Response('Fictional private malformed JSON.'));
    await expectError(
      await createWritingHandler(config, malformedFetch)(request(), id),
      500,
      'internal_error',
    );
    const response = Response.json(entry);
    vi.spyOn(response, 'json').mockRejectedValue(
      new TypeError('Fictional private stream failure.'),
    );
    const interruptedFetch = authenticatedFetch();
    interruptedFetch
      .mockReset()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]))
      .mockResolvedValueOnce(response);
    await expectError(
      await createWritingHandler(config, interruptedFetch)(request(), id),
      503,
      'not_ready',
    );
  });

  it.each(['auth', 'profile', 'rpc'] as const)(
    'bounds hanging %s fetches to 5000ms even when injected fetch ignores abort',
    async (stage) => {
      vi.useFakeTimers();
      const fetcher = vi.fn<typeof fetch>();
      if (stage !== 'auth') {
        fetcher.mockResolvedValueOnce(Response.json({ id: userId }));
      }
      if (stage === 'rpc') {
        fetcher.mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]));
      }
      fetcher.mockImplementationOnce(() => new Promise<Response>(() => undefined));
      const pending = createWritingHandler(config, fetcher)(request(), id);
      await vi.advanceTimersByTimeAsync(5_000);
      await expectError(await pending, 503, 'not_ready');
      const signal = fetcher.mock.calls.at(-1)?.[1]?.signal;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('includes upstream response-body reading in the deadline', async () => {
    vi.useFakeTimers();
    const upstream = Response.json(entry);
    vi.spyOn(upstream, 'json').mockImplementation(() => new Promise(() => undefined));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ id: userId, status: 'active' }]))
      .mockResolvedValueOnce(upstream);
    const pending = createWritingHandler(config, fetcher)(request(), id);
    await vi.advanceTimersByTimeAsync(5_000);
    await expectError(await pending, 503, 'not_ready');
    expect(fetcher.mock.calls[2]?.[1]?.signal?.aborted).toBe(true);
  });
});

describe('writing server-only wrapper and Next Node route wiring', () => {
  it.each(['GET', 'OPTIONS'])(
    'maps configuration errors to uncached safe 503 for %s',
    async (method) => {
      vi.mocked(loadWritingConfig).mockImplementation(() => {
        throw new Error('Fictional private configuration detail.');
      });
      const fetcher = vi.spyOn(globalThis, 'fetch');
      const response = await handleWritingRequest(request(method));
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response.headers.get('Vary')).toBe(
        method === 'OPTIONS'
          ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
          : 'Origin',
      );
      await expectError(response, 503, 'not_ready');
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each(['GET', 'POST', 'OPTIONS'] as const)(
    'wires collection %s through runtime config',
    async (method) => {
      vi.mocked(loadWritingConfig).mockReturnValue(config);
      const result = method === 'POST' ? { entry, created: true } : [];
      const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(authenticatedFetch(result));
      const req =
        method === 'POST'
          ? jsonRequest(method, createBody)
          : request(method, {
              headers: { 'Access-Control-Request-Method': 'GET' },
            });
      const response = await collectionRoute[method](req);
      expect(response.status).toBe(method === 'OPTIONS' ? 204 : 200);
      expect(loadWritingConfig).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledTimes(method === 'OPTIONS' ? 0 : 3);
      expect(collectionRoute.runtime).toBe('nodejs');
      expect(collectionRoute.dynamic).toBe('force-dynamic');
      expect(collectionRoute.revalidate).toBe(0);
    },
  );

  it.each(['GET', 'PATCH', 'DELETE', 'OPTIONS'] as const)(
    'awaits item params and wires %s through the item contract',
    async (method) => {
      vi.mocked(loadWritingConfig).mockReturnValue(config);
      const result =
        method === 'DELETE'
          ? { id }
          : method === 'PATCH'
            ? { ...entry, text: patchBody.text, revision: 2 }
            : entry;
      const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(authenticatedFetch(result));
      const req =
        method === 'PATCH'
          ? jsonRequest(method, patchBody)
          : request(method, {
              headers: { 'Access-Control-Request-Method': 'PATCH' },
            });
      const response = await itemRoute[method](req, { params: Promise.resolve({ id }) });
      expect(response.status).toBe(method === 'OPTIONS' ? 204 : 200);
      expect(fetcher).toHaveBeenCalledTimes(method === 'OPTIONS' ? 0 : 3);
      if (method !== 'OPTIONS') {
        expect(fetcher.mock.calls[2]?.[1]?.body).toContain(`"p_id":"${id}"`);
      } else {
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, PATCH, DELETE');
      }
      expect(itemRoute.runtime).toBe('nodejs');
      expect(itemRoute.dynamic).toBe('force-dynamic');
      expect(itemRoute.revalidate).toBe(0);
    },
  );
});
