/**
 * Client side of the morning letter.
 *
 * The browser never holds an API key: it asks `/api/letter`, which is the
 * serverless function in `api/letter.ts`. On a host without that function
 * (GitHub Pages, `file://`, no key configured) every call here fails and the
 * caller falls back to the scripted letters, which is the demo's normal mode.
 */
import type { LetterContent, Memory, ThemeExtract, ThemeId, VoiceId } from '../types';
import { THEMES } from '../data/themes';

const ENDPOINT = '/api/letter';
const THEME_ENDPOINT = '/api/themes';
const TIMEOUT_MS = 60_000;

export interface LetterRequest {
  entry: string;
  voice: VoiceId;
  memories: Memory[];
  correction: string;
  today: string;
  tomorrow: string;
  time: string;
  /** Themes the person has popped. The letter must not raise these. */
  avoid: string[];
}

export interface LetterResult {
  letter: LetterContent;
  ms: number;
  model: string;
}

/** Thrown with a short message that is safe to show in the UI. */
export class LetterUnavailable extends Error {}

const MESSAGES: Record<number, string> = {
  400: 'Check the entry and memory length before trying again.',
  413: 'That entry or its memories are too long for the demo.',
  429: 'Too many letters from this device in the last hour.',
  503: 'No API key on this host, so letters stay scripted.',
  504: 'The model took too long to answer.',
};

async function readJson(res: Response): Promise<unknown> {
  // A static host answers /api/letter with index.html; don't try to parse that.
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) return null;
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Is a live letter possible on this host? `null` means we could not tell. */
export async function checkAvailable(): Promise<{ ok: boolean; model: string | null }> {
  try {
    const res = await fetch(ENDPOINT, { method: 'GET', cache: 'no-store' });
    const body = await readJson(res);
    if (!res.ok || typeof body !== 'object' || body === null) return { ok: false, model: null };
    const b = body as { ok?: unknown; model?: unknown };
    return { ok: b.ok === true, model: typeof b.model === 'string' ? b.model : null };
  } catch {
    return { ok: false, model: null };
  }
}

export async function requestLetter(
  req: LetterRequest,
  signal?: AbortSignal,
): Promise<LetterResult> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  const cancel = (): void => abort.abort();
  if (signal?.aborted) abort.abort();
  else signal?.addEventListener('abort', cancel, { once: true });

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: abort.signal,
      cache: 'no-store',
      body: JSON.stringify({
        entry: req.entry,
        voice: req.voice,
        memories: req.memories.map((m) => m.t),
        correction: req.correction || undefined,
        today: req.today,
        tomorrow: req.tomorrow,
        time: req.time,
        avoid: req.avoid.length ? req.avoid : undefined,
      }),
    });

    const body = await readJson(res);
    if (!res.ok || body === null) {
      throw new LetterUnavailable(MESSAGES[res.status] ?? 'The live letter could not be written.');
    }

    const b = body as { letter?: unknown; meta?: { ms?: unknown; model?: unknown } };
    const l = b.letter as Partial<LetterContent> | undefined;
    if (
      !l ||
      typeof l.said !== 'string' ||
      typeof l.step !== 'string' ||
      !['greet', 'said', 'rec', 'step', 'sign'].every(
        (key) => typeof (l as Record<string, unknown>)[key] === 'string',
      )
    ) {
      throw new LetterUnavailable('The live letter came back incomplete.');
    }

    return {
      letter: {
        greet: l.greet ?? '',
        said: l.said,
        rec: l.rec ?? '',
        step: l.step,
        sign: l.sign ?? '',
      },
      ms: typeof b.meta?.ms === 'number' ? b.meta.ms : 0,
      model: typeof b.meta?.model === 'string' ? b.meta.model : 'claude',
    };
  } catch (err) {
    if (err instanceof LetterUnavailable) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LetterUnavailable('The letter took too long, so this one is scripted.');
    }
    throw new LetterUnavailable('No connection to the letter writer.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/**
 * The journal side of reading an entry: which of the seven themes it touches,
 * and one short line per theme in the writer's own words.
 *
 * Separate from the letter on purpose. The letter is the thing someone is
 * waiting for, so it must not be held up by this, and a failure here is
 * invisible - the map simply shows the history it already had.
 */
export async function extractThemes(
  req: { entry: string; today: string },
  signal?: AbortSignal,
): Promise<ThemeExtract[]> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  const cancel = (): void => abort.abort();
  if (signal?.aborted) abort.abort();
  else signal?.addEventListener('abort', cancel, { once: true });

  try {
    const res = await fetch(THEME_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: abort.signal,
      cache: 'no-store',
      body: JSON.stringify({
        entry: req.entry,
        themes: THEMES.map((t) => ({ id: t.id, name: t.name })),
      }),
    });

    const body = await readJson(res);
    if (!res.ok || body === null) {
      throw new LetterUnavailable(MESSAGES[res.status] ?? 'Themes could not be read.');
    }

    const found = (body as { found?: unknown }).found;
    if (!Array.isArray(found)) throw new LetterUnavailable('Themes came back empty.');

    const ids = new Set<string>(THEMES.map((t) => t.id));
    const out: ThemeExtract[] = [];
    for (const row of found) {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) continue;
      const r = row as { id?: unknown; line?: unknown };
      // The model picks from a fixed list, so anything off it is dropped
      // rather than invented into a theme that has no page.
      if (typeof r.id !== 'string' || !ids.has(r.id)) continue;
      if (typeof r.line !== 'string' || !r.line.trim()) continue;
      if (r.line.length > 2000 || out.some((f) => f.id === r.id)) continue;
      out.push({
        id: r.id as ThemeId,
        line: { date: req.today, text: r.line.trim(), fresh: true },
      });
      if (out.length === 3) break;
    }
    return out;
  } catch (err) {
    if (err instanceof LetterUnavailable) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LetterUnavailable('Reading themes took too long.');
    }
    throw new LetterUnavailable('No connection to the theme reader.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
