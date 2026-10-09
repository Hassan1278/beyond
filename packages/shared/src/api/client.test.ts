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
});
