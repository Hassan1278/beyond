import { describe, expect, it, vi } from 'vitest';
import { createService } from './service';
import { validateLetter, letterRequest, type LetterInput } from './letter';
import { parseConfig } from './config';

const TOKEN = 'test-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ENTRY_ID = '11111111-1111-4111-8111-111111111111';
const input: LetterInput = {
  version: 2,
  request_id: '22222222-2222-4222-8222-222222222222',
  journal_date: '2026-10-14',
  language: 'auto',
  voice: 'friend',
  memories: ['Fictional memory'],
  earlier_letters: [],
  entries: [
    {
      id: ENTRY_ID,
      written_at: '22:40',
      text: 'I walked by the harbour after class. 我覺得好平靜。',
    },
  ],
};
const goodLetter = {
  language: 'mixed',
  greeting: 'Hey,',
  signoff: 'Talk tonight,\nB.',
  headline: 'A calm walk by the harbour',
  recap: 'You wrote that you walked by the harbour after class.',
  analysis: [
    {
      lens: 'feeling',
      title: 'Calm after class',
      text: 'It might be that walking helps.',
      quote: '“我覺得好平靜”',
      entryId: ENTRY_ID,
    },
    {
      lens: 'pattern',
      title: 'Invented',
      text: 'Something else.',
      quote: 'words they never wrote',
      entryId: 'nope',
    },
  ],
  challenge: { issue: 'Nothing needs fixing', cause: 'An ordinary good day.' },
  advice: { text: 'Walk again on Thursday.', why: 'You felt calm.' },
  encouragement: 'You noticed the calm.',
  steps: [
    { text: 'Walk ten minutes', kind: 'rest', minutes: 10, why: 'calm' },
    { text: 'Message a friend', kind: 'connection', minutes: 999, why: 'connection' },
    { text: 'Write one line', kind: 'homework', minutes: 0, why: 'reflect' },
  ],
  themes: ['rest', 'not-a-theme', 'rest'],
  openQuestions: [],
  wins: [],
  tone: 'positive',
  safetyConcern: false,
  remember: [
    { text: 'Walks by the harbour to feel calm.', entryId: ENTRY_ID },
    { text: 'From nowhere', entryId: 'x' },
  ],
};

function anthropicReply(toolInput: unknown, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      content: [{ type: 'tool_use', name: 'beyond_letter', input: toolInput }],
      ...extra,
    }),
    { status: 200 },
  );
}
const req = (path: string, init: RequestInit = {}, token = TOKEN) =>
  new Request(`https://ai.test${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
const post = (path: string, body: unknown, token = TOKEN) =>
  req(
    path,
    { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    token,
  );

describe('configuration', () => {
  it('requires a strong service token', () => {
    expect(() => parseConfig({})).toThrow();
    expect(() => parseConfig({ AI_SERVICE_TOKEN: 'short' })).toThrow();
  });
  it('treats empty keys as not configured', () => {
    const c = parseConfig({ AI_SERVICE_TOKEN: TOKEN, ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' });
    expect(c.chat).toBeNull();
    expect(c.transcription).toBeNull();
  });
  it('prefers Anthropic in auto mode and uses OpenAI for transcription', () => {
    const c = parseConfig({
      AI_SERVICE_TOKEN: TOKEN,
      ANTHROPIC_API_KEY: 'sk-ant-dummy-key',
      OPENAI_API_KEY: 'sk-dummy-key',
    });
    expect(c.chat?.kind).toBe('anthropic');
    expect(c.chat?.model).toBe('claude-sonnet-5-5');
    expect(c.transcription?.model).toBe('whisper-1');
  });
  it('rejects insecure provider URLs', () => {
    expect(() =>
      parseConfig({
        AI_SERVICE_TOKEN: TOKEN,
        OPENAI_API_KEY: 'sk-dummy-key',
        OPENAI_BASE_URL: 'http://evil.test/v1',
      }),
    ).toThrow();
  });
});

describe('letter checks', () => {
  it('keeps only exact quotes, known vocabularies and clipped values', () => {
    const r = validateLetter(goodLetter, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.analysis[0]).toMatchObject({ quote: '我覺得好平靜', entryId: ENTRY_ID });
    expect(r.value.analysis[1]).toMatchObject({ quote: '', entryId: ENTRY_ID });
    expect(r.value.steps.map((s) => [s.kind, s.minutes])).toEqual([
      ['rest', 10],
      ['connection', 60],
      ['practical', 10],
    ]);
    expect(r.value.themes).toEqual(['rest']);
    expect(r.value.remember).toEqual([
      { text: 'Walks by the harbour to feel calm', entryId: ENTRY_ID },
    ]);
    expect(r.value.voice).toBe('friend');
  });
  it('rejects letters without three steps', () => {
    const r = validateLetter({ ...goodLetter, steps: goodLetter.steps.slice(0, 2) }, input);
    expect(r).toEqual({ ok: false, problems: ['needs exactly 3 steps (got 2)'] });
  });
  it('drops memories when there is a safety concern', () => {
    const r = validateLetter({ ...goodLetter, safetyConcern: true }, input);
    expect(r.ok && r.value.remember).toEqual([]);
  });
  it('builds the prototype prompt from the backend input', () => {
    const p = letterRequest(input);
    expect(p.user).toContain('You write the morning reflection letter for "Beyond"');
    expect(p.user).toContain('"voiceGuide": "Write as a warm, direct friend');
    expect(p.user).toContain('"writtenAt": "22:40"');
    expect(p.user).not.toContain('request_id');
  });
});

describe('service', () => {
  const env = {
    AI_SERVICE_TOKEN: TOKEN,
    ANTHROPIC_API_KEY: 'sk-ant-dummy-key',
    OPENAI_API_KEY: 'sk-dummy-key',
  };

  it('is closed without a valid token', async () => {
    const fetcher = vi.fn();
    const s = createService(env, fetcher);
    expect(
      (await s('health', req('/v1/health', {}, 'wrong-token-aaaaaaaaaaaaaaaaaaaaaaaaaa'))).status,
    ).toBe(401);
    expect((await s('letters', post('/v1/letters', input, 'x'))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await createService({})('health', req('/v1/health'))).status).toBe(503);
  });

  it('reports not configured with empty keys and never calls out', async () => {
    const fetcher = vi.fn();
    const s = createService({ AI_SERVICE_TOKEN: TOKEN, ANTHROPIC_API_KEY: '' }, fetcher);
    const health = await s('health', req('/v1/health'));
    expect(await health.json()).toEqual({
      letters: false,
      notes: false,
      transcribe: false,
      provider: null,
      model: null,
    });
    const letter = await s('letters', post('/v1/letters', input));
    expect(letter.status).toBe(503);
    expect(await letter.json()).toEqual({ error: 'not_configured' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('writes a checked letter with Anthropic tool output', async () => {
    const fetcher = vi.fn(async () => anthropicReply(goodLetter));
    const res = await createService(env, fetcher)('letters', post('/v1/letters', input));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({
      version: 2,
      request_id: input.request_id,
      model: 'claude-sonnet-5-5',
    });
    expect(body.content.steps).toHaveLength(3);
    const call = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      tool_choice: { type: 'tool', name: 'beyond_letter' },
    });
  });

  it('asks once more with the problems, then gives up as invalid output', async () => {
    const bad = { ...goodLetter, steps: [] };
    const fetcher = vi.fn(async () => anthropicReply(bad));
    const res = await createService(env, fetcher)('letters', post('/v1/letters', input));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'invalid_output' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const second = JSON.parse(
      String((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body),
    );
    expect(second.messages[0].content).toContain('needs exactly 3 steps (got 0)');
  });

  it('maps refusals and upstream failures to short codes without upstream text', async () => {
    const refused = createService(
      env,
      vi.fn(async () => anthropicReply({}, { stop_reason: 'refusal' })),
    );
    expect(await (await refused('letters', post('/v1/letters', input))).json()).toEqual({
      error: 'refused',
    });
    const down = createService(
      env,
      vi.fn(
        async () => new Response('secret upstream detail with the entry text', { status: 500 }),
      ),
    );
    const res = await down('letters', post('/v1/letters', input));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('{"error":"unavailable"}');
  });

  it('rejects malformed input before calling a model', async () => {
    const fetcher = vi.fn();
    const s = createService(env, fetcher);
    expect((await s('letters', post('/v1/letters', { ...input, owner_id: 'x' }))).status).toBe(400);
    expect((await s('letters', post('/v1/letters', { ...input, entries: [] }))).status).toBe(400);
    expect((await s('letters', req('/v1/letters', { method: 'POST', body: '{}' }))).status).toBe(
      400,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('writes notes through an OpenAI-compatible provider', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '```json\n{"text":"A calm month."}\n```' } }],
          }),
        ),
    );
    const s = createService({ AI_SERVICE_TOKEN: TOKEN, OPENAI_API_KEY: 'sk-dummy-key' }, fetcher);
    const res = await s(
      'notes',
      post('/v1/notes', {
        version: 2,
        key: '2026-10',
        voice: 'mentor',
        language: 'en',
        letters: [
          {
            date: '2026-10-01',
            headline: 'A walk',
            tone: 'positive',
            themes: ['rest'],
            theirWords: ['平靜'],
            openQuestions: [],
            todos: [{ text: 'Walk', status: 'tried' }],
          },
        ],
      }),
    );
    expect(await res.json()).toEqual({ text: 'A calm month.', model: 'gpt-4.1-mini' });
  });

  it('transcribes audio and validates its language and type', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ text: ' 今日好開心 ' })));
    const s = createService(env, fetcher);
    const audio = new Uint8Array(500);
    const ok = await s(
      'transcribe',
      req('/v1/transcribe?lang=yue-Hant-HK', {
        method: 'POST',
        body: audio,
        headers: { 'content-type': 'audio/webm;codecs=opus' },
      }),
    );
    expect(await ok.json()).toEqual({ text: '今日好開心' });
    const form = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get('prompt')).toContain('廣東話');
    expect(
      (
        await s(
          'transcribe',
          req('/v1/transcribe?lang=fr', {
            method: 'POST',
            body: audio,
            headers: { 'content-type': 'audio/webm' },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await s(
          'transcribe',
          req('/v1/transcribe', {
            method: 'POST',
            body: audio,
            headers: { 'content-type': 'text/plain' },
          }),
        )
      ).status,
    ).toBe(400);
    const big = new Uint8Array(4_300_000);
    expect(
      (
        await s(
          'transcribe',
          req('/v1/transcribe', {
            method: 'POST',
            body: big,
            headers: { 'content-type': 'audio/webm' },
          }),
        )
      ).status,
    ).toBe(413);
  });
});
