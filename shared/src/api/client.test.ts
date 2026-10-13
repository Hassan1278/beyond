import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from './client';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const settings = {
  timezone: 'Asia/Hong_Kong',
  morning_time: '07:30',
  voice: 'friend',
  memory_paused: false,
  reflection_enabled: false,
  revision: 1,
  updated_at: '2026-10-10T00:00:00Z',
};
describe('portable authenticated API client', () => {
  it.each([
    'http://example.test',
    'https://example.test/path',
    'https://user@example.test',
    'https://example.test/',
  ])('rejects unsafe origin %s', (origin) =>
    expect(() => createApiClient({ origin, getAccessToken: () => null })).toThrow(),
  );
  it('obtains the latest token for each request and disables caching', async () => {
    const token = vi.fn().mockReturnValueOnce('first.token').mockReturnValueOnce('second.token');
    const f = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ data: settings }));
    const client = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: token,
      fetcher: f,
    });
    await client.settings.get();
    await client.settings.get();
    expect(f.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: 'Bearer first.token' });
    expect(f.mock.calls[1]?.[1]?.headers).toEqual({ Authorization: 'Bearer second.token' });
    expect(f.mock.calls[1]?.[1]?.cache).toBe('no-store');
  });
  it('does not request private resources without a token', async () => {
    const f = vi.fn<typeof fetch>();
    await expect(
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => null,
        fetcher: f,
      }).settings.get(),
    ).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    expect(f).not.toHaveBeenCalled();
  });
  it('validates output contracts rather than accepting private fields', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { ...settings, secret: 'hidden' } }));
    await expect(
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => 'token',
        fetcher: f,
      }).settings.get(),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('returns safe conflict metadata without upstream messages', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { code: 'conflict', message: 'Sensitive upstream text', request_id: id } },
          { status: 409 },
        ),
      );
    const promise = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: () => 'token',
      fetcher: f,
    }).settings.get();
    await expect(promise).rejects.toMatchObject({ code: 'conflict', status: 409, requestId: id });
    await promise.catch((e) => expect(e.message).not.toContain('Sensitive'));
  });
  it('validates explicit approval before sending anything', () => {
    const f = vi.fn<typeof fetch>();
    const client = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: () => 'token',
      fetcher: f,
    });
    expect(() =>
      client.memories.create({
        text: 'Fictional memory',
        source_entry_id: null,
        approved: false,
        idempotency_key: id,
      } as never),
    ).toThrow();
    expect(f).not.toHaveBeenCalled();
  });
  it('supports cancellation and removes its timer', async () => {
    const abort = new AbortController();
    const f = vi.fn<typeof fetch>().mockImplementation(
      async (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('internal details')), {
            once: true,
          });
        }),
    );
    const promise = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: () => 'token',
      fetcher: f,
    }).settings.get(abort.signal);
    await Promise.resolve();
    abort.abort();
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
  });
  it('accepts asynchronous account deletion acknowledgement', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { status: 'deleting' } }, { status: 202 }));
    expect(
      await createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => 'token',
        fetcher: f,
      }).account.delete(),
    ).toEqual({ status: 'deleting' });
  });
  it('sends explicitly approved memory edits with the caller revision', async () => {
    const memory = {
      id,
      text: 'Fictional corrected memory',
      source_entry_id: null,
      revision: 2,
      created_at: settings.updated_at,
      updated_at: settings.updated_at,
    };
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: memory }));
    const client = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: () => 'token',
      fetcher: f,
    });
    const patch = { text: memory.text, approved: true as const, expected_revision: 1 };
    expect(await client.memories.update(id, patch)).toEqual(memory);
    expect(f.mock.calls[0]?.[0]).toBe(`https://api.example.test/api/v1/memories/${id}`);
    expect(f.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(JSON.parse(f.mock.calls[0]?.[1]?.body as string)).toEqual(patch);
    expect(() => client.memories.update(id, { ...patch, approved: false } as never)).toThrow();
    expect(f).toHaveBeenCalledOnce();
  });
  it('exports bounded pages with a fresh token and no cached copies', async () => {
    const page = {
      format_version: 1,
      exported_at: settings.updated_at,
      section: 'todos',
      items: [],
      next_cursor: null,
    };
    const f = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ data: page }));
    const token = vi.fn().mockReturnValueOnce('first.token').mockReturnValueOnce('second.token');
    const client = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: token,
      fetcher: f,
    });
    expect(await client.account.exportPage({ section: 'todos', limit: '1' })).toEqual(page);
    await client.account.exportPage({ section: 'todos' });
    expect(f.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/account/export?section=todos&limit=1',
    );
    expect(f.mock.calls[1]?.[1]?.headers).toEqual({ Authorization: 'Bearer second.token' });
    expect(f.mock.calls[1]?.[1]?.cache).toBe('no-store');
    await expect(client.account.exportPage({ section: 'settings', limit: '1' })).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('rejects an export response for a different section', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          format_version: 1,
          exported_at: settings.updated_at,
          section: 'settings',
          settings,
        },
      }),
    );
    await expect(
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => 'token',
        fetcher: f,
      }).account.exportPage({ section: 'entries' }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('returns a safe export reauthentication error without upstream details', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { code: 'forbidden', message: 'Private session details', request_id: id } },
          { status: 403 },
        ),
      );
    const promise = createApiClient({
      origin: 'https://api.example.test',
      getAccessToken: () => 'token',
      fetcher: f,
    }).account.exportPage({ section: 'entries' });
    await expect(promise).rejects.toMatchObject({ code: 'forbidden', status: 403 });
    await promise.catch((e) => expect(e.message).not.toContain('Private'));
  });
});

describe('whole-request bounds', () => {
  it('starts its deadline before token acquisition', async () => {
    vi.useFakeTimers();
    try {
      const f = vi.fn<typeof fetch>();
      const promise = createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => new Promise(() => undefined),
        fetcher: f,
        timeoutMs: 100,
      }).settings.get();
      const checked = expect(promise).rejects.toMatchObject({ code: 'cancelled' });
      await vi.advanceTimersByTimeAsync(100);
      await checked;
      expect(f).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not acquire tokens or fetch for an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const token = vi.fn(() => 'token');
    const f = vi.fn<typeof fetch>();
    await expect(
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: token,
        fetcher: f,
      }).settings.get(controller.signal),
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(token).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });
  it('rejects oversized bodies without consuming an unbounded JSON document', async () => {
    const response = new Response('x'.repeat(8_000_001));
    await expect(
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => 'token',
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(response),
      }).settings.get(),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
