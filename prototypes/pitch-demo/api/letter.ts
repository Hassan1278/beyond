/**
 * Beyond - the morning letter.
 *
 * One handler, three hosts: Vercel (`/api/letter`), Netlify (via
 * `netlify/functions/letter.ts`) and the Vite dev server (middleware in
 * `vite.config.ts`). The Anthropic key is read from the environment here and
 * never reaches the browser.
 *
 * If ANTHROPIC_API_KEY is missing, or the call fails, or the model declines,
 * this returns a non-200 and the client quietly uses its scripted letter. A
 * person who has just written about a hard night should never be shown an
 * error where their letter was meant to be.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/* ---------------------------------------------------------------- contract */

export const VOICE_IDS = ['friend', 'mentor', 'future', 'diary'] as const;
export type VoiceId = (typeof VOICE_IDS)[number];

/** The letter body. `from` is set by the client from the chosen voice. */
export interface LetterPayload {
  greet: string;
  said: string;
  rec: string;
  step: string;
  sign: string;
}

export interface LetterRequestBody {
  entry: string;
  voice: VoiceId;
  /** Memory lines the person has let Beyond keep. Empty when memory is paused. */
  memories?: string[];
  /** "Beyond got this wrong" text from an earlier letter, if any. */
  correction?: string;
  /** Localised date labels, so the letter can refer to last night and today. */
  today?: string;
  tomorrow?: string;
  /** Delivery time the person chose, e.g. "07:30". */
  time?: string;
}

export interface LetterResponse {
  letter: LetterPayload;
  meta: { model: string; ms: number; effort: string };
}

const MODEL = process.env.BEYOND_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.BEYOND_EFFORT || 'low') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const MAX_ENTRY_CHARS = 6000;

export const isConfigured = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

/* ----------------------------------------------------------------- prompts */

const VOICE_BRIEF: Record<VoiceId, string> = {
  friend:
    'A close friend who knows them well. Warm, direct, a little funny. Speaks plainly, uses ' +
    'contractions, willing to say the honest thing because they care. Never gushing.',
  mentor:
    'A mentor they trust. Clear, structured, honest, unsentimental. Names what they heard, ' +
    'then what the pattern suggests. Treats the person as capable.',
  future:
    'The person themselves, writing back from a few years ahead. Remembers this period with ' +
    'affection and perspective, and knows which of tonight worries turned out not to matter. ' +
    'Never predicts specific events or outcomes.',
  diary:
    'No persona at all. A plain, neutral summary in the style of a diary index: short, ' +
    'factual, no comfort, no encouragement, no voice.',
};

const SYSTEM = [
  'You write the morning letter for Beyond, a journaling app for students.',
  '',
  'How Beyond works: the person writes or speaks freely at night and nothing replies. The next',
  'morning they receive one letter about what they wrote. You are that letter.',
  '',
  'What the letter does, in this order:',
  '1. Say back what they actually said last night, in your own words, using some of theirs.',
  '2. Name what keeps coming back across their entries and the memories listed below.',
  '3. Offer exactly one small step they could take today.',
  '',
  'Hard rules:',
  '- Write only from what the entry and the memories support. Never invent events, people,',
  '  diagnoses, numbers or history. If you are unsure, stay with what they wrote.',
  '- No diagnosis, no clinical language, no personality labels, no scores, and no claims about',
  '  what they "are". You are not a therapist and must not sound like one.',
  '- No praise inflation, no pep talk, no cliches, no emoji, no markdown, no bullet lists, no',
  '  headings, and no questions back to them. This is a letter, not a chat.',
  '- Never compare them to anyone else, and never imply they are behind or ahead.',
  '- The one small step must be concrete, doable today, and take well under an hour. One step,',
  '  not a plan. It follows from their own words, not from generic self-help.',
  '- If the entry suggests they may be in danger, do not try to counsel or solve. Keep the',
  '  letter short and kind, say plainly that this is more than a letter should carry, and tell',
  '  them people are available right now and worth calling today.',
  '- Plain text only. No stage directions, no preamble, no explaining what you are doing.',
  '',
  'Length: greet is one short line. said is 2-4 sentences. rec is 2-3 sentences. step is one',
  'imperative sentence. sign is one short line, or empty for the plain diary voice.',
].join('\n');

function buildPrompt(b: LetterRequestBody): string {
  const mems = (b.memories ?? []).filter(Boolean);
  const parts = [
    `Voice to write in: ${b.voice}`,
    `Voice brief: ${VOICE_BRIEF[b.voice]}`,
    '',
    `Last night (${b.today ?? 'yesterday'}), they wrote:`,
    '<entry>',
    b.entry.slice(0, MAX_ENTRY_CHARS).trim(),
    '</entry>',
    '',
    mems.length
      ? `Memories they have let Beyond keep (use only where relevant):\n${mems
          .map((m) => `- ${m}`)
          .join('\n')}`
      : 'They have paused memory, so you have only this entry. Do not refer to past entries.',
  ];
  if (b.correction && b.correction.trim()) {
    parts.push(
      '',
      'They corrected an earlier letter with this. Treat it as true and let it shape this one:',
      `"${b.correction.slice(0, 600).trim()}"`,
    );
  }
  parts.push(
    '',
    `The letter arrives ${b.tomorrow ?? 'this morning'} at ${b.time ?? '07:30'}. Write it now.`,
  );
  return parts.join('\n');
}

/* ------------------------------------------------------------------- model */

export async function writeLetter(b: LetterRequestBody): Promise<LetterResponse> {
  const started = Date.now();

  const [{ default: Anthropic }, { zodOutputFormat }, z] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/zod'),
    import('zod'),
  ]);

  const Letter = z.object({
    greet: z.string().describe('One short opening line.'),
    said: z.string().describe('What they said last night, said back to them.'),
    rec: z.string().describe('What keeps coming back across entries and memories.'),
    step: z.string().describe('Exactly one small, concrete step for today.'),
    sign: z.string().describe('Short sign-off. Empty string for the plain diary voice.'),
  });

  const client = new Anthropic();

  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: EFFORT, format: zodOutputFormat(Letter) },
    messages: [{ role: 'user', content: buildPrompt(b) }],
  });

  // Safety classifiers can decline the request (HTTP 200, stop_reason "refusal").
  // Treated as a failure so the client falls back to a scripted letter instead of
  // showing a refusal to someone who has just written about a hard night.
  if (message.stop_reason === 'refusal') {
    throw Object.assign(new Error('declined'), { status: 422 });
  }
  if (!message.parsed_output) {
    throw Object.assign(new Error('letter could not be parsed'), { status: 502 });
  }

  const p = message.parsed_output;
  return {
    letter: {
      greet: p.greet.trim(),
      said: p.said.trim(),
      rec: p.rec.trim(),
      step: p.step.trim(),
      sign: b.voice === 'diary' ? '' : p.sign.trim(),
    },
    meta: { model: MODEL, ms: Date.now() - started, effort: EFFORT },
  };
}

/* ------------------------------------------------------------ http plumbing */

type Req = IncomingMessage & { body?: unknown };

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body !== 'string') return req.body;
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function validate(input: unknown): LetterRequestBody | string {
  if (typeof input !== 'object' || input === null) return 'expected a JSON body';
  const b = input as Record<string, unknown>;
  if (typeof b.entry !== 'string' || b.entry.trim().length < 10)
    return 'entry must be at least 10 characters';
  if (typeof b.voice !== 'string' || !VOICE_IDS.includes(b.voice as VoiceId))
    return `voice must be one of ${VOICE_IDS.join(', ')}`;
  return {
    entry: b.entry,
    voice: b.voice as VoiceId,
    memories: Array.isArray(b.memories)
      ? b.memories.filter((m): m is string => typeof m === 'string').slice(0, 20)
      : [],
    correction: typeof b.correction === 'string' ? b.correction : undefined,
    today: typeof b.today === 'string' ? b.today.slice(0, 40) : undefined,
    tomorrow: typeof b.tomorrow === 'string' ? b.tomorrow.slice(0, 40) : undefined,
    time: typeof b.time === 'string' ? b.time.slice(0, 10) : undefined,
  };
}

/**
 * Coarse per-instance throttle. The demo link is public during a pitch and the key
 * behind it is real money. Serverless instances are short-lived, so this is a speed
 * bump rather than a guarantee - set a spend limit on the key as well.
 */
const HOUR = 3_600_000;
const seen = new Map<string, number[]>();
const LIMIT = Number(process.env.BEYOND_RATE_LIMIT || 30);

function overLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < HOUR);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 500) {
    for (const [k, v] of seen) if (!v.some((t) => now - t < HOUR)) seen.delete(k);
  }
  return hits.length > LIMIT;
}

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') {
    return json(res, 200, { ok: isConfigured(), model: MODEL, effort: EFFORT });
  }
  if (req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'method not allowed' });
  }
  if (!isConfigured()) {
    return json(res, 503, { error: 'no ANTHROPIC_API_KEY on this host' });
  }

  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  if (overLimit(ip)) return json(res, 429, { error: 'too many letters from here this hour' });

  const parsed = validate(await readBody(req));
  if (typeof parsed === 'string') return json(res, 400, { error: parsed });

  try {
    return json(res, 200, await writeLetter(parsed));
  } catch (err) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const status =
      err instanceof Anthropic.NotFoundError
        ? 404
        : err instanceof Anthropic.RateLimitError
          ? 429
          : err instanceof Anthropic.APIConnectionError
            ? 504
            : err instanceof Anthropic.APIError && typeof err.status === 'number'
              ? err.status
              : typeof (err as { status?: number }).status === 'number'
                ? (err as { status: number }).status
                : 500;
    console.error('[beyond] letter failed', status, err instanceof Error ? err.message : err);
    return json(res, status, { error: 'letter unavailable' });
  }
}
