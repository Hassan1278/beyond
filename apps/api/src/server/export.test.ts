import { Buffer } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccountExportHandler } from './export';
import { parseWritingConfig } from './config-parser';
import { decodeCursor } from './transport';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const timestamp = '2026-10-10T00:00:00.123456Z';
const settings = {
  timezone: 'Etc/UTC',
  morning_time: '07:30',
  voice: 'friend',
  memory_paused: false,
  reflection_enabled: false,
  revision: 1,
  updated_at: timestamp,
};
const meta = { format_version: 1, exported_at: timestamp };
function token(age = 0, method = 'password') {
  return `head.${Buffer.from(JSON.stringify({ amr: [{ method, timestamp: Math.floor(Date.now() / 1000) - age }] })).toString('base64url')}.sig`;
}
function request(query = '?section=settings', age = 0) {
  return new Request('https://api.example.test/api/v1/account/export' + query, {
    headers: { Authorization: 'Bearer ' + token(age), Origin: 'https://web.example.test' },
  });
}
function fetcher(value: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id }))
    .mockResolvedValueOnce(Response.json([{ id, status: 'active' }]))
    .mockResolvedValueOnce(Response.json(value));
}
afterEach(() => vi.useRealTimers());
describe('recent-sign-in owner exports', () => {
  it('exports private settings under user credentials with uncached attachment headers', async () => {
    const f = fetcher({ ...meta, section: 'settings', settings });
    const req = request();
    const res = await createAccountExportHandler(config, f)(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="beyond-settings.json"',
    );
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://web.example.test');
    expect(f.mock.calls[2]?.[1]?.headers).toEqual({
      apikey: config.supabasePublishableKey,
      Authorization: req.headers.get('Authorization'),
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(f.mock.calls[2]?.[1]?.body as string)).toEqual({
      p_section: 'settings',
      p_limit: null,
      p_before_created_at: null,
      p_before_id: null,
    });
  });
  it('does not trust unverified recent-sign-in claims', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 401 }));
    expect((await createAccountExportHandler(config, f)(request())).status).toBe(401);
    expect(f).toHaveBeenCalledOnce();
  });
  it('requires actual recent authentication rather than a refreshed old token', async () => {
    const f = fetcher({});
    expect(
      (await createAccountExportHandler(config, f)(request('?section=entries', 301))).status,
    ).toBe(403);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('requires an active profile', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json([{ id, status: 'deleting' }]));
    expect((await createAccountExportHandler(config, f)(request())).status).toBe(403);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it.each([
    '',
    '?section=entries&limit=51',
    '?section=entries&limit=01',
    '?section=settings&limit=1',
    '?section=entries&section=todos',
    '?section=entries&owner_id=' + other,
    '?section=entries&cursor=bad',
  ])('rejects invalid selection and pagination %s', async (query) => {
    const f = fetcher({});
    expect((await createAccountExportHandler(config, f)(request(query))).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('preserves microsecond cursors and uses only bounded rows', async () => {
    const entry = {
      id,
      text: 'Fictional journal entry',
      revision: 1,
      reflection_opt_in: false,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const f = fetcher({ ...meta, section: 'entries', items: [entry, { ...entry, id: other }] });
    const res = await createAccountExportHandler(config, f)(request('?section=entries&limit=1'));
    const data = (await res.json()).data;
    expect(data.items).toEqual([entry]);
    expect(decodeCursor(data.next_cursor)).toEqual({ id, created_at: timestamp });
    expect(JSON.parse(f.mock.calls[2]?.[1]?.body as string).p_limit).toBe(2);
  });
  it.each([
    { ...meta, section: 'settings', settings, token: 'SECRET' },
    { ...meta, section: 'todos', items: [] },
    { ...meta, section: 'settings', settings: { ...settings, owner_id: other } },
  ])('never forwards unexpected/private/mismatched output %#', async (value) => {
    const res = await createAccountExportHandler(config, fetcher(value))(request());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('SECRET');
  });
  it('bounds upstream output to the requested batch', async () => {
    const todo = {
      id,
      title: 'Fictional task',
      completed: false,
      revision: 1,
      created_at: timestamp,
      updated_at: timestamp,
    };
    expect(
      (
        await createAccountExportHandler(
          config,
          fetcher({ ...meta, section: 'todos', items: Array(3).fill(todo) }),
        )(request('?section=todos&limit=1'))
      ).status,
    ).toBe(500);
  });
  it('permits exact GET preflight without user data or authentication', async () => {
    const f = vi.fn<typeof fetch>();
    const res = await createAccountExportHandler(
      config,
      f,
    )(
      new Request('https://api.example.test/api/v1/account/export', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://web.example.test',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization',
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(f).not.toHaveBeenCalled();
  });
});
