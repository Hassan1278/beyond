/**
 * Client side of the morning letter.
 *
 * The browser never holds an API key: it asks `/api/letter`, which is the
 * serverless function in `api/letter.ts`. On a host without that function
 * (GitHub Pages, `file://`, no key configured) every call here fails and the
 * caller falls back to the scripted letters, which is the demo's normal mode.
 */
import type { LetterContent, Memory, VoiceId } from '../types';

const ENDPOINT = '/api/letter';
const TIMEOUT_MS = 60_000;

export interface LetterRequest {
  entry: string;
  voice: VoiceId;
  memories: Memory[];
  correction: string;
  today: string;
  tomorrow: string;
  time: string;
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
