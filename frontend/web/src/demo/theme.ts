/**
 * Palette switching.
 *
 * The theme is an attribute on <html>, so every token in themes.css swaps at
 * once and nothing else in the app needs to know which palette is live. It is
 * applied before React mounts (see main.tsx) so there is no flash of the
 * default on load.
 */

export const THEME_IDS = ['night', 'bloom'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

const KEY = 'beyond.theme';

/** The browser-chrome colour each palette should tint to. */
const BAR: Record<ThemeId, string> = {
  night: '#0b0c0e',
  bloom: '#27102f',
};

const isTheme = (v: unknown): v is ThemeId =>
  typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);

export function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* private window or blocked site data: fall through to the default */
  }
  return 'night';
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR[id]);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* the choice just will not survive a reload */
  }
}
