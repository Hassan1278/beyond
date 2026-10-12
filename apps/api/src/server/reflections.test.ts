import { describe, it, expect, vi } from 'vitest';
import {
  createReflectionHandler,
  createReflectionProcessor,
  generateReflection,
  parseReflectionConfig,
} from './reflections';
import { parseWritingConfig } from './config-parser';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  lease = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const env = {
  REFLECTIONS_ENABLED: 'true',
  SUPABASE_SECRET_KEY: 'sb_secret_fixture',
  REFLECTION_JOB_TRIGGER_SECRET: 't'.repeat(32),
  AI_SERVICE_URL: 'https://ai.example.test',
  AI_SERVICE_TOKEN: 's'.repeat(32),
};
const job = parseReflectionConfig(env);
const input = {
  version: 1 as const,
  request_id: id,
  entry: { id, revision: 1, text: 'Fictional journal' },
  voice: 'friend' as const,
  memories: [],
  corrections: [],
};
const output = {
  version: 1,
  request_id: id,
  entry_revision: 1,
  letter: { greet: 'Hello', said: 'Fictional summary', rec: '', step: '', sign: '' },
  actions: [],
  provenance: { model: 'fixture', prompt_version: 'v1' },
};
const request = (
  method = 'POST',
  body: unknown = {},
  path = '/api/v1/entries/' + id + '/reflection',
  origin: string | undefined = 'https://web.example.test',
) =>
  new Request('https://api.example.test' + path, {
    method,
    headers: {
      Authorization: 'Bearer fixture',
      ...(origin ? { Origin: origin } : {}),
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
function userFetch(result: unknown, budget = true) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id }))
    .mockResolvedValueOnce(Response.json([{ id, status: 'active' }]))
    .mockResolvedValueOnce(Response.json(budget))
    .mockResolvedValueOnce(Response.json(result));
}
describe('independent reflection handoff', () => {
  it.each([
    {},
    { ...env, REFLECTIONS_ENABLED: 'false' },
    { ...env, AI_SERVICE_URL: 'http://external.example.test' },
    { ...env, AI_SERVICE_URL: 'https://ai.example.test/path' },
    { ...env, AI_SERVICE_TOKEN: 'short' },
  ])('fails closed for unavailable configuration', (e) =>
    expect(() => parseReflectionConfig(e)).toThrow(),
  );
  it('sends a versioned bounded payload without database credentials', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(Response.json(output));
    expect(await generateReflection(job, input, f)).toEqual(output);
    expect(f.mock.calls[0]?.[0]).toBe('https://ai.example.test/v1/reflections');
    expect(f.mock.calls[0]?.[1]?.headers).toEqual({
      Authorization: 'Bearer ' + job.serviceToken,
      'Content-Type': 'application/json',
    });
    expect(f.mock.calls[0]?.[1]?.body).not.toContain('sb_secret');
  });
  it.each([
    { ...output, request_id: lease },
    { ...output, entry_revision: 2 },
    { ...output, version: 2 },
    { ...output, secret: 'private' },
    {
      ...output,
      actions: [
        { id, title: 'Fictional' },
        { id, title: 'Duplicate' },
      ],
    },
  ])('rejects mismatched/malformed output with no fallback', async (value) => {
    await expect(
      generateReflection(job, input, vi.fn<typeof fetch>().mockResolvedValue(Response.json(value))),
    ).rejects.toThrow();
  });
  it('bounds response size', async () => {
    await expect(
      generateReflection(
        job,
        input,
        vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(128001))),
      ),
    ).rejects.toThrow();
  });
  it('times out a service ignoring cancellation', async () => {
    vi.useFakeTimers();
    try {
      const p = generateReflection(job, input, () => new Promise(() => undefined));
      const checked = expect(p).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(25000);
      await checked;
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not schedule until independent service configuration is explicitly enabled', async () => {
    const f = userFetch({});
    const response = await createReflectionHandler(config, {}, f)(
      request('POST', { consent: true, expected_revision: 1 }),
      'request',
      id,
    );
    expect(response.status).toBe(503);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('requires explicit consent and rejects private owner injection', async () => {
    const f = userFetch({});
    const res = await createReflectionHandler(config, env, f)(
      request('POST', { consent: true, expected_revision: 1, owner_id: id }),
      'request',
      id,
    );
    expect(res.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('schedules only the verified owner, exact revision and known entry', async () => {
    const data = {
      id,
      entry_id: id,
      entry_revision: 1,
      status: 'pending',
      due_at: '2026-10-13T07:30:00Z',
    };
    const f = userFetch(data);
    const res = await createReflectionHandler(config, env, f)(
      request('POST', { consent: true, expected_revision: 1 }),
      'request',
      id,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data });
    expect(JSON.parse(f.mock.calls[3]?.[1]?.body as string)).toEqual({
      p_entry_id: id,
      p_expected_revision: 1,
    });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('returns rate-limit hints without dispatching content', async () => {
    const f = userFetch({}, false);
    const res = await createReflectionHandler(
      config,
      env,
      f,
    )(request('GET', null, '/api/v1/reflections'), 'list');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('allows an empty letter history while AI is disabled', async () => {
    const res = await createReflectionHandler(
      config,
      {},
      userFetch([]),
    )(request('GET', null, '/api/v1/reflections'), 'list');
    expect(await res.json()).toEqual({ data: { items: [], next_cursor: null } });
  });
  it('rejects browser and invalid worker credentials before claiming', async () => {
    const f = vi.fn<typeof fetch>();
    const res = await createReflectionProcessor(config, job, f)(request());
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it('retries failed generation without committing content or exposing exceptions', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json(input))
      .mockResolvedValueOnce(Response.json({ error: 'private upstream details' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(true));
    const req = new Request('https://api.example.test/api/v1/internal/reflections/process', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + job.triggerSecret, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await createReflectionProcessor(config, job, f)(req);
    expect(await res.json()).toEqual({ data: { claimed: 1, completed: 0, retried: 1 } });
    expect(f.mock.calls.at(-1)?.[0]).toContain('reflection_retry');
    expect(f.mock.calls.some((c) => String(c[0]).endsWith('reflection_finish'))).toBe(false);
  });
  it('commits a matching fixture with its lease and approved context IDs', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ id, lease_token: lease }]))
      .mockResolvedValueOnce(Response.json(input))
      .mockResolvedValueOnce(Response.json(output))
      .mockResolvedValueOnce(Response.json(true));
    const req = new Request('https://api.example.test/api/v1/internal/reflections/process', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + job.triggerSecret, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await createReflectionProcessor(config, job, f)(req);
    expect(await res.json()).toEqual({ data: { claimed: 1, completed: 1, retried: 0 } });
    expect(JSON.parse(f.mock.calls[3]?.[1]?.body as string)).toEqual({
      p_id: id,
      p_lease_token: lease,
      p_output: output,
      p_context_ids: [],
    });
  });
});
