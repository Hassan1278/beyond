import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiClientError, type Entry, type PatchSettings } from '@beyond/shared';
import type { BeyondState, ScreenId } from '../types';
import type { AppRuntime, Identity } from '../runtime';
import { signupRequested } from '../signup-intent';
import { needsSafetyCheck } from '../lib/safety';
import { DemoProvider, freshState, useDemo, type Action } from './demo';
export { freshState } from './demo';

export type AppAction =
  | Action
  | { type: 'auth/open' }
  | { type: 'auth/mode'; mode: 'signin' | 'signup' | 'recovery' }
  | { type: 'notice'; text: string | null };
interface Api {
  state: BeyondState;
  dispatch: (action: AppAction) => void;
  go: (screen: ScreenId) => void;
  generate: () => Promise<void>;
  requestReflection: () => Promise<void>;
  decideReflection: (
    id: string,
    actionId: string,
    decision: 'accepted' | 'rejected',
  ) => Promise<void>;
  correctReflection: (id: string, text: string) => Promise<void>;
  cancelReflection: (entryId: string) => Promise<void>;
  settingsChange: (patch: Omit<PatchSettings, 'expected_revision'>) => Promise<void>;
  reset: () => void;
  save: (acknowledged?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  more: () => Promise<void>;
  edit: (entry: Entry | null) => void;
  remove: (entry: Entry) => Promise<void>;
  auth: (
    mode: 'signin' | 'signup' | 'reset' | 'recovery',
    email: string,
    password: string,
  ) => Promise<void>;
  google: () => Promise<void>;
  signOut: () => Promise<void>;
  exportData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  remember: (text: string, id?: string) => Promise<boolean>;
  addTodo: (title: string) => Promise<boolean>;
  toggleTodo: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  moreProducts: (kind: 'memories' | 'todos' | 'reflections') => Promise<void>;
}
const Ctx = createContext<Api | null>(null);
const nothing = async (): Promise<void> => undefined;

function blank(
  status: 'setup' | 'signed_out' | 'loading' | 'ready' = 'signed_out',
  identity: Identity | null = null,
): BeyondState {
  return {
    ...freshState(),
    entry: '',
    mems: [],
    secs: 0,
    source: 'scripted',
    product: {
      status,
      identity,
      authOpen: signupRequested(),
      authMode: identity?.recovery ? 'recovery' : signupRequested() ? 'signup' : 'signin',
      busy: false,
      notice: null,
      entries: [],
      nextCursor: null,
      settings: null,
      memories: [],
      memoryCursor: null,
      todoCursor: null,
      todos: [],
      reflections: [],
      reflectionCursor: null,
      account: null,
      editing: null,
    },
  };
}
function safeMessage(error: unknown): string {
  if (!(error instanceof ApiClientError))
    return 'The request could not be completed. Please try again.';
  return (
    (
      {
        unauthorized: 'Please sign in again.',
        forbidden: 'Please sign in again before this action.',
        conflict: 'This item changed elsewhere. Reload it before saving your edit.',
        rate_limited: 'Please wait a minute before trying again.',
        not_ready: 'This feature is not configured yet. Please try again later.',
        cancelled: 'The request was cancelled.',
        bad_request: 'Check the text and its length before trying again.',
      } as Record<string, string>
    )[error.code] ?? 'The connection failed. Your unsaved entry is still here; try again.'
  );
}

function DemoBridge({ children }: { children: ReactNode }): ReactNode {
  const demo = useDemo();
  const value: Api = {
    ...demo,
    dispatch: (action) => {
      if (!action.type.startsWith('auth/') && action.type !== 'notice')
        demo.dispatch(action as Action);
    },
    save: async (ack) => (ack ? demo.go('sealed') : demo.dispatch({ type: 'seal' })),
    refresh: nothing,
    more: nothing,
    edit: () => demo.go('write'),
    remove: nothing,
    auth: nothing,
    google: nothing,
    signOut: nothing,
    exportData: nothing,
    deleteAccount: nothing,
    remember: async () => false,
    addTodo: async () => false,
    toggleTodo: nothing,
    removeTodo: nothing,
    moreProducts: nothing,
    requestReflection: nothing,
    decideReflection: nothing,
    correctReflection: nothing,
    cancelReflection: nothing,
    settingsChange: nothing,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function ProductProvider({
  children,
  runtime,
}: {
  children: ReactNode;
  runtime?: AppRuntime;
}): ReactNode {
  const [state, setState] = useState(() => blank(runtime ? 'loading' : 'setup'));
  const current = useRef(state);
  const epoch = useRef(0);
  const loadSequence = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const pending = useRef(false);
  const preferences = useRef<Promise<void>>(Promise.resolve());
  const retryKeys = useRef(new Map<string, string>());
  const draft = useRef({
    key: crypto.randomUUID(),
    initial: null as string | null,
    saved: null as Entry | null,
  });
  const update = useCallback((change: (s: BeyondState) => BeyondState) => {
    current.current = change(current.current);
    setState(current.current);
  }, []);
  const notice = useCallback(
    (text: string | null) => update((s) => ({ ...s, product: { ...s.product!, notice: text } })),
    [update],
  );
  const invalidate = useCallback(() => {
    epoch.current++;
    preferences.current = Promise.resolve();
    retryKeys.current.clear();
    requests.current.forEach((controller) => controller.abort());
    requests.current.clear();
    pending.current = false;
  }, []);
  const run = useCallback(
    async (action: (signal: AbortSignal, version: number) => Promise<void>) => {
      const controller = new AbortController();
      requests.current.add(controller);
      const version = epoch.current;
      try {
        await action(controller.signal, version);
        return version === epoch.current;
      } catch (error) {
        if (version === epoch.current) notice(safeMessage(error));
        return false;
      } finally {
        requests.current.delete(controller);
      }
    },
    [notice],
  );
  const load = useCallback(
    async (identity: Identity, version: number) => {
      if (!runtime) return;
      const ticket = ++loadSequence.current;
      await run(async (signal) => {
        const api = runtime.apiForUser(identity.id);
        const [settings, entries, memories, todos, account, reflections] = await Promise.all([
          api.settings.get(signal),
          api.entries.list({ limit: '20' }, signal),
          api.memories.list({ limit: '100' }, signal),
          api.todos.list({ limit: '100' }, signal),
          api.account.get(signal),
          api.reflections.list({ limit: '100' }, signal),
        ]);
        if (
          version !== epoch.current ||
          ticket !== loadSequence.current ||
          current.current.product?.identity?.id !== identity.id
        )
          return;
        update((s) => ({
          ...s,
          voice: settings.voice,
          time: settings.morning_time,
          paused: settings.memory_paused,
          mems: memories.items.map((m) => ({
            t: m.text,
            s: m.source_entry_id ? 'Approved from your entry' : 'You approved this memory',
          })),
          screen: identity.recovery ? 'welcome' : s.screen === 'welcome' ? 'home' : s.screen,
          product: {
            ...s.product!,
            status: 'ready',
            settings,
            entries: entries.entries,
            nextCursor: entries.next_cursor,
            memories: memories.items,
            memoryCursor: memories.next_cursor,
            todoCursor: todos.next_cursor,
            todos: todos.items,
            reflections: reflections.items,
            reflectionCursor: reflections.next_cursor,
            account,
            notice: null,
            authOpen: !!identity.recovery,
          },
        }));
      });
      if (version === epoch.current && current.current.product?.status === 'loading')
        update((s) => ({ ...s, product: { ...s.product!, status: 'error' } }));
    },
    [runtime, run, update],
  );

  useEffect(() => {
    if (!runtime) return;
    let active = true;
    const accept = (identity: Identity | null) => {
      if (!active) return;
      const previous = current.current.product?.identity;
      if (
        previous?.id === identity?.id &&
        identity &&
        Boolean(previous?.recovery) === Boolean(identity.recovery)
      )
        return;
      invalidate();
      draft.current = { key: crypto.randomUUID(), initial: null, saved: null };
      update(() => blank(identity ? 'loading' : 'signed_out', identity));
      if (identity) void load(identity, epoch.current);
    };
    const unsubscribe = runtime.auth.subscribe(accept);
    const boot = epoch.current;
    void runtime.auth
      .session()
      .then((identity) => {
        if (boot === epoch.current) accept(identity);
      })
      .catch(() => {
        if (active) {
          update(() => blank('signed_out'));
          notice('Please sign in again.');
        }
      });
    return () => {
      active = false;
      unsubscribe();
      invalidate();
    };
  }, [runtime, invalidate, load, update, notice]);

  const refresh = useCallback(async () => {
    const identity = current.current.product?.identity;
    if (identity) await load(identity, epoch.current);
  }, [load]);
  const settingsChange = useCallback(
    (patch: Omit<PatchSettings, 'expected_revision'>): Promise<void> => {
      const version = epoch.current;
      const queued = preferences.current.then(async () => {
        const before = current.current.product;
        if (!runtime || version !== epoch.current || !before?.settings || !before.identity) return;
        await run(async (signal) => {
          const settings = await runtime
            .apiForUser(before.identity!.id)
            .settings.update({ ...patch, expected_revision: before.settings!.revision }, signal);
          if (version === epoch.current)
            update((s) => ({
              ...s,
              voice: settings.voice,
              time: settings.morning_time,
              paused: settings.memory_paused,
              product: { ...s.product!, settings, notice: null },
            }));
        });
      });
      preferences.current = queued.catch(() => undefined);
      return queued;
    },
    [runtime, run, update],
  );
  const save = useCallback(
    async (acknowledged = false) => {
      const s = current.current;
      if (!runtime || pending.current || s.product?.status !== 'ready') return;
      if (needsSafetyCheck(s.entry) && !acknowledged) {
        update((x) => ({ ...x, screen: 'safety' }));
        return;
      }
      if (!s.entry.trim()) {
        notice('Write something before saving.');
        return;
      }
      const savedVersion = epoch.current;
      pending.current = true;
      update((x) => ({ ...x, product: { ...x.product!, busy: true, notice: null } }));
      await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        const editing = s.product!.editing ?? draft.current.saved;
        let entry: Entry;
        if (editing)
          entry =
            editing.text === s.entry
              ? editing
              : await api.entries.update(
                  editing.id,
                  { text: s.entry, expected_revision: editing.revision },
                  signal,
                );
        else {
          // Preserve the original retry payload/key even if the response was lost.
          draft.current.initial ??= s.entry;
          entry = await api.entries.create(
            {
              text: draft.current.initial,
              idempotency_key: draft.current.key,
              reflection_opt_in: false,
            },
            signal,
          );
          if (entry.text !== s.entry)
            entry = await api.entries.update(
              entry.id,
              { text: s.entry, expected_revision: entry.revision },
              signal,
            );
        }
        if (version !== epoch.current) return;
        draft.current.saved = entry;
        update((x) => ({
          ...x,
          screen:
            x.entry === s.entry && (x.screen === s.screen || x.screen === 'safety')
              ? 'sealed'
              : x.screen,
          entry: x.entry === s.entry ? entry.text : x.entry,
          product: {
            ...x.product!,
            editing: entry,
            entries: [entry, ...x.product!.entries.filter((e) => e.id !== entry.id)],
            notice: null,
          },
        }));
      });
      if (savedVersion === epoch.current) {
        pending.current = false;
        update((x) => ({ ...x, product: { ...x.product!, busy: false } }));
      }
    },
    [runtime, run, update, notice],
  );
  const clear = useCallback(async () => {
    if (!runtime || pending.current) return;
    invalidate();
    const clearedVersion = epoch.current;
    pending.current = true;
    await run(async (signal, version) => {
      const api = runtime.apiForUser(current.current.product!.identity!.id);
      await api.account.clearData(signal);
      if (version !== epoch.current) return;
      const identity = current.current.product!.identity;
      draft.current = { key: crypto.randomUUID(), initial: null, saved: null };
      update(() => ({ ...blank('ready', identity), screen: 'memory', deleted: true }));
      if (identity) await load(identity, version);
    });
    if (clearedVersion === epoch.current) pending.current = false;
  }, [runtime, invalidate, run, update, load]);
  const dispatch = useCallback(
    (action: AppAction) => {
      if (action.type === 'seal') {
        void save();
        return;
      }
      if (action.type === 'voice') {
        void settingsChange({ voice: action.voice });
        return;
      }
      if (action.type === 'time') {
        void settingsChange({ morning_time: action.time });
        return;
      }
      if (action.type === 'mem/pause') {
        void settingsChange({ memory_paused: !current.current.paused });
        return;
      }
      if (action.type === 'mem/forget' && runtime) {
        const memory = current.current.product!.memories[action.index];
        if (memory)
          void run(async (signal, version) => {
            const api = runtime.apiForUser(current.current.product!.identity!.id);
            await api.memories.delete(memory.id, signal);
            if (version === epoch.current) await refresh();
          });
        return;
      }
      if (action.type === 'del/confirm') {
        void clear();
        return;
      }
      update((s) => {
        if (action.type === 'go')
          return { ...s, screen: action.screen, sheet: false, delAsk: false };
        if (action.type === 'entry') return { ...s, entry: action.entry, deleted: false };
        if (action.type === 'mode') return { ...s, mode: action.mode };
        if (action.type === 'sheet') return { ...s, sheet: action.open };
        if (action.type === 'del/ask' || action.type === 'del/cancel')
          return { ...s, delAsk: action.type === 'del/ask' };
        if (action.type === 'auth/open')
          return { ...s, product: { ...s.product!, authOpen: true } };
        if (action.type === 'auth/mode')
          return { ...s, product: { ...s.product!, authMode: action.mode, notice: null } };
        if (action.type === 'notice')
          return { ...s, product: { ...s.product!, notice: action.text } };
        return s;
      });
    },
    [save, settingsChange, runtime, run, refresh, clear, update],
  );
  const edit = useCallback(
    (entry: Entry | null) => {
      draft.current = { key: crypto.randomUUID(), initial: null, saved: entry };
      update((s) => ({
        ...s,
        screen: 'write',
        entry: entry?.text ?? '',
        secs: 0,
        product: { ...s.product!, editing: entry, notice: null },
      }));
    },
    [update],
  );
  const remove = useCallback(
    async (entry: Entry) => {
      if (!runtime) return;
      await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        await api.entries.delete(entry.id, signal);
        if (version === epoch.current) {
          if (current.current.product?.editing?.id === entry.id) {
            draft.current = { key: crypto.randomUUID(), initial: null, saved: null };
            update((s) => ({ ...s, entry: '', product: { ...s.product!, editing: null } }));
          }
          await refresh();
        }
      });
    },
    [runtime, run, refresh, update],
  );
  const more = useCallback(async () => {
    const cursor = current.current.product?.nextCursor;
    if (!runtime || !cursor) return;
    await run(async (signal, version) => {
      const api = runtime.apiForUser(current.current.product!.identity!.id);
      const page = await api.entries.list({ limit: '20', cursor }, signal);
      if (version === epoch.current)
        update((s) => ({
          ...s,
          product: {
            ...s.product!,
            nextCursor: page.next_cursor,
            entries: [
              ...s.product!.entries,
              ...page.entries.filter((e) => !s.product!.entries.some((old) => old.id === e.id)),
            ],
          },
        }));
    });
  }, [runtime, run, update]);
  const auth = useCallback(
    async (mode: 'signin' | 'signup' | 'reset' | 'recovery', email: string, password: string) => {
      if (!runtime || pending.current) return;
      pending.current = true;
      notice(null);
      try {
        if (mode === 'signin') {
          await runtime.auth.signIn(email, password);
          update((s) => ({
            ...s,
            screen: s.product?.identity ? 'home' : s.screen,
            product: { ...s.product!, authOpen: false },
          }));
        }
        if (mode === 'signup') {
          await runtime.auth.signUp(email, password);
          notice('Check your email to confirm your account.');
        }
        if (mode === 'reset') {
          await runtime.auth.resetPassword(email);
          notice('If the address matches an account, a recovery email has been sent.');
        }
        if (mode === 'recovery') {
          await runtime.auth.updatePassword(password);
          notice('Password updated.');
          update((s) => ({ ...s, screen: 'home', product: { ...s.product!, authOpen: false } }));
        }
      } catch {
        notice(
          mode === 'signin'
            ? 'Sign-in failed. Check your email and password.'
            : 'The authentication request could not be completed. Please try again.',
        );
      } finally {
        pending.current = false;
      }
    },
    [runtime, notice, update],
  );
  const google = useCallback(async () => {
    try {
      await runtime?.auth.google();
    } catch {
      notice('Google sign-in could not be started. Please try again.');
    }
  }, [runtime, notice]);
  const signOut = useCallback(async () => {
    invalidate();
    draft.current = { key: crypto.randomUUID(), initial: null, saved: null };
    update(() => blank());
    try {
      await runtime?.auth.signOut();
    } catch {
      notice('Signed out locally. Network sign-out could not be confirmed.');
    }
  }, [runtime, invalidate, update, notice]);
  const exportData = useCallback(async () => {
    if (!runtime) return;
    await run(async (signal, version) => {
      const api = runtime.apiForUser(current.current.product!.identity!.id);
      const sections: Record<string, unknown> = {};
      let count = 0,
        bytes = 0;
      for (const section of ['settings', 'entries', 'memories', 'todos', 'reflections'] as const) {
        let cursor: string | undefined;
        const items: unknown[] = [];
        const seen = new Set<string>();
        do {
          const page = await api.account.exportPage(
            {
              section,
              ...(section === 'settings' ? {} : { limit: '50', ...(cursor ? { cursor } : {}) }),
            },
            signal,
          );
          bytes += new TextEncoder().encode(JSON.stringify(page)).byteLength;
          if (bytes > 32_000_000) throw new ApiClientError('bad_request', 400);
          if (page.section === 'settings') sections.settings = page.settings;
          else {
            items.push(...page.items);
            count += page.items.length;
            if (count > 10000) throw new ApiClientError('bad_request', 400);
          }
          const next = 'next_cursor' in page ? page.next_cursor : null;
          if (next && seen.has(next)) throw new ApiClientError('invalid_response', 200);
          if (next) seen.add(next);
          cursor = next ?? undefined;
        } while (cursor);
        if (section !== 'settings') sections[section] = items;
      }
      if (version !== epoch.current) return;
      await runtime.download(
        'beyond-export.json',
        JSON.stringify(
          { format_version: 1, exported_at: new Date().toISOString(), ...sections },
          null,
          2,
        ),
      );
      notice('Exported your current live data. Keep the downloaded copy private.');
    });
  }, [runtime, run, notice]);
  const deleteAccount = useCallback(async () => {
    if (!runtime) return;
    await run(async (signal, version) => {
      const api = runtime.apiForUser(current.current.product!.identity!.id);
      await api.account.delete(signal);
      if (version === epoch.current) await signOut();
    });
  }, [runtime, run, signOut]);
  const remember = useCallback(
    async (text: string, id?: string) => {
      if (!runtime || current.current.product?.status !== 'ready') return false;
      return await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        const row = current.current.product!.memories.find((m) => m.id === id);
        if (id && !row) return;
        if (row)
          await api.memories.update(
            row.id,
            { text, approved: true, expected_revision: row.revision },
            signal,
          );
        else {
          const label = 'memory:' + text;
          const key = retryKeys.current.get(label) ?? crypto.randomUUID();
          retryKeys.current.set(label, key);
          await api.memories.create(
            { text, approved: true, source_entry_id: null, idempotency_key: key },
            signal,
          );
          if (version === epoch.current) retryKeys.current.delete(label);
        }
        if (version === epoch.current) {
          await refresh();
          notice('Memory saved.');
        }
      });
    },
    [runtime, run, refresh, notice],
  );
  const addTodo = useCallback(
    async (title: string) => {
      if (!runtime || current.current.product?.status !== 'ready') return false;
      return await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        const label = 'todo:' + title;
        const key = retryKeys.current.get(label) ?? crypto.randomUUID();
        retryKeys.current.set(label, key);
        await api.todos.create({ title, idempotency_key: key }, signal);
        if (version === epoch.current) retryKeys.current.delete(label);
        if (version === epoch.current) {
          await refresh();
          notice('Step saved.');
        }
      });
    },
    [runtime, run, refresh, notice],
  );
  const toggleTodo = useCallback(
    async (id: string) => {
      const row = current.current.product?.todos.find((todo) => todo.id === id);
      if (!runtime || !row) return;
      await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        await api.todos.update(
          id,
          { completed: !row.completed, expected_revision: row.revision },
          signal,
        );
        if (version === epoch.current) await refresh();
      });
    },
    [runtime, run, refresh],
  );
  const removeTodo = useCallback(
    async (id: string) => {
      if (!runtime) return;
      await run(async (signal, version) => {
        const api = runtime.apiForUser(current.current.product!.identity!.id);
        await api.todos.delete(id, signal);
        if (version === epoch.current) await refresh();
      });
    },
    [runtime, run, refresh],
  );
  const moreProducts = useCallback(
    async (kind: 'memories' | 'todos' | 'reflections') => {
      const before = current.current.product;
      if (!runtime || !before?.identity) return;
      const cursor =
        kind === 'memories'
          ? before.memoryCursor
          : kind === 'todos'
            ? before.todoCursor
            : before.reflectionCursor;
      if (!cursor) return;
      await run(async (signal, version) => {
        const api = runtime.apiForUser(before.identity!.id);
        if (kind === 'memories') {
          const page = await api.memories.list({ limit: '100', cursor }, signal);
          if (version === epoch.current)
            update((s) => {
              const rows = [
                ...s.product!.memories,
                ...page.items.filter((m) => !s.product!.memories.some((old) => old.id === m.id)),
              ];
              return {
                ...s,
                mems: rows.map((m) => ({ t: m.text, s: 'You approved this memory' })),
                product: { ...s.product!, memories: rows, memoryCursor: page.next_cursor },
              };
            });
        } else if (kind === 'todos') {
          const page = await api.todos.list({ limit: '100', cursor }, signal);
          if (version === epoch.current)
            update((s) => ({
              ...s,
              product: {
                ...s.product!,
                todoCursor: page.next_cursor,
                todos: [
                  ...s.product!.todos,
                  ...page.items.filter((m) => !s.product!.todos.some((old) => old.id === m.id)),
                ],
              },
            }));
        } else {
          const page = await api.reflections.list({ limit: '100', cursor }, signal);
          if (version === epoch.current)
            update((s) => ({
              ...s,
              product: {
                ...s.product!,
                reflectionCursor: page.next_cursor,
                reflections: [
                  ...s.product!.reflections,
                  ...page.items.filter(
                    (r) => !s.product!.reflections.some((old) => old.id === r.id),
                  ),
                ],
              },
            }));
        }
      });
    },
    [runtime, run, update],
  );
  const requestReflection = useCallback(async () => {
    const before = current.current.product;
    const entry = before?.editing;
    if (!runtime || !entry || !before?.identity) return;
    await run(async (signal, version) => {
      const job = await runtime
        .apiForUser(before.identity!.id)
        .reflections.request(
          entry.id,
          { consent: true, expected_revision: entry.revision },
          signal,
        );
      if (version === epoch.current)
        notice(
          job.status === 'failed'
            ? 'The reflection could not be completed. Cancel it to make a fresh request.'
            : job.status === 'completed'
              ? 'Your letter is ready in Letters.'
              : 'You allowed this entry to be processed. Scheduled for ' +
                new Date(job.due_at).toLocaleString(undefined, {
                  timeZone: before.settings?.timezone,
                }) +
                '.',
        );
    });
  }, [runtime, run, notice]);
  const decideReflection = useCallback(
    async (id: string, actionId: string, decision: 'accepted' | 'rejected') => {
      const before = current.current.product;
      if (!runtime || !before?.identity) return;
      await run(async (signal, version) => {
        await runtime
          .apiForUser(before.identity!.id)
          .reflections.decide(id, { action_id: actionId, decision }, signal);
        if (version === epoch.current) await refresh();
      });
    },
    [runtime, run, refresh],
  );
  const correctReflection = useCallback(
    async (id: string, text: string) => {
      const before = current.current.product;
      const row = before?.reflections.find((r) => r.id === id);
      if (!runtime || !before?.identity || !row) return;
      await run(async (signal, version) => {
        await runtime
          .apiForUser(before.identity!.id)
          .reflections.correct(id, { text, expected_revision: row.revision }, signal);
        if (version === epoch.current) await refresh();
      });
    },
    [runtime, run, refresh],
  );
  const cancelReflection = useCallback(
    async (entryId: string) => {
      const before = current.current.product;
      if (!runtime || !before?.identity) return;
      await run(async (signal, version) => {
        await runtime.apiForUser(before.identity!.id).reflections.cancel(entryId, signal);
        if (version === epoch.current) {
          await refresh();
          notice('Reflection permission cancelled and derived content removed.');
        }
      });
    },
    [runtime, run, refresh, notice],
  );
  const value = useMemo<Api>(
    () => ({
      state,
      dispatch,
      go: (screen) => dispatch({ type: 'go', screen }),
      generate: nothing,
      reset: () => {
        void refresh();
      },
      save,
      refresh,
      more,
      edit,
      remove,
      auth,
      google,
      signOut,
      exportData,
      deleteAccount,
      remember,
      addTodo,
      toggleTodo,
      removeTodo,
      moreProducts,
      requestReflection,
      decideReflection,
      correctReflection,
      cancelReflection,
      settingsChange,
    }),
    [
      state,
      dispatch,
      save,
      refresh,
      more,
      edit,
      remove,
      auth,
      google,
      signOut,
      exportData,
      deleteAccount,
      remember,
      addTodo,
      toggleTodo,
      removeTodo,
      moreProducts,
      requestReflection,
      decideReflection,
      correctReflection,
      cancelReflection,
      settingsChange,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function BeyondProvider({
  children,
  runtime,
  demo = false,
}: {
  children: ReactNode;
  runtime?: AppRuntime;
  demo?: boolean;
}): ReactNode {
  return demo ? (
    <DemoProvider>
      <DemoBridge>{children}</DemoBridge>
    </DemoProvider>
  ) : (
    <ProductProvider runtime={runtime}>{children}</ProductProvider>
  );
}
export function useBeyond(): Api {
  const value = useContext(Ctx);
  if (!value) throw new Error('BeyondProvider is required.');
  return value;
}
export function useActions(live: boolean): Omit<Api, 'state'> {
  const api = useBeyond();
  return live
    ? api
    : {
        ...api,
        dispatch: () => undefined,
        go: () => undefined,
        generate: nothing,
        reset: () => undefined,
        save: nothing,
        refresh: nothing,
        more: nothing,
        edit: () => undefined,
        remove: nothing,
        auth: nothing,
        google: nothing,
        signOut: nothing,
        exportData: nothing,
        deleteAccount: nothing,
        remember: async () => false,
        addTodo: async () => false,
        toggleTodo: nothing,
        removeTodo: nothing,
        moreProducts: nothing,
        requestReflection: nothing,
        decideReflection: nothing,
        correctReflection: nothing,
        cancelReflection: nothing,
        settingsChange: nothing,
      };
}
