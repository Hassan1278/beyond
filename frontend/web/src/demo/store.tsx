/**
 * The fictional demo on the marketing site (Try one night, Patterns). It never
 * talks to the backend and never stores what a visitor types.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  BeyondState,
  LetterContent,
  LetterSource,
  LetterTime,
  ScreenId,
  StepChoice,
  ThemeExtract,
  ThemeId,
  VoiceId,
  WriteMode,
} from './types';
import { MEMORIES, SAMPLE_ENTRY, SCRIPTED_LETTERS } from './content';
import { needsSafetyCheck } from './crisis';

export const freshState = (): BeyondState => ({
  screen: 'welcome',
  voice: 'friend',
  time: '07:30',
  entry: SAMPLE_ENTRY,
  mode: 'text',
  step: null,
  fixOpen: false,
  fixed: false,
  fixText: '',
  correction: '',
  mems: MEMORIES.map((m) => ({ ...m })),
  paused: false,
  sheet: false,
  delAsk: false,
  deleted: false,
  secs: 372,
  openTheme: null,
  popped: [],
  popMode: false,
  extract: { status: 'idle', error: null, found: [] },
  source: 'scripted',
  ai: { status: 'idle', letter: null, error: null, ms: null, model: null, available: false },
});

export type Action =
  | { type: 'go'; screen: ScreenId }
  | { type: 'voice'; voice: VoiceId }
  | { type: 'time'; time: LetterTime }
  | { type: 'mode'; mode: WriteMode }
  | { type: 'entry'; entry: string }
  | { type: 'tick' }
  | { type: 'seal' }
  | { type: 'step'; step: StepChoice }
  | { type: 'letter/reset' }
  | { type: 'fix/open' }
  | { type: 'fix/text'; text: string }
  | { type: 'fix/cancel' }
  | { type: 'fix/send' }
  | { type: 'mem/forget'; index: number }
  | { type: 'mem/pause' }
  | { type: 'sheet'; open: boolean }
  | { type: 'del/ask' }
  | { type: 'del/cancel' }
  | { type: 'del/confirm' }
  | { type: 'theme/open'; id: ThemeId }
  | { type: 'theme/pop'; id: ThemeId }
  | { type: 'theme/restore'; id: ThemeId }
  | { type: 'pop/mode' }
  | { type: 'ex/start' }
  | { type: 'ex/ready'; found: ThemeExtract[] }
  | { type: 'ex/error'; error: string }
  | { type: 'source'; source: LetterSource }
  | { type: 'ai/available'; ok: boolean; model: string | null }
  | { type: 'ai/start' }
  | { type: 'ai/ready'; letter: LetterContent; ms: number; model: string }
  | { type: 'ai/error'; error: string }
  | { type: 'ai/clear' }
  | { type: 'reset' };

function clearLetter(s: BeyondState): BeyondState {
  return {
    ...s,
    step: null,
    fixOpen: false,
    fixed: false,
    fixText: '',
    extract: { status: 'idle', error: null, found: [] },
    ai: { ...s.ai, status: 'idle', letter: null, error: null, ms: null },
  };
}

function deletedState(available: boolean | null): BeyondState {
  return {
    ...freshState(),
    screen: 'memory',
    entry: '',
    mems: [],
    deleted: true,
    secs: 0,
    ai: { ...freshState().ai, available },
  };
}

function reducer(s: BeyondState, a: Action): BeyondState {
  switch (a.type) {
    case 'go':
      return { ...s, screen: a.screen, sheet: false, delAsk: false, popMode: false };
    case 'voice':
      // A different voice means a different letter; drop the one we have.
      return { ...clearLetter(s), voice: a.voice };
    case 'time':
      return { ...clearLetter(s), time: a.time };
    case 'mode':
      return { ...s, mode: a.mode };
    case 'entry':
      return { ...clearLetter(s), entry: a.entry, deleted: false };
    case 'tick':
      return { ...s, secs: s.secs + 1 };
    case 'seal':
      // A new night means a new letter: drop whatever the last one produced,
      // or re-sealing an edited entry would show the previous letter again.
      return {
        ...clearLetter(s),
        screen: needsSafetyCheck(s.entry) ? 'safety' : 'sealed',
        sheet: false,
      };
    case 'step':
      return { ...s, step: a.step };
    case 'letter/reset':
      return { ...s, step: null, fixOpen: false, fixed: false, fixText: '' };
    case 'fix/open':
      return { ...s, fixOpen: true };
    case 'fix/text':
      return { ...s, fixText: a.text };
    case 'fix/cancel':
      return { ...s, fixOpen: false, fixText: '' };
    case 'fix/send':
      return {
        ...s,
        fixOpen: false,
        fixed: true,
        correction: s.fixText.trim() || s.correction,
        fixText: '',
        extract:
          s.extract.status === 'writing' ? { status: 'idle', error: null, found: [] } : s.extract,
        ai:
          s.ai.status === 'writing' ? { ...s.ai, status: 'idle', letter: null, error: null } : s.ai,
      };
    case 'mem/forget':
      return { ...clearLetter(s), mems: s.mems.filter((_, i) => i !== a.index) };
    case 'mem/pause':
      return { ...clearLetter(s), paused: !s.paused };
    case 'sheet':
      return { ...s, sheet: a.open };
    case 'del/ask':
      return { ...s, delAsk: true };
    case 'del/cancel':
      return { ...s, delAsk: false };
    case 'del/confirm':
      return deletedState(s.ai.available);
    case 'theme/open':
      // Opening a theme is reading, not editing, so pop mode ends here.
      return { ...s, screen: 'theme', openTheme: a.id, popMode: false, sheet: false };
    case 'theme/pop':
      return s.popped.includes(a.id) ? s : { ...clearLetter(s), popped: [...s.popped, a.id] };
    case 'theme/restore':
      return { ...clearLetter(s), popped: s.popped.filter((id) => id !== a.id) };
    case 'pop/mode':
      return { ...s, popMode: !s.popMode };
    case 'ex/start':
      return { ...s, extract: { ...s.extract, status: 'writing', error: null } };
    case 'ex/ready':
      return { ...s, extract: { status: 'ready', error: null, found: a.found } };
    case 'ex/error':
      return { ...s, extract: { status: 'error', error: a.error, found: [] } };
    case 'source':
      return { ...clearLetter(s), source: a.source };
    case 'ai/available':
      return { ...s, ai: { ...s.ai, available: a.ok, model: a.model ?? s.ai.model } };
    case 'ai/start':
      return { ...s, ai: { ...s.ai, status: 'writing', error: null } };
    case 'ai/ready':
      return {
        ...s,
        ai: { ...s.ai, status: 'ready', letter: a.letter, ms: a.ms, model: a.model, error: null },
      };
    case 'ai/error':
      return { ...s, ai: { ...s.ai, status: 'error', letter: null, error: a.error } };
    case 'ai/clear':
      return clearLetter(s);
    case 'reset':
      return { ...freshState(), ai: { ...freshState().ai, available: s.ai.available } };
    default:
      return s;
  }
}

/* --------------------------------------------------------------- memory only */
/**
 * The site demo keeps everything in memory: anything a visitor types into it is
 * gone on reload. It also clears what older versions of the demo saved.
 */
function hydrate(): BeyondState {
  try {
    localStorage.removeItem('beyond.demo.v1');
  } catch {
    /* private window or blocked storage: nothing to clear */
  }
  return freshState();
}

/* ------------------------------------------------------------------ context */

export interface DemoApi {
  state: BeyondState;
  dispatch: (a: Action) => void;
  go: (screen: ScreenId) => void;
  /** Ask for a live letter. Resolves either way; errors land in state. */
  generate: () => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<DemoApi | null>(null);

export function DemoProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, reduce] = useReducer(reducer, undefined, hydrate);
  const current = useRef(state);
  const inflight = useRef<AbortController | null>(null);
  const generation = useRef(0);

  // Invalidate synchronously: a late response must not revive deleted or changed text,
  // even when its fetch implementation ignores AbortSignal.
  const dispatch = useCallback((a: Action): void => {
    if (
      [
        'voice',
        'time',
        'entry',
        'seal',
        'fix/send',
        'mem/forget',
        'mem/pause',
        'theme/pop',
        'theme/restore',
        'source',
        'ai/clear',
        'del/confirm',
        'reset',
      ].includes(a.type)
    ) {
      generation.current++;
      inflight.current?.abort();
      inflight.current = null;
    }
    current.current = reducer(current.current, a);
    reduce(a);
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      inflight.current?.abort();
    },
    [],
  );

  // The entry timer runs only while the entry screen is open.
  useEffect(() => {
    if (state.screen !== 'write') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [state.screen]);

  const generate = useCallback(async () => {
    const state = current.current;
    if (state.deleted) return;
    dispatch({
      type: 'ai/ready',
      letter: SCRIPTED_LETTERS[state.voice],
      ms: 0,
      model: 'fictional demo',
    });
  }, [dispatch]);

  const value = useMemo<DemoApi>(
    () => ({
      state,
      dispatch,
      go: (screen) => dispatch({ type: 'go', screen }),
      generate,
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state, generate, dispatch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}

const noop = (): void => undefined;
const noopAsync = async (): Promise<void> => undefined;

/**
 * Actions for a screen. In the gallery (`live: false`) screens are pictures of
 * themselves, so every action is dropped rather than quietly editing the real
 * state behind the live phone.
 */
export function useActions(live: boolean): Omit<DemoApi, 'state'> {
  const api = useDemo();
  return live ? api : { dispatch: noop, go: noop, generate: noopAsync, reset: noop };
}
