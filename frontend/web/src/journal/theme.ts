/**
 * The journal's colour themes. The palettes live in journal.css as token sets
 * under `:root[data-jtheme=…]`; this only remembers the choice (a display
 * setting, kept in this browser) and sets the attribute. Midnight is the default.
 */
export type JournalTheme = 'midnight' | 'candle' | 'ink' | 'paper';

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
  {
    id: 'paper',
    name: 'Paper',
    note: 'Black and white, light',
    bands: ['#f6f6f4', '#161616', '#ffffff'],
  },
];

const KEY = 'beyond.journal-theme';
const isTheme = (v: unknown): v is JournalTheme => JOURNAL_THEMES.some((t) => t.id === v);

let theme: JournalTheme = 'midnight';
try {
  const saved = localStorage.getItem(KEY);
  if (isTheme(saved)) theme = saved;
} catch {
  /* storage blocked: the default */
}

export const journalTheme = (): JournalTheme => theme;

export function applyJournalTheme(): void {
  const root = document.documentElement;
  if (theme === 'midnight') delete root.dataset.jtheme;
  else root.dataset.jtheme = theme;
}

export function setJournalTheme(next: string): void {
  if (!isTheme(next)) return;
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* still switches for this visit */
  }
  applyJournalTheme();
}

/** A round swatch: the night on one side, the accent, and a slice of the paper. */
export const themeSwatch = ([a, b, c]: [string, string, string]): string =>
  `conic-gradient(from 200deg, ${a} 0 50%, ${b} 50% 78%, ${c} 78% 100%)`;
