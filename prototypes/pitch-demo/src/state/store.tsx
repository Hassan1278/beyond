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
  VoiceId,
  WriteMode,
} from '../types';
import { MEMORIES, SAMPLE_ENTRY } from '../data/content';
import { needsSafetyCheck } from '../lib/safety';
import { checkAvailable, LetterUnavailable, requestLetter } from '../lib/ai';
import { morning, tonight } from '../lib/date';
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
      return { ...s, screen: a.screen, sheet: false, delAsk: false };
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
> & { letter: LetterContent | null };

function hydrate(): BeyondState {
  const base = freshState();
  const saved = store.load<Persisted>();
  if (!saved) return base;
  // Also clear sensitive fields left by older demo versions after deletion.
  if (saved.deleted) return deletedState(base.ai.available);
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
    ai: { ...base.ai, letter: saved.letter ?? null, status: saved.letter ? 'ready' : 'idle' },
  };
}

const persist = (s: BeyondState): void => {
  if (s.deleted) {
    store.clear();
    store.save({ deleted: true });
    return;
  }
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
    letter: s.ai.letter,
  } satisfies Persisted);
};

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
    if (a.type === 'del/confirm') store.clear();
    current.current = reducer(current.current, a);
    reduce(a);
  }, []);

  useEffect(() => persist(state), [state]);
  useEffect(
    () => () => {
      generation.current++;
      inflight.current?.abort();
    },
    [],
  );

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
    const state = current.current;
    if (state.deleted || state.source !== 'ai' || state.entry.trim().length < 10) return;
    if (needsSafetyCheck(state.entry) && !['sealed', 'letter'].includes(state.screen)) return;
    if (inflight.current) return;
    const controller = new AbortController();
    const version = ++generation.current;
    inflight.current = controller;
    dispatch({ type: 'ai/start' });
    try {
      const res = await requestLetter(
        {
          entry: state.entry,
          voice: state.voice,
          memories: state.paused ? [] : state.mems,
          correction: state.paused ? '' : state.correction,
          today: tonight(),
          tomorrow: morning(),
          time: state.time,
        },
        controller.signal,
      );
      if (version === generation.current)
        dispatch({ type: 'ai/ready', letter: res.letter, ms: res.ms, model: res.model });
    } catch (err) {
      if (version === generation.current)
        dispatch({
          type: 'ai/error',
          error:
            err instanceof LetterUnavailable
              ? err.message
              : 'The live letter could not be written, so this one is scripted.',
        });
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, [dispatch]);

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
    [state, generate, dispatch],
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
