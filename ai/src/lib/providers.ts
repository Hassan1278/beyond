import type { ChatProvider, TranscriptionProvider } from './config';

/**
 * Model calls. Errors carry only a short code: upstream bodies are never logged
 * or returned, because they can echo the person's words.
 */
export type ProviderFailure = 'unavailable' | 'refused';

export class ProviderError extends Error {
  constructor(readonly code: ProviderFailure) {
    super(code);
    this.name = 'ProviderError';
  }
}

export interface StructuredRequest {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  name: string;
  maxTokens: number;
}

export type Fetcher = typeof fetch;

const CALL_TIMEOUT_MS = 75_000;
const MAX_RESPONSE_BYTES = 400_000;

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new ProviderError('unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new ProviderError('unavailable');
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    throw new ProviderError('unavailable');
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError('unavailable');
  }
}

async function post(fetcher: Fetcher, url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError('unavailable');
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw new ProviderError('unavailable');
  }
  return readJson(response);
}

/** Tolerates a fenced or chatty reply from OpenAI-compatible gateways. */
export function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** One structured answer. Returns null when the reply had no usable JSON (the caller retries). */
export async function generateStructured(
  provider: ChatProvider,
  request: StructuredRequest,
  fetcher: Fetcher = fetch,
): Promise<unknown> {
  if (provider.kind === 'anthropic') {
    const body = (await post(fetcher, `${provider.baseUrl}/v1/messages`, {
      headers: {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
        tools: [
          {
            name: request.name,
            description: 'Return the result in exactly this structure.',
            input_schema: request.schema,
          },
        ],
        tool_choice: { type: 'tool', name: request.name },
      }),
    })) as { stop_reason?: unknown; content?: unknown };
    if (body?.stop_reason === 'refusal') throw new ProviderError('refused');
    const blocks = Array.isArray(body?.content)
      ? (body.content as Array<Record<string, unknown>>)
      : [];
    const tool = blocks.find((b) => b && b.type === 'tool_use');
    return tool && typeof tool.input === 'object' ? tool.input : null;
  }
  const body = (await post(fetcher, `${provider.baseUrl}/chat/completions`, {
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      ...provider.extraBody,
      model: provider.model,
      max_tokens: request.maxTokens,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${request.system}\n\nRespond with one JSON object that matches this JSON Schema exactly:\n${JSON.stringify(request.schema)}`,
        },
        { role: 'user', content: request.user },
      ],
    }),
  })) as {
    choices?: Array<{
      message?: { content?: unknown; refusal?: unknown };
      finish_reason?: unknown;
    }>;
  };
  const choice = body?.choices?.[0];
  if (choice?.message?.refusal || choice?.finish_reason === 'content_filter')
    throw new ProviderError('refused');
  const text = choice?.message?.content;
  return typeof text === 'string' ? extractJson(text) : null;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; problems: string[] };

/** Ask, check, and ask once more with the problems if the first answer can't be used. */
export async function generateValidated<T>(
  provider: ChatProvider,
  request: StructuredRequest,
  validate: (raw: unknown) => Validation<T>,
  fetcher: Fetcher = fetch,
): Promise<Validation<T>> {
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? request.user
        : `${request.user}\n\nYour previous answer could not be used because: ${problems.slice(0, 6).join('; ')}. Return a corrected answer.`;
    const raw = await generateStructured(provider, { ...request, user }, fetcher);
    const result =
      raw === null
        ? { ok: false as const, problems: ['the reply was not a JSON object'] }
        : validate(raw);
    if (result.ok) return result;
    problems = result.problems;
  }
  return { ok: false, problems };
}

/** Spoken-language hints for mixed Cantonese, Mandarin and English. */
export const SPOKEN = {
  mixed: { prompt: '這是一段日記，可能夾雜廣東話、普通话同 English。' },
  'yue-Hant-HK': { prompt: '呢段係廣東話日記，可能夾雜少少 English。' },
  'zh-CN': { language: 'zh', prompt: '这是一段普通话日记，可能夹杂一些 English。' },
  'en-US': { language: 'en' },
} as const satisfies Record<string, { language?: string; prompt?: string }>;
export type SpokenLanguage = keyof typeof SPOKEN;

function extensionFor(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg')) return 'mp3';
  return 'webm';
}

/** One recording in, words out. Nothing is stored here. */
export async function transcribe(
  provider: TranscriptionProvider,
  audio: Uint8Array,
  mime: string,
  spoken: SpokenLanguage,
  fetcher: Fetcher = fetch,
): Promise<string> {
  const hint: { language?: string; prompt?: string } = SPOKEN[spoken];
  const form = new FormData();
  form.append(
    'file',
    new Blob([audio as BlobPart], { type: mime }),
    `recording.${extensionFor(mime)}`,
  );
  form.append('model', provider.model);
  if (hint.language) form.append('language', hint.language);
  if (hint.prompt) form.append('prompt', hint.prompt);
  const body = (await post(fetcher, `${provider.baseUrl}/audio/transcriptions`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: form,
  })) as { text?: unknown };
  return typeof body?.text === 'string' ? body.text.trim().slice(0, 20000) : '';
}
