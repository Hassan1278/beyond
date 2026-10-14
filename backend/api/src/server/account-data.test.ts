import { describe, it, expect, vi } from 'vitest';
import { createAccountDataHandler } from './account-data';
import { parseWritingConfig } from './config-parser';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const token = () =>
  'header.' +
  Buffer.from(
    JSON.stringify({ amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }] }),
  ).toString('base64url') +
  '.signature';
const f = (value: unknown, budget = true) =>
  vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id }))
    .mockResolvedValueOnce(Response.json([{ id, status: 'active' }]))
    .mockResolvedValueOnce(Response.json(budget))
    .mockResolvedValueOnce(Response.json(value));
const req = (method = 'GET', bearer = token(), body?: string) =>
  new Request('https://api.example.test/api/v1/account', {
    method,
    headers: { Authorization: 'Bearer ' + bearer, Origin: 'https://web.example.test' },
    ...(body ? { body } : {}),
  });
describe('connected account HTTP controls', () => {
  it('returns disabled optional capabilities without privileged credentials', async () => {
    const res = await createAccountDataHandler(config, {}, f(null))(req());
    expect(await res.json()).toEqual({
      data: {
        status: 'active',
        capabilities: { account_deletion: false, letters: false, voice_transcription: false },
      },
    });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('allows recent sign-in to clear only owned content through user credentials', async () => {
    const fetcher = f({ status: 'cleared' });
    const res = await createAccountDataHandler(config, {}, fetcher)(req('DELETE'), true);
    expect(res.status).toBe(200);
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('/rpc/account_data_clear');
    expect(fetcher.mock.calls.at(-1)?.[1]?.headers).toMatchObject({
      apikey: config.supabasePublishableKey,
    });
  });
  it('rejects a stale or malformed AMR before clearing content', async () => {
    const fetcher = f(null);
    const res = await createAccountDataHandler(config, {}, fetcher)(req('DELETE', 'fixture'), true);
    expect(res.status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('rejects unexpected clear payload', async () => {
    const fetcher = f(null);
    const res = await createAccountDataHandler(
      config,
      {},
      fetcher,
    )(req('DELETE', token(), '{}'), true);
    expect(res.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('bounds request volume across handlers', async () => {
    const fetcher = f(null, false);
    const res = await createAccountDataHandler(config, {}, fetcher)(req());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});
