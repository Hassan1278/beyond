import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseWritingConfig } from './config-parser';
import {
  aiStatus,
  createLetterHandler,
  createLetterProcessor,
  parseAiServiceConfig,
  parseLetterWorkerConfig,
  resetAiStatusCache,
} from './letters';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const letterId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const entryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const lease = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ts = '2026-10-14T12:00:00.000000Z';
const config = parseWritingConfig({
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});
const AI_TOKEN = 'ai-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRIGGER = 'trigger-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const env = { AI_SERVICE_URL: 'https://ai.example.test', AI_SERVICE_TOKEN: AI_TOKEN };
const workerEnv = {
  ...env,
  SUPABASE_SECRET_KEY: 'sb_secret_fixture',
  LETTER_JOB_TRIGGER_SECRET: TRIGGER,
};

const content = {
  voice: 'friend',
  greeting: 'Hey,',
  signoff: 'B.',
  language: 'en',
  headline: 'A fictional walk',
  recap: 'You wrote about a walk.',
  analysis: [{ lens: 'feeling', title: 'Calm', text: 'Maybe calm.', quote: 'a walk', entryId }],
  challenge: null,
  advice: { text: 'Walk again.', why: 'Calm.' },
  encouragement: 'You noticed it.',
  steps: [
    { text: 'One', kind: 'rest', minutes: 5, why: '' },
    { text: 'Two', kind: 'connection', minutes: 5, why: '' },
    { text: 'Three', kind: 'reflection', minutes: 5, why: '' },
  ],
  themes: ['rest'],
  openQuestions: [],
  wins: [],
  tone: 'positive',
  safetyConcern: false,
  remember: [],
};
const letter = (over: Record<string, unknown> = {}) => ({
  id: letterId,
  entry_id: entryId,
  journal_date: '2026-10-14',
  voice: 'friend',
  language: 'auto',
  status: 'queued',
  content: null,
  model: null,
  written_at: null,
  deliver_at: ts,
  read_at: null,
  early: false,
  private: false,
  steps: {},
  error: null,
  revision: 1,
  created_at: ts,
  updated_at: ts,
  entry: { id: entryId, text: 'A fictional walk.', created_at: ts },
  ...over,
});
const input = {
  version: 2,
  request_id: letterId,
  journal_date: '2026-10-14',
  language: 'auto',
  voice: 'friend',
  memories: [],
  earlier_letters: [],
  entries: [{ id: entryId, written_at: '22:10', text: 'A fictional walk.' }],
};
const health = (letters: boolean, transcribe = letters) =>
  Response.json({
    letters,
    notes: letters,
    transcribe,
    provider: letters ? 'anthropic' : null,
    model: letters ? 'm' : null,
  });

type Route = (url: string, init: RequestInit) => Response | Promise<Response>;
function fake(routes: Record<string, Route | unknown>) {
  return vi.fn<typeof fetch>(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.includes('/rest/v1/profiles')) return Response.json([{ id: userId, status: 'active' }]);
    if (url.endsWith('/rpc/api_request_budget')) return Response.json(true);
    for (const [key, value] of Object.entries(routes))
      if (url.endsWith(key)) {
        if (value instanceof Response) return value.clone();
        if (typeof value === 'function') return (value as Route)(url, init);
        return Response.json(value);
      }
    throw new Error('unexpected ' + url);
  });
}
const req = (path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  new Request('https://api.example.test/api/v1' + path, {
    method,
    headers: {
      Authorization: 'Bearer user-token',
      Origin: 'https://web.example.test',
      ...(body !== undefined && !(body instanceof Uint8Array)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: body instanceof Uint8Array ? (body as BodyInit) : JSON.stringify(body) }),
  });
const bodyOf = (f: ReturnType<typeof fake>, suffix: string) =>
  JSON.parse(String(f.mock.calls.find(([u]) => String(u).endsWith(suffix))?.[1]?.body));

beforeEach(() => resetAiStatusCache());

describe('letter configuration', () => {
  it('needs an https AI origin and a strong token', () => {
    expect(parseAiServiceConfig(env)).toEqual({ url: 'https://ai.example.test', token: AI_TOKEN });
    expect(() =>
      parseAiServiceConfig({ ...env, AI_SERVICE_URL: 'http://ai.example.test' }),
    ).toThrow();
    expect(() =>
      parseAiServiceConfig({ ...env, AI_SERVICE_URL: 'https://ai.example.test/x' }),
    ).toThrow();
    expect(() => parseAiServiceConfig({ ...env, AI_SERVICE_TOKEN: 'short' })).toThrow();
    expect(() =>
      parseLetterWorkerConfig({ ...workerEnv, LETTER_JOB_TRIGGER_SECRET: AI_TOKEN }),
    ).toThrow();
    expect(parseLetterWorkerConfig(workerEnv).triggerSecret).toBe(TRIGGER);
  });
  it('reads as off when the AI service is missing or failing', async () => {
    expect(await aiStatus(null)).toEqual({ letters: false, notes: false, transcribe: false });
    const down = vi.fn<typeof fetch>(async () => new Response('down', { status: 500 }));
    expect(await aiStatus(parseAiServiceConfig(env), down)).toEqual({
      letters: false,
      notes: false,
      transcribe: false,
    });
  });
});

describe('letter routes', () => {
  it('seals a night with consent and the owner bearer only', async () => {
    const f = fake({ '/rpc/letter_request': letter() });
    const res = await createLetterHandler(
      config,
      env,
      f,
    )(
      req('/letters', 'POST', {
        entry_id: entryId,
        expected_revision: 1,
        journal_date: '2026-10-14',
        deliver_at: ts,
        consent: true,
      }),
      'letters',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://web.example.test');
    expect(bodyOf(f, '/rpc/letter_request')).toEqual({
      p_entry_id: entryId,
      p_expected_revision: 1,
      p_journal_date: '2026-10-14',
      p_deliver_at: ts,
    });
    const call = f.mock.calls.find(([u]) => String(u).endsWith('/rpc/letter_request'));
    expect(call?.[1]?.headers).toMatchObject({
      apikey: 'sb_publishable_fixture',
      Authorization: 'Bearer user-token',
    });
    expect(f.mock.calls.some(([u]) => String(u).startsWith('https://ai.example.test'))).toBe(false);
  });
  it('rejects a seal without consent and unknown patch keys', async () => {
    const f = fake({});
    const h = createLetterHandler(config, env, f);
    expect(
      (
        await h(
          req('/letters', 'POST', {
            entry_id: entryId,
            expected_revision: 1,
            journal_date: '2026-10-14',
            deliver_at: ts,
          }),
          'letters',
        )
      ).status,
    ).toBe(400);
    expect(
      (await h(req(`/letters/${letterId}`, 'PATCH', { content: {} }), 'letter', letterId)).status,
    ).toBe(400);
    expect(
      (await h(req(`/letters/${letterId}`, 'PATCH', { read: false }), 'letter', letterId)).status,
    ).toBe(400);
  });
  it('lists letters with a cursor and checks every row', async () => {
    const f = fake({ '/rpc/letter_list': [letter(), letter({ id: entryId })] });
    const res = await createLetterHandler(config, env, f)(req('/letters?limit=1'), 'letters');
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.next_cursor).toEqual(expect.any(String));
    const bad = fake({
      '/rpc/letter_list': [letter({ content: { headline: 'missing parts' }, status: 'ready' })],
    });
    expect((await createLetterHandler(config, env, bad)(req('/letters'), 'letters')).status).toBe(
      500,
    );
  });
  it('passes letter updates through as a validated patch', async () => {
    const f = fake({
      '/rpc/letter_update': letter({
        status: 'ready',
        content,
        read_at: ts,
        early: true,
        steps: { 'step.0': 'tried' },
      }),
    });
    const res = await createLetterHandler(config, env, f)(
      req(`/letters/${letterId}`, 'PATCH', {
        read: true,
        early: true,
        steps: { 'step.0': 'tried' },
      }),
      'letter',
      letterId,
    );
    expect(res.status).toBe(200);
    expect(bodyOf(f, '/rpc/letter_update')).toEqual({
      p_id: letterId,
      p_patch: { read: true, early: true, steps: { 'step.0': 'tried' } },
    });
  });
  it('maps the daily allowance to 429', async () => {
    const f = fake({
      '/rpc/letter_retry': () =>
        Response.json({ code: 'P0001', message: 'rate_limited' }, { status: 400 }),
    });
    const res = await createLetterHandler(config, env, f)(
      req(`/letters/${letterId}/retry`, 'POST'),
      'retry',
      letterId,
    );
    expect(res.status).toBe(429);
  });
  it('reports AI status to signed-in people only', async () => {
    const f = fake({ '/v1/health': health(true, false) });
    const res = await createLetterHandler(config, env, f)(req('/ai'), 'ai');
    expect((await res.json()).data).toEqual({ letters: true, notes: true, transcribe: false });
    const call = f.mock.calls.find(([u]) => String(u) === 'https://ai.example.test/v1/health');
    expect(call?.[1]?.headers).toEqual({ Authorization: 'Bearer ' + AI_TOKEN });
    expect(call?.[1]?.redirect).toBe('error');
    const anonymous = fake({});
    const r = new Request('https://api.example.test/api/v1/ai', {
      headers: { Origin: 'https://web.example.test' },
    });
    expect((await createLetterHandler(config, env, anonymous)(r, 'ai')).status).toBe(401);
  });
  it('writes a note from kept letters without sending ids or identity to the AI service', async () => {
    const f = fake({
      '/v1/health': health(true),
      '/rpc/note_input': {
        key: '2026-10',
        voice: 'mentor',
        language: 'en',
        letters: [
          {
            id: letterId,
            date: '2026-10-14',
            headline: 'A walk',
            tone: 'positive',
            themes: ['rest'],
            theirWords: ['a walk'],
            openQuestions: [],
            todos: [],
          },
        ],
      },
      '/rpc/ai_spend': true,
      '/v1/notes': Response.json({ text: 'A fictional note.', model: 'm' }),
      '/rpc/note_save': {
        key: '2026-10',
        text: 'A fictional note.',
        letter_count: 1,
        model: 'm',
        created_at: ts,
      },
    });
    const res = await createLetterHandler(
      config,
      env,
      f,
    )(req('/notes', 'POST', { key: '2026-10' }), 'notes');
    expect(res.status).toBe(200);
    const sent = bodyOf(f, '/v1/notes');
    expect(sent.letters[0]).not.toHaveProperty('id');
    expect(JSON.stringify(sent)).not.toContain(userId);
    expect(bodyOf(f, '/rpc/note_save')).toMatchObject({ p_source_ids: [letterId], p_model: 'm' });
  });
  it('refuses notes and voice while the AI service is not configured', async () => {
    const h = createLetterHandler(config, {}, fake({}));
    expect((await h(req('/notes', 'POST', { key: '2026-10' }), 'notes')).status).toBe(503);
    const audio = new Uint8Array(200);
    expect(
      (
        await h(
          req('/transcribe?lang=mixed', 'POST', audio, { 'Content-Type': 'audio/webm' }),
          'transcribe',
        )
      ).status,
    ).toBe(503);
  });
  it('forwards a recording once and keeps nothing', async () => {
    const f = fake({
      '/v1/health': health(true),
      '/rpc/ai_spend': true,
      '/v1/transcribe?lang=yue-Hant-HK': Response.json({ text: '今日好開心' }),
    });
    const audio = new Uint8Array(300);
    const res = await createLetterHandler(
      config,
      env,
      f,
    )(
      req('/transcribe?lang=yue-Hant-HK', 'POST', audio, {
        'Content-Type': 'audio/webm;codecs=opus',
      }),
      'transcribe',
    );
    expect((await res.json()).data).toEqual({ text: '今日好開心' });
    const call = f.mock.calls.find(([u]) => String(u).includes('/v1/transcribe'));
    expect(call?.[1]?.headers).toMatchObject({ 'Content-Type': 'audio/webm' });
    const silent = fake({
      '/v1/health': health(true),
      '/rpc/ai_spend': true,
      '/v1/transcribe?lang=mixed': Response.json({ error: 'no_speech' }, { status: 422 }),
    });
    resetAiStatusCache();
    const quiet = await createLetterHandler(
      config,
      env,
      silent,
    )(req('/transcribe', 'POST', audio, { 'Content-Type': 'audio/webm' }), 'transcribe');
    expect((await quiet.json()).data).toEqual({ text: '' });
    expect(
      (
        await createLetterHandler(
          config,
          env,
          fake({}),
        )(req('/transcribe?lang=fr', 'POST', audio, { 'Content-Type': 'audio/webm' }), 'transcribe')
      ).status,
    ).toBe(400);
    expect(
      (
        await createLetterHandler(
          config,
          env,
          fake({}),
        )(req('/transcribe', 'POST', audio, { 'Content-Type': 'text/plain' }), 'transcribe')
      ).status,
    ).toBe(400);
  });
});

describe('letter worker', () => {
  const trigger = (body: unknown = { limit: 2 }, bearer = TRIGGER) =>
    new Request('https://api.example.test/api/v1/internal/letters/process', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const worker = parseLetterWorkerConfig(workerEnv);

  it('requires its own trigger secret and no browser origin', async () => {
    const f = fake({});
    expect((await createLetterProcessor(config, worker, f)(trigger({}, AI_TOKEN))).status).toBe(
      401,
    );
    const withOrigin = new Request('https://api.example.test/x', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TRIGGER, Origin: 'https://web.example.test' },
    });
    expect((await createLetterProcessor(config, worker, f)(withOrigin)).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it('claims nothing while the AI service has no key', async () => {
    const f = fake({ '/v1/health': health(false) });
    const res = await createLetterProcessor(config, worker, f)(trigger());
    expect((await res.json()).data).toMatchObject({ claimed: 0, waiting: true });
    expect(f.mock.calls.some(([u]) => String(u).includes('letter_claim'))).toBe(false);
  });
  it('writes, fails, releases and skips by outcome', async () => {
    const second = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const third = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const fourth = '99999999-9999-4999-8999-999999999999';
    const f = fake({
      '/v1/health': health(true),
      '/rpc/letter_claim': [letterId, second, third, fourth].map((id) => ({
        id,
        lease_token: lease,
      })),
      '/rpc/letter_input': (_u: string, init: RequestInit) => {
        const id = JSON.parse(String(init.body)).p_id;
        if (id === fourth)
          return Response.json({ code: 'P0001', message: 'conflict' }, { status: 400 });
        return Response.json({ ...input, request_id: id });
      },
      '/v1/letters': (_u: string, init: RequestInit) => {
        const id = JSON.parse(String(init.body)).request_id;
        if (id === letterId)
          return Response.json({ version: 2, request_id: id, content, model: 'claude-sonnet-5-5' });
        if (id === second) return Response.json({ error: 'refused' }, { status: 422 });
        return Response.json({ error: 'not_configured' }, { status: 503 });
      },
      '/rpc/letter_finish': true,
      '/rpc/letter_fail': true,
      '/rpc/letter_release': true,
    });
    const res = await createLetterProcessor(config, worker, f)(trigger({ limit: 4 }));
    expect((await res.json()).data).toEqual({
      claimed: 4,
      written: 1,
      failed: 1,
      released: 1,
      skipped: 1,
      waiting: false,
    });
    expect(bodyOf(f, '/rpc/letter_finish')).toEqual({
      p_id: letterId,
      p_lease_token: lease,
      p_content: content,
      p_model: 'claude-sonnet-5-5',
    });
    expect(bodyOf(f, '/rpc/letter_fail')).toEqual({
      p_id: second,
      p_lease_token: lease,
      p_error: 'refused',
    });
    const claim = f.mock.calls.find(([u]) => String(u).endsWith('/rpc/letter_claim'));
    expect(claim?.[1]?.headers).toMatchObject({ apikey: 'sb_secret_fixture' });
    const ai = f.mock.calls.find(([u]) => String(u).endsWith('/v1/letters'));
    expect(JSON.stringify(ai?.[1]?.headers)).not.toContain('sb_secret');
  });
  it('treats a mismatched or malformed AI reply as invalid output', async () => {
    const f = fake({
      '/v1/health': health(true),
      '/rpc/letter_claim': [{ id: letterId, lease_token: lease }],
      '/rpc/letter_input': input,
      '/v1/letters': Response.json({ version: 2, request_id: entryId, content, model: 'm' }),
      '/rpc/letter_fail': true,
    });
    await createLetterProcessor(config, worker, f)(trigger());
    expect(bodyOf(f, '/rpc/letter_fail')).toMatchObject({ p_error: 'invalid_output' });
  });
});
