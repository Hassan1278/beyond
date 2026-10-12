/**
 * Beyond - reading themes out of an entry.
 *
 * The journal half of what the model does with an entry. The letter is written
 * for the person; this is written for the map: which of their recurring themes
 * tonight's entry touched, and one short line per theme in their own register,
 * kept with the date.
 *
 * Separate endpoint, same key and the same throttle as `/api/letter`. It is
 * the lesser of the two jobs: when it fails the client says nothing and the
 * map shows the history it already had, which is the correct outcome for
 * something nobody is sitting waiting for.
 */
import type { ServerResponse } from 'node:http';
import {
  BodyFailure,
  clientIp,
  isConfigured,
  json,
  overLimit,
  readBody,
  type Req,
} from './letter.js';

/* ---------------------------------------------------------------- contract */

export interface ThemeRef {
  id: string;
  name: string;
}

export interface ThemesRequestBody {
  entry: string;
  /** The only themes that exist. The model may not invent an eighth. */
  themes: ThemeRef[];
}

export interface ThemesResponse {
  found: { id: string; line: string }[];
  meta: { model: string; ms: number; effort: string };
}

const MODEL = process.env.BEYOND_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.BEYOND_EFFORT || 'low') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const MAX_ENTRY_CHARS = 6000;
/** Three is a reading of an entry. Seven is a filing system. */
const MAX_FOUND = 3;

/* ----------------------------------------------------------------- prompts */

const SYSTEM = [
  'You read one private journal entry and file it against a fixed list of themes the',
  'writer keeps returning to. You are not replying to them and they will never read',
  'your output as prose - it becomes a dated line under a theme in their own journal.',
  '',
  'Rules:',
  '- Choose only from the themes given. Never invent one. If the entry touches none of',
  '  them, return an empty list.',
  `- At most ${MAX_FOUND} themes, the ones the entry is actually about. An entry that`,
  '  mentions something in passing has not raised it.',
  '- One line per theme, in their register: lower case, a fragment rather than a',
  '  sentence, at most fourteen words, no final full stop.',
  '- The line must say what *they* said. Do not interpret, advise, encourage, diagnose',
  '  or summarise the entry as a whole. No second person, no "you".',
  '- Nothing that is not in the entry. If they did not say it, it does not go in.',
].join('\n');

function buildPrompt(b: ThemesRequestBody): string {
  return [
    'Themes on file:',
    ...b.themes.map((t) => `- ${t.id}: ${t.name}`),
    '',
    'The entry:',
    '<entry>',
    b.entry.slice(0, MAX_ENTRY_CHARS).trim(),
    '</entry>',
    '',
    'File it.',
  ].join('\n');
}

/* ------------------------------------------------------------------- model */

export async function readThemes(b: ThemesRequestBody): Promise<ThemesResponse> {
  const started = Date.now();

  const [{ default: Anthropic }, { zodOutputFormat }, z] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/zod'),
    import('zod'),
  ]);

  // The enum is built from the request, so the schema itself forbids an id
  // that has no page to open behind it.
  const ids = b.themes.map((t) => t.id) as [string, ...string[]];
  const Found = z.object({
    found: z
      .array(
        z.object({
          id: z.enum(ids).describe('The theme this line belongs under.'),
          line: z.string().describe('What they said about it, in their own words.'),
        }),
      )
      .describe(`The themes this entry raised, at most ${MAX_FOUND}.`),
  });

  const client = new Anthropic({ timeout: 45000, maxRetries: 0 });

  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: EFFORT, format: zodOutputFormat(Found) },
    messages: [{ role: 'user', content: buildPrompt(b) }],
  });

  // Same reasoning as the letter: a decline is a failure, not something to
  // show someone. The map just keeps the history it had.
  if (message.stop_reason === 'refusal') {
    throw Object.assign(new Error('declined'), { status: 422 });
  }
  if (!message.parsed_output) {
    throw Object.assign(new Error('themes could not be parsed'), { status: 502 });
  }

  const allowed = new Set(ids);
  const seenIds = new Set<string>();
  const found: ThemesResponse['found'] = [];
  for (const row of message.parsed_output.found) {
    const line = row.line.trim().replace(/[.]+$/, '');
    if (!line || !allowed.has(row.id) || seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    found.push({ id: row.id, line });
    if (found.length >= MAX_FOUND) break;
  }

  return { found, meta: { model: MODEL, ms: Date.now() - started, effort: EFFORT } };
}

/* ------------------------------------------------------------ http plumbing */

export function validate(input: unknown): ThemesRequestBody | string {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    return 'expected a JSON body';
  const b = input as Record<string, unknown>;
  if (Object.keys(b).some((key) => !['entry', 'themes'].includes(key)))
    return 'unexpected request field';
  if (typeof b.entry !== 'string' || b.entry.trim().length < 10)
    return 'entry must be at least 10 characters';
  if (b.entry.length > MAX_ENTRY_CHARS) return 'entry must be at most 6000 characters';
  if (!Array.isArray(b.themes) || b.themes.length === 0 || b.themes.length > 20)
    return 'themes must contain 1 to 20 items';

  const themes: ThemeRef[] = [];
  for (const row of b.themes.slice(0, 20)) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return 'invalid theme';
    const t = row as { id?: unknown; name?: unknown };
    if (typeof t.id !== 'string' || typeof t.name !== 'string') return 'invalid theme';
    if (
      !/^[a-z][a-z0-9-]{0,30}$/.test(t.id) ||
      !t.name.trim() ||
      t.name.length > 60 ||
      themes.some((theme) => theme.id === t.id)
    )
      return 'invalid theme';
    themes.push({ id: t.id, name: t.name.slice(0, 60) });
  }
  if (!themes.length) return 'no usable themes in the list';
  return { entry: b.entry, themes };
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
  if (overLimit(clientIp(req)))
    return json(res, 429, { error: 'too many requests from here this hour' });

  let body: unknown;
  try {
    body = await readBody(req);
  } catch (error) {
    return json(res, error instanceof BodyFailure ? error.status : 400, {
      error: 'invalid request body',
    });
  }
  const parsed = validate(body);
  if (typeof parsed === 'string') return json(res, 400, { error: parsed });

  try {
    return json(res, 200, await readThemes(parsed));
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
    console.error('[beyond] themes unavailable', status);
    return json(res, status, { error: 'themes unavailable' });
  }
}
