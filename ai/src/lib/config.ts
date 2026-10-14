/**
 * Environment for the AI service. Keys are optional: without them the service
 * reports itself as not configured and the backend leaves letters queued.
 * Only AI_SERVICE_TOKEN is required, so nobody but the backend can call it.
 */
export type Env = Record<string, string | undefined>;

export interface ChatProvider {
  kind: 'anthropic' | 'openai';
  apiKey: string;
  baseUrl: string;
  model: string;
  extraBody: Record<string, unknown>;
}

export interface TranscriptionProvider {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AiConfig {
  token: string;
  chat: ChatProvider | null;
  transcription: TranscriptionProvider | null;
}

const TOKEN = /^[-A-Za-z0-9_]{32,256}$/;
const MODEL = /^[A-Za-z0-9_.:/-]{1,100}$/;
const KEY = /^[\x21-\x7e]{8,512}$/;

function value(env: Env, name: string): string {
  return (env[name] ?? '').trim();
}

function baseUrl(raw: string, fallback: string): string {
  const url = new URL(raw || fallback);
  const local =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !local) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid provider URL.');
  return url.href.replace(/\/$/, '');
}

function model(raw: string, fallback: string): string {
  const name = raw || fallback;
  if (!MODEL.test(name)) throw new Error('Invalid model name.');
  return name;
}

function extraBody(raw: string): Record<string, unknown> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Invalid OPENAI_EXTRA_BODY.');
  for (const reserved of ['model', 'messages', 'max_tokens', 'response_format'])
    if (reserved in parsed) throw new Error('Invalid OPENAI_EXTRA_BODY.');
  return parsed as Record<string, unknown>;
}

function key(raw: string): string | null {
  if (!raw) return null;
  if (!KEY.test(raw)) throw new Error('Invalid API key format.');
  return raw;
}

/** Throws when something is set but malformed; missing keys are simply "not configured". */
export function parseConfig(env: Env): AiConfig {
  const token = value(env, 'AI_SERVICE_TOKEN');
  if (!TOKEN.test(token)) throw new Error('AI_SERVICE_TOKEN is missing or too short.');

  const anthropicKey = key(value(env, 'ANTHROPIC_API_KEY'));
  const openaiKey = key(value(env, 'OPENAI_API_KEY'));
  const pref = (value(env, 'AI_PROVIDER') || 'auto').toLowerCase();
  if (!['auto', 'anthropic', 'openai'].includes(pref)) throw new Error('Invalid AI_PROVIDER.');

  let chat: ChatProvider | null = null;
  if ((pref === 'anthropic' || pref === 'auto') && anthropicKey) {
    chat = {
      kind: 'anthropic',
      apiKey: anthropicKey,
      baseUrl: baseUrl(value(env, 'ANTHROPIC_BASE_URL'), 'https://api.anthropic.com'),
      model: model(value(env, 'ANTHROPIC_MODEL'), 'claude-sonnet-5-5'),
      extraBody: {},
    };
  } else if ((pref === 'openai' || pref === 'auto') && openaiKey) {
    chat = {
      kind: 'openai',
      apiKey: openaiKey,
      baseUrl: baseUrl(value(env, 'OPENAI_BASE_URL'), 'https://api.openai.com/v1'),
      model: model(value(env, 'OPENAI_MODEL'), 'gpt-4.1-mini'),
      extraBody: extraBody(value(env, 'OPENAI_EXTRA_BODY')),
    };
  }

  const transcribeKey = key(value(env, 'TRANSCRIBE_API_KEY')) ?? openaiKey;
  const transcription = transcribeKey
    ? {
        apiKey: transcribeKey,
        baseUrl: baseUrl(
          value(env, 'TRANSCRIBE_BASE_URL') || value(env, 'OPENAI_BASE_URL'),
          'https://api.openai.com/v1',
        ),
        model: model(value(env, 'TRANSCRIBE_MODEL'), 'whisper-1'),
      }
    : null;

  return { token, chat, transcription };
}
