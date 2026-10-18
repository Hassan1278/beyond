/**
 * The journal's colour themes. The palettes live in journal.css as token sets
 * under `:root[data-jtheme=…]`; this holds the choice for the visit and sets the
 * attribute. The account keeps it (settings.journal_theme). Midnight is the default.
 */
export type JournalTheme = 'midnight' | 'candle' | 'ink';

/** night, accent, paper: the swatch previews the page, not a hint at it. */
export const JOURNAL_THEMES: {
  id: JournalTheme;
  name: string;
  note: string;
  bands: [string, string, string];
}[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Deep navy, a soft periwinkle light',
    bands: ['#0b0d17', '#8188f6', '#e9ebf7'],
  },
  {
    id: 'candle',
    name: 'Candle',
    note: 'Warm charcoal and amber, the original',
    bands: ['#15100e', '#e3955a', '#ede0c8'],
  },
  {
    id: 'ink',
    name: 'Ink',
    note: 'Black and white, dark',
    bands: ['#0c0c0c', '#ececec', '#f3f3f1'],
  },
];

const isTheme = (v: unknown): v is JournalTheme => JOURNAL_THEMES.some((t) => t.id === v);

/* Not kept in this browser: the theme comes from the link (?theme=gold|blue, set by the
   site) and, once signed in, from the account's settings. */
let theme: JournalTheme = 'midnight';
let pendingLinkTheme = false;
try {
  const v = new URLSearchParams(window.location.search).get('theme');
  pendingLinkTheme = v === 'gold' || v === 'blue';
  if (v === 'gold') theme = 'candle';
  else if (v === 'blue') theme = 'midnight';
} catch {
  /* the default */
}
/** True when this visit's link asked for a theme, so the account should take it. */
export const themeFromLink = (): boolean => pendingLinkTheme;
/** Consume only after settings arrive, since the sign-in screen cleans the URL. */
export const clearThemeFromLink = (): void => {
  pendingLinkTheme = false;
};

export const journalTheme = (): JournalTheme => theme;

export function applyJournalTheme(): void {
  const root = document.documentElement;
  if (theme === 'midnight') delete root.dataset.jtheme;
  else root.dataset.jtheme = theme;
}

export function setJournalTheme(next: string): void {
  if (!isTheme(next)) return;
  theme = next;
  applyJournalTheme();
}

/** A round swatch: the night on one side, the accent, and a slice of the paper. */
export const themeSwatch = ([a, b, c]: [string, string, string]): string =>
  `conic-gradient(from 200deg, ${a} 0 50%, ${b} 50% 78%, ${c} 78% 100%)`;
