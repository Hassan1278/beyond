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
  safety_flag: 'none',
  night_type: 'good',
  title: 'A calm walk by the harbour',
  body: 'Hey {{name}},\n\nYou walked by the harbour after class, and the calm came when you stopped rushing.\n\nTalk tonight,\nB.',
  reflection_question: 'Where else today could you slow down like that?',
  small_step: { text: 'Walk ten minutes after class', minutes: 999, category: 'homework' },
  themes: ['rest', 'not-a-theme', 'rest'],
  evidence: ['walked by the harbour', 'words they never wrote'],
  activities: [{ name: 'Harbour walk', energy: 5, absorption: 1.4 }],
  compass: { loves: ['walking', 'walking', 'the sea'], good_at: [], matters: [], within_reach: [] },
  interests: ['walking'],
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
  it('keeps checked evidence, known vocabularies and clipped values', () => {
    const r = validateLetter(goodLetter, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.version).toBe(3);
    expect(r.value.evidence).toEqual(['walked by the harbour']);
    expect(r.value.small_step).toEqual({
      text: 'Walk ten minutes after class',
      minutes: 15,
      category: 'reflection',
    });
    expect(r.value.steps).toHaveLength(1);
    expect(r.value.headline).toBe('A calm walk by the harbour');
    expect(r.value.openQuestions).toEqual(['Where else today could you slow down like that?']);
    expect(r.value.themes).toEqual(['rest']);
    expect(r.value.tone).toBe('positive');
    expect(r.value.activities).toEqual([{ name: 'Harbour walk', energy: 2, absorption: 1 }]);
    expect(r.value.compass.loves).toEqual(['walking', 'the sea']);
    expect(r.value.remember).toEqual([
      { text: 'Walks by the harbour to feel calm', entryId: ENTRY_ID },
    ]);
    expect(r.value.body).toContain('\n\n');
    expect(r.value.voice).toBe('friend');
  });
  it('needs one question and one step', () => {
    const r = validateLetter({ ...goodLetter, reflection_question: null, small_step: null }, input);
    expect(r).toEqual({
      ok: false,
      problems: ['needs exactly one reflection question', 'needs exactly one small step'],
    });
  });
  it('rejects headings and quotation marks around the person’s words', () => {
    const headed = validateLetter({ ...goodLetter, body: '# Recap\nYou walked.' }, input);
    expect(headed.ok).toBe(false);
    const quoted = validateLetter(
      { ...goodLetter, body: 'Hey {{name}}, you wrote “I walked by the harbour after class”.' },
      input,
    );
    expect(quoted.ok).toBe(false);
  });
  it('an urgent night has no step or question, keeps the contacts, learns nothing', () => {
    const r = validateLetter(
      { ...goodLetter, safety_flag: 'urgent', body: 'Thank you for writing this down.' },
      input,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.small_step).toBeNull();
    expect(r.value.reflection_question).toBeNull();
    expect(r.value.steps).toEqual([]);
    expect(r.value.body).toContain('18111');
    expect(r.value.remember).toEqual([]);
    expect(r.value.safetyConcern).toBe(true);
  });
  it('builds the prompt from the backend input without ids it does not need', () => {
    const p = letterRequest(input);
    expect(p.system).toContain('You are the letter writer for Beyond');
    expect(p.user).toContain('"voice": "Friend"');
    expect(p.user).toContain('"written_at": "22:40"');
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
    expect(body.content.steps).toHaveLength(1);
    expect(body.content.version).toBe(3);
    const call = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      tool_choice: { type: 'tool', name: 'beyond_letter' },
    });
  });

  it('asks once more with the problems, then gives up as invalid output', async () => {
    const bad = { ...goodLetter, small_step: null };
    const fetcher = vi.fn(async () => anthropicReply(bad));
    const res = await createService(env, fetcher)('letters', post('/v1/letters', input));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'invalid_output' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const second = JSON.parse(
      String((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body),
    );
    expect(second.messages[0].content).toContain('needs exactly one small step');
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
