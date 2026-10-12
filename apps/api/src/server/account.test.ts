import { afterEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  createAccountDeleteHandler,
  createAccountProcessor,
  hasRecentSignIn,
  parseAccountConfig,
} from './account';
import { parseWritingConfig } from './config-parser';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const account = { secretKey: 'sb_secret_fixture', triggerSecret: 'f'.repeat(64) };
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  lease = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function token(age = 0, method = 'password') {
  return (
    'header.' +
    Buffer.from(
      JSON.stringify({ amr: [{ method, timestamp: Math.floor(Date.now() / 1000) - age }] }),
    ).toString('base64url') +
    '.signature'
  );
}
const deletion = (auth = token()) =>
  new Request('https://api.example.test/api/v1/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth}`, Origin: 'https://web.example.test' },
  });
const processRequest = (auth = account.triggerSecret, body: unknown = {}) =>
  new Request('https://api.example.test/api/v1/internal/accounts/process', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
afterEach(() => vi.useRealTimers());
describe('account deletion authorization and durable worker', () => {
  it('keeps feature configuration disabled by default', () =>
    expect(() => parseAccountConfig({})).toThrow());
  it('requires separate server secrets', () => {
    expect(() =>
      parseAccountConfig({
        ACCOUNT_DELETION_ENABLED: 'true',
        SUPABASE_SECRET_KEY: 'sb_publishable_fixture',
        ACCOUNT_JOB_TRIGGER_SECRET: account.triggerSecret,
      }),
    ).toThrow();
    expect(
      parseAccountConfig({
        ACCOUNT_DELETION_ENABLED: 'true',
        SUPABASE_SECRET_KEY: account.secretKey,
        ACCOUNT_JOB_TRIGGER_SECRET: account.triggerSecret,
      }),
    ).toEqual(account);
  });
  it.each([301, 900])('rejects old sign-in even on a refreshed session (%s seconds)', (age) =>
    expect(hasRecentSignIn('Bearer ' + token(age))).toBe(false),
  );
  it('rejects refresh/anonymous method and malformed claims', () => {
    expect(hasRecentSignIn('Bearer ' + token(0, 'refresh_token'))).toBe(false);
    expect(hasRecentSignIn('Bearer nonsense')).toBe(false);
    expect(hasRecentSignIn('Bearer ' + token())).toBe(true);
  });
  it.each([{ method: ['password'] }, { method: { method: 'password' } }, { method: null }])(
    'does not coerce malformed authentication methods %#',
    ({ method }) => {
      const claims = { amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }] };
      const jwt =
        'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature';
      expect(hasRecentSignIn('Bearer ' + jwt)).toBe(false);
    },
  );
  it('freshly verifies auth before trusting recent-sign-in claims', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 401 }));
    expect((await createAccountDeleteHandler(config, () => account, f)(deletion())).status).toBe(
      401,
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('does not enqueue an old session', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id }));
    expect(
      (await createAccountDeleteHandler(config, () => account, f)(deletion(token(900)))).status,
    ).toBe(403);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('does not disable the account if cleanup is unconfigured', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id }));
    expect(
      (
        await createAccountDeleteHandler(
          config,
          () => {
            throw Error('disabled');
          },
          f,
        )(deletion())
      ).status,
    ).toBe(503);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('derives account target from verified identity and returns 202', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json({ status: 'deleting' }));
    const res = await createAccountDeleteHandler(config, () => account, f)(deletion());
    expect(res.status).toBe(202);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(JSON.parse(f.mock.calls[1]?.[1]?.body as string)).toEqual({ p_user_id: id });
  });
  it('accepts a Next-style empty DELETE stream', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json({ status: 'deleting' }));
    const request = new Request(deletion(), { body: '' });
    expect(request.body).not.toBeNull();
    expect((await createAccountDeleteHandler(config, () => account, f)(request)).status).toBe(202);
  });
  it('rejects nonempty DELETE bytes without enqueueing any account', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id }));
    const request = new Request(deletion(), { body: JSON.stringify({ user_id: id }) });
    expect((await createAccountDeleteHandler(config, () => account, f)(request)).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('bounds and cancels a stalled DELETE stream', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id }));
    const request = new Request(deletion(), {
      body: new ReadableStream({ cancel }),
      duplex: 'half',
    } as RequestInit);
    const pending = createAccountDeleteHandler(config, () => account, f)(request);
    await vi.advanceTimersByTimeAsync(5001);
    expect((await pending).status).toBe(400);
    expect(cancel).toHaveBeenCalledOnce();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it.each(['wrong', 'user-access-token'])('rejects wrong internal credentials %s', async (auth) => {
    const f = vi.fn<typeof fetch>();
    expect((await createAccountProcessor(config, account, f)(processRequest(auth))).status).toBe(
      401,
    );
    expect(f).not.toHaveBeenCalled();
  });
  it('rejects oversized batches without querying the database', async () => {
    const f = vi.fn<typeof fetch>();
    expect(
      (
        await createAccountProcessor(
          config,
          account,
          f,
        )(processRequest(account.triggerSecret, { limit: 11 }))
      ).status,
    ).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it('purges content before deleting Auth and removes the queue last', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ user_id: id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json(true));
    const res = await createAccountProcessor(config, account, f)(processRequest());
    expect(await res.json()).toEqual({ data: { claimed: 1, completed: 1, retried: 0 } });
    expect(f.mock.calls.map((c) => String(c[0]).split('/').at(-1))).toEqual([
      'account_delete_claim',
      'account_delete_purge',
      id,
      'account_delete_finish',
    ]);
  });
  it('does not delete Auth if fenced purge fails', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ user_id: id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json({ code: 'P0001', message: 'conflict' }, { status: 400 }))
      .mockResolvedValueOnce(Response.json(false));
    expect(
      (await (await createAccountProcessor(config, account, f)(processRequest())).json()).data
        .retried,
    ).toBe(1);
    expect(f.mock.calls.map((c) => String(c[0]).split('/').at(-1))).toEqual([
      'account_delete_claim',
      'account_delete_purge',
      'account_delete_retry',
    ]);
  });
  it('queues recovery when Auth deletion fails without exposing its response', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ user_id: id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json({ secret: 'DO NOT EXPOSE' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(true));
    const res = await createAccountProcessor(config, account, f)(processRequest());
    expect(await res.text()).not.toContain('DO NOT EXPOSE');
    expect(f.mock.calls.at(-1)?.[0]).toContain('account_delete_retry');
  });
  it('finishes after a previous worker already removed Auth', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ user_id: id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json(true));
    expect(
      (await (await createAccountProcessor(config, account, f)(processRequest())).json()).data
        .completed,
    ).toBe(1);
  });
});
