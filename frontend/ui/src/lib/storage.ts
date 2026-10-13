/**
 * The demo remembers itself across reloads, so a judge can put the phone down
 * mid-letter and pick it up again. Persistence is unencrypted browser storage:
 * there is no account or backend integration. Optional live requests send text
 * to the letter endpoint and provider; local deletion cannot recall that data.
 *
 * Every read and write is guarded - localStorage throws in private windows and
 * when site data is blocked, and the app has to render fine without it.
 */

const KEY = 'beyond.demo.v1';

export function load<T>(): Partial<T> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<T>;
  } catch {
    return null;
  }
}

export function save(value: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* private window, blocked site data: the demo just stops persisting */
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
