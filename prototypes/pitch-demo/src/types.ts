/** Shared vocabulary for the Beyond demo. */

export type VoiceId = 'friend' | 'mentor' | 'future' | 'diary';

export type ScreenId =
  | 'welcome'
  | 'voice'
  | 'home'
  | 'write'
  | 'sealed'
  | 'letter'
  | 'theme'
  | 'patterns'
  | 'memory'
  | 'safety';

/** Screens that live behind a tab in the app's tab bar. */
export type TabId = 'home' | 'letter' | 'patterns' | 'memory';

export type LetterTime = '07:00' | '07:30' | '08:00';
export type WriteMode = 'text' | 'voice';
export type StepChoice = 'try' | 'skip';

/** Where a letter comes from. `ai` falls back to `scripted` whenever it cannot. */
export type LetterSource = 'scripted' | 'ai';

export interface Voice {
  id: VoiceId;
  name: string;
  desc: string;
  /** "From your Friend", "Plain diary", ... */
  from: string;
}

/**
 * The letter, in five parts. Mirrors the structured output the model returns in
 * `api/letter.ts`; kept separate so the browser bundle never imports node code.
 */
export interface LetterContent {
  greet: string;
  said: string;
  rec: string;
  step: string;
  sign: string;
}

export interface Memory {
  /** The remembered line. */
  t: string;
  /** Where it came from: "From 3 entries", "You told Beyond - 3 Sep". */
  s: string;
}

export type ThemeId =
  'behind' | 'internships' | 'sleep' | 'photography' | 'friends' | 'money' | 'running';

/** One thing they said about a theme, on one day. */
export interface JournalLine {
  /** ISO, so it sorts without being parsed. */
  date: string;
  text: string;
  /** Pulled out of the entry written in this session rather than seeded. */
  fresh?: boolean;
}

/**
 * A theme the journal keeps coming back to. `mentions` is every entry it
 * appears in and sets the size of its bubble; `lines` are the few the theme
 * page quotes.
 */
export interface JournalTheme {
  id: ThemeId;
  name: string;
  /** Something they are struggling with, or something that is going well. */
  tone: 'hard' | 'good';
  /** Which way it has moved over the last few months. */
  dir: 'up' | 'down' | 'flat';
  mentions: number;
  /** One to three lines: what this theme is across everything they wrote. */
  summary: string;
  lines: JournalLine[];
}

/** A line the model pulled out of this session's entry. */
export interface ThemeExtract {
  id: ThemeId;
  line: JournalLine;
}

export interface Trend {
  name: string;
  /** One count per week of the month. */
  w: number[];
  up: boolean;
}

export interface Wrapped {
  /** 'Q3 2026' */
  quarter: string;
  topTheme: string;
  /** How often the top theme showed up, e.g. '38 nights'. */
  topThemeCount: string;
  entries: string;
  words: string;
  steps: string;
  rising: string;
  risingBy: string;
  grad: string;
  /** The quarter still being written. */
  open?: boolean;
}
export type AiStatus = 'idle' | 'writing' | 'ready' | 'error';

export interface AiState {
  status: AiStatus;
  letter: LetterContent | null;
  /** Short, human-readable reason the live letter did not arrive. */
  error: string | null;
  /** Round-trip time of the last successful letter, in ms. */
  ms: number | null;
  model: string | null;
  /** null until the first health check resolves. */
  available: boolean | null;
}

export interface ExtractState {
  status: AiStatus;
  error: string | null;
  found: ThemeExtract[];
}

export interface BeyondState {
  screen: ScreenId;
  voice: VoiceId;
  time: LetterTime;
  entry: string;
  mode: WriteMode;
  step: StepChoice | null;
  fixOpen: boolean;
  fixed: boolean;
  fixText: string;
  /** The correction kept from a previous letter, fed to the next one. */
  correction: string;
  mems: Memory[];
  paused: boolean;
  sheet: boolean;
  delAsk: boolean;
  deleted: boolean;
  /** Entry timer, in seconds. */
  secs: number;
  /** The theme page's subject. */
  openTheme: ThemeId | null;
  /** Themes Beyond has been told to stop surfacing. */
  popped: ThemeId[];
  /** Long-pressing a bubble only pops it while this is on. */
  popMode: boolean;
  /** Lines the model pulled out of this session's entry. */
  extract: ExtractState;
  source: LetterSource;
  ai: AiState;
}

/** A screen, plus the presenter notes that sit beside it. */
export interface ScreenMeta {
  id: ScreenId;
  title: string;
  /** Status-bar time, part of the night-to-morning story. */
  time: string;
  theme: 'dk' | 'lt' | 'nt';
  tab?: TabId;
  /** Off the main flow: shown instead of another screen. */
  branch?: boolean;
  short: string;
  lead: string;
  notes: string[];
  demo?: 'write' | 'voice';
}
