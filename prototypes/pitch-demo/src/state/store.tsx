/**
 * One store for both shells. The presenter's step list and the app's own
 * buttons both move the same `screen`, so the phone shows the same thing
 * whichever drives it.
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
} from '../types';
import { MEMORIES, SAMPLE_ENTRY } from '../data/content';
import { themeById } from '../data/themes';
import { needsSafetyCheck } from '../lib/safety';
import { checkAvailable, extractThemes, LetterUnavailable, requestLetter } from '../lib/ai';
import { morning, todayIso, tonight } from '../lib/date';
import * as store from '../lib/storage';

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
  ai: { status: 'idle', letter: null, error: null, ms: null, model: null, available: null },
});

type Action =
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

function reducer(s: BeyondState, a: Action): BeyondState {
  switch (a.type) {
    case 'go':
      return { ...s, screen: a.screen, sheet: false, delAsk: false, popMode: false };
    case 'voice':
      // A different voice means a different letter; drop the one we have.
      return {
        ...s,
        voice: a.voice,
        step: null,
        fixOpen: false,
        fixed: false,
        ai: { ...s.ai, status: 'idle', letter: null, error: null },
      };
    case 'time':
      return { ...s, time: a.time };
    case 'mode':
      return { ...s, mode: a.mode };
    case 'entry':
      return { ...s, entry: a.entry };
    case 'tick':
      return { ...s, secs: s.secs + 1 };
    case 'seal':
      // A new night means a new letter: drop whatever the last one produced,
      // or re-sealing an edited entry would show the previous letter again.
      return {
        ...s,
        screen: needsSafetyCheck(s.entry) ? 'safety' : 'sealed',
        sheet: false,
        step: null,
        fixed: false,
        fixOpen: false,
        ai: { ...s.ai, status: 'idle', letter: null, error: null },
        extract: { status: 'idle', error: null, found: [] },
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
      };
    case 'mem/forget':
      return { ...s, mems: s.mems.filter((_, i) => i !== a.index) };
    case 'mem/pause':
      return { ...s, paused: !s.paused };
    case 'sheet':
      return { ...s, sheet: a.open };
    case 'del/ask':
      return { ...s, delAsk: true };
    case 'del/cancel':
      return { ...s, delAsk: false };
    case 'del/confirm':
      return { ...s, delAsk: false, mems: [], deleted: true };
    case 'theme/open':
      // Opening a theme is reading, not editing, so pop mode ends here.
      return { ...s, screen: 'theme', openTheme: a.id, popMode: false, sheet: false };
    case 'theme/pop':
      return s.popped.includes(a.id) ? s : { ...s, popped: [...s.popped, a.id] };
    case 'theme/restore':
      return { ...s, popped: s.popped.filter((id) => id !== a.id) };
    case 'pop/mode':
      return { ...s, popMode: !s.popMode };
    case 'ex/start':
      return { ...s, extract: { ...s.extract, status: 'writing', error: null } };
    case 'ex/ready':
      return { ...s, extract: { status: 'ready', error: null, found: a.found } };
    case 'ex/error':
      return { ...s, extract: { status: 'error', error: a.error, found: [] } };
    case 'source':
      return { ...s, source: a.source, ai: { ...s.ai, status: 'idle', error: null } };
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
      return { ...s, ai: { ...s.ai, status: 'idle', letter: null, error: null } };
    case 'reset':
      return { ...freshState(), ai: { ...freshState().ai, available: s.ai.available } };
    default:
      return s;
  }
}

/* --------------------------------------------------------------- persistence */

type Persisted = Pick<
  BeyondState,
  | 'screen'
  | 'voice'
  | 'time'
  | 'entry'
  | 'source'
  | 'mems'
  | 'paused'
  | 'deleted'
  | 'step'
  | 'fixed'
  | 'correction'
  | 'popped'
  | 'openTheme'
> & { letter: LetterContent | null; found: ThemeExtract[] };

function hydrate(): BeyondState {
  const base = freshState();
  const saved = store.load<Persisted>();
  if (!saved) return base;
  return {
    ...base,
    screen: saved.screen ?? base.screen,
    voice: saved.voice ?? base.voice,
    time: saved.time ?? base.time,
    entry: typeof saved.entry === 'string' ? saved.entry : base.entry,
    source: saved.source ?? base.source,
    mems: Array.isArray(saved.mems) ? saved.mems : base.mems,
    paused: Boolean(saved.paused),
    deleted: Boolean(saved.deleted),
    step: saved.step ?? null,
    fixed: Boolean(saved.fixed),
    correction: typeof saved.correction === 'string' ? saved.correction : '',
    // Unknown ids in storage would render an empty map, so only keep real ones.
    popped: Array.isArray(saved.popped) ? saved.popped.filter((id) => themeById(id).id === id) : [],
    openTheme: saved.openTheme ?? null,
    extract: {
      status: saved.found?.length ? 'ready' : 'idle',
      error: null,
      found: Array.isArray(saved.found) ? saved.found : [],
    },
    ai: { ...base.ai, letter: saved.letter ?? null, status: saved.letter ? 'ready' : 'idle' },
  };
}

const persist = (s: BeyondState): void =>
  store.save({
    screen: s.screen,
    voice: s.voice,
    time: s.time,
    entry: s.entry,
    source: s.source,
    mems: s.mems,
    paused: s.paused,
    deleted: s.deleted,
    step: s.step,
    fixed: s.fixed,
    correction: s.correction,
    popped: s.popped,
    openTheme: s.openTheme,
    letter: s.ai.letter,
    found: s.extract.found,
  } satisfies Persisted);

/* ------------------------------------------------------------------ context */

interface Api {
  state: BeyondState;
  dispatch: (a: Action) => void;
  go: (screen: ScreenId) => void;
  /** Ask for a live letter. Resolves either way; errors land in state. */
  generate: () => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<Api | null>(null);

export function BeyondProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);
  const inflight = useRef(false);

  useEffect(() => persist(state), [state]);

  // Does this host have a letter writer behind it?
  useEffect(() => {
    let live = true;
    void checkAvailable().then(({ ok, model }) => {
      if (live) dispatch({ type: 'ai/available', ok, model });
    });
    return () => {
      live = false;
    };
  }, []);

  // The entry timer runs only while the entry screen is open.
  useEffect(() => {
    if (state.screen !== 'write') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [state.screen]);

  const generate = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    dispatch({ type: 'ai/start' });
    dispatch({ type: 'ex/start' });

    // The theme lines come from the same entry, so they are pulled at the same
    // time. They are a side dish: a failure here never costs anyone a letter.
    void extractThemes({ entry: state.entry, today: todayIso() })
      .then((found) => dispatch({ type: 'ex/ready', found }))
      .catch((err: unknown) =>
        dispatch({
          type: 'ex/error',
          error:
            err instanceof LetterUnavailable
              ? err.message
              : 'Themes could not be read from this entry.',
        }),
      );

    try {
      const res = await requestLetter({
        entry: state.entry,
        voice: state.voice,
        memories: state.paused ? [] : state.mems,
        correction: state.correction,
        today: tonight(),
        tomorrow: morning(),
        time: state.time,
        avoid: state.popped.map((id) => themeById(id).name),
      });
      dispatch({ type: 'ai/ready', letter: res.letter, ms: res.ms, model: res.model });
    } catch (err) {
      dispatch({
        type: 'ai/error',
        error:
          err instanceof LetterUnavailable
            ? err.message
            : 'The live letter could not be written, so this one is scripted.',
      });
    } finally {
      inflight.current = false;
    }
  }, [
    state.entry,
    state.voice,
    state.paused,
    state.mems,
    state.correction,
    state.time,
    state.popped,
  ]);

  const value = useMemo<Api>(
    () => ({
      state,
      dispatch,
      go: (screen) => dispatch({ type: 'go', screen }),
      generate,
      reset: () => {
        store.clear();
        dispatch({ type: 'reset' });
      },
    }),
    [state, generate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBeyond(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBeyond must be used inside <BeyondProvider>');
  return ctx;
}

const noop = (): void => undefined;
const noopAsync = async (): Promise<void> => undefined;

/**
 * Actions for a screen. In the gallery (`live: false`) screens are pictures of
 * themselves, so every action is dropped rather than quietly editing the real
 * state behind the live phone.
 */
export function useActions(live: boolean): Omit<Api, 'state'> {
  const api = useBeyond();
  return live ? api : { dispatch: noop, go: noop, generate: noopAsync, reset: noop };
}
