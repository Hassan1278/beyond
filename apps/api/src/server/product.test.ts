import { describe, expect, it, vi } from 'vitest';
import { createProductHandler } from './product';
import { parseWritingConfig } from './config-parser';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const settings = {
  timezone: 'Asia/Hong_Kong',
  morning_time: '07:30',
  voice: 'friend',
  memory_paused: false,
  reflection_enabled: false,
  revision: 1,
  updated_at: '2026-10-10T00:00:00.123456Z',
};
function fetcher(value: unknown, status = 200) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id }))
    .mockResolvedValueOnce(Response.json([{ id, status: 'active' }]))
    .mockResolvedValueOnce(Response.json(value, { status }));
}
function request(method = 'GET', body?: unknown, origin = 'https://web.example.test') {
  return new Request('https://api.example.test/api/v1/settings', {
    method,
    headers: {
      Authorization: 'Bearer fixture',
      Origin: origin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe('private product HTTP boundaries', () => {
  it('verifies identity/profile and returns uncached settings', async () => {
    const f = fetcher(settings);
    const res = await createProductHandler(config, f)(request(), 'settings');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ data: settings });
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      config.supabaseUrl + '/auth/v1/user',
      config.supabaseUrl + '/rest/v1/profiles?select=id,status&id=eq.' + id,
      config.supabaseUrl + '/rest/v1/rpc/settings_get',
    ]);
    expect(f.mock.calls[2]?.[1]?.headers).not.toHaveProperty('secret');
  });
  it('dispatches only validated settings fields', async () => {
    const f = fetcher({ ...settings, revision: 2 });
    const res = await createProductHandler(config, f)(
      request('PATCH', { expected_revision: 1, memory_paused: true }),
      'settings',
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(f.mock.calls[2]?.[1]?.body as string)).toEqual({
      p_patch: { memory_paused: true },
      p_expected_revision: 1,
    });
  });
  it.each([
    { expected_revision: 1, reflection_enabled: true },
    { expected_revision: 1, owner_id: id },
    { expected_revision: 1 },
  ])('rejects unimplemented opt-in or owner injection %#', async (body) => {
    const f = fetcher(settings);
    const res = await createProductHandler(config, f)(request('PATCH', body), 'settings');
    expect(res.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('rejects other origins before authentication', async () => {
    const f = fetcher(settings);
    expect(
      (
        await createProductHandler(config, f)(
          request('GET', undefined, 'https://evil.example.test'),
          'settings',
        )
      ).status,
    ).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });
  it('denies deleting profiles before RPC dispatch', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json([{ id, status: 'deleting' }]));
    expect((await createProductHandler(config, f)(request(), 'todos')).status).toBe(403);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed resource IDs', async () => {
    const f = fetcher(settings);
    expect((await createProductHandler(config, f)(request(), 'todos', 'bad')).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('rejects leaked private output fields', async () => {
    expect(
      (
        await createProductHandler(config, fetcher({ ...settings, owner_id: id }))(
          request(),
          'settings',
        )
      ).status,
    ).toBe(500);
  });
  it.each(['not_found', 'conflict', 'forbidden'])(
    'maps DB error %s to safe HTTP response',
    async (message) => {
      const res = await createProductHandler(config, fetcher({ code: 'P0001', message }, 400))(
        request(),
        'todos',
        id,
      );
      expect(res.status).toBe({ not_found: 404, conflict: 409, forbidden: 403 }[message]);
      expect((await res.json()).error.message).not.toContain('P0001');
    },
  );
  it('uses microsecond cursor pages and bounds upstream output', async () => {
    const todo = {
      id,
      title: 'Fictional task',
      completed: false,
      revision: 1,
      created_at: settings.updated_at,
      updated_at: settings.updated_at,
    };
    const res = await createProductHandler(config, fetcher([todo]))(
      new Request('https://api.example.test/api/v1/todos?limit=1', {
        headers: { Authorization: 'Bearer fixture' },
      }),
      'todos',
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ items: [todo], next_cursor: null });
    expect(
      (await createProductHandler(config, fetcher(Array(102).fill(todo)))(request(), 'todos'))
        .status,
    ).toBe(500);
  });
});
