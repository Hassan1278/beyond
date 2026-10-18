/**
 * The journal's only connection to Beyond: Supabase Auth for sign-in and the
 * product API for everything else. The page keeps journal text in memory only.
 * The Supabase session (tokens, never journal text) lives in sessionStorage, so
 * closing the tab or app signs you out on shared devices.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import {
  ApiClientError,
  createApiClient,
  type AccountExportQuery,
  type Entry,
  type Letter,
  type Memory,
  type Note,
  type PatchLetter,
  type PatchSettings,
  type Settings,
  type SpokenLanguage,
} from '@beyond/shared';

export type User = { id: string; email: string | null };
type Api = ReturnType<typeof createApiClient>;
type SettingsPatch = Omit<PatchSettings, 'expected_revision'>;

export interface JournalBackend {
  configured: boolean;
  session(): Promise<User | null>;
  recovering(): boolean;
  completeCallback(): Promise<void>;
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string): Promise<User | null>;
  google(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  reauth(password: string): Promise<void>;
  signOut(): Promise<void>;
  onSignedOut(listener: () => void): void;
  account(): Promise<{ deletion: boolean; letters: boolean; voice: boolean }>;
  settings(): Promise<Settings>;
  updateSettings(patch: SettingsPatch, revision: number): Promise<Settings>;
  letters(): Promise<Letter[]>;
  letter(id: string): Promise<Letter>;
  /** One page of entries, newest first (the journal book loads more as you flip back). */
  entries(cursor?: string): Promise<{ entries: Entry[]; next_cursor: string | null }>;
  seal(
    text: string,
    idempotencyKey: string,
    journalDate: string,
    deliverAt: string,
  ): Promise<Letter>;
  /**
   * Adds more writing to a night that is already sealed, so the night keeps one
   * letter. Editing the entry removes its unread letter (a privacy cascade);
   * the letter is then asked for again over everything written that night.
   */
  addToNight(
    entryId: string,
    text: string,
    journalDate: string,
    deliverAt: string,
  ): Promise<Letter>;
  updateLetter(id: string, patch: PatchLetter): Promise<Letter>;
  retryLetter(id: string): Promise<Letter>;
  memories(): Promise<Memory[]>;
  createMemory(text: string, idempotencyKey: string): Promise<Memory>;
  updateMemory(id: string, text: string, revision: number): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
  notes(): Promise<Note[]>;
  writeNote(key: string): Promise<Note>;
  aiStatus(): Promise<{ letters: boolean; notes: boolean; transcribe: boolean }>;
  transcribe(audio: Blob, spoken: SpokenLanguage): Promise<{ text: string }>;
  exportAll(): Promise<Record<string, unknown>>;
  clearAll(): Promise<void>;
  deleteAccount(): Promise<void>;
}

const unconfigured = (): never => {
  throw new ApiClientError('not_ready', 0);
};

function bounded<T>(work: PromiseLike<T>, ms = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(work),
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new ApiClientError('unavailable', 0)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function checked(work: PromiseLike<{ error: unknown }>): Promise<void> {
  if ((await bounded(work)).error) throw new ApiClientError('auth_failed', 0);
}

async function all<T>(
  page: (cursor?: string) => Promise<{ items: T[]; next_cursor: string | null }>,
  max = 2000,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const result = await page(cursor);
    out.push(...result.items);
    cursor = result.next_cursor ?? undefined;
  } while (cursor && out.length < max);
  return out;
}

let instance: JournalBackend | null = null;

export function journalBackend(): JournalBackend {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env.NEXT_PUBLIC_API_URL;
  const redirect = `${window.location.origin}/auth/callback`;
  let recovering = new URL(window.location.href).searchParams.get('flow') === 'recovery';
  let client: SupabaseClient | null = null;
  let api: Api | null = null;
  let signedOutListener: (() => void) | null = null;
  let currentUser: User | null = null;
  const owned = new Set<string>();

  if (url && key && origin) {
    client = createClient(url, key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
        storage: {
          getItem: (name) => {
            owned.add(name);
            return sessionStorage.getItem(name);
          },
          setItem: (name, value) => {
            owned.add(name);
            sessionStorage.setItem(name, value);
          },
          removeItem: (name) => sessionStorage.removeItem(name),
        },
      },
    });
    const supabase = client;
    api = createApiClient({
      origin,
      timeoutMs: 30_000,
      getAccessToken: async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session || (currentUser && data.session.user.id !== currentUser.id))
          return null;
        return data.session.access_token;
      },
    });
    supabase.auth.onAuthStateChange((event) => {
      // Never await Supabase inside its own auth callback.
      if (event === 'SIGNED_OUT' && currentUser) {
        currentUser = null;
        setTimeout(() => signedOutListener?.(), 0);
      }
    });
  }

  const supa = (): SupabaseClient => client ?? unconfigured();
  const http = (): Api => api ?? unconfigured();
  const userOf = (session: Session): User => ({
    id: session.user.id,
    email: session.user.email ?? null,
  });
  const forgetLocal = () => {
    for (const name of owned) sessionStorage.removeItem(name);
    owned.clear();
  };
  // Takes a thunk so a missing configuration rejects instead of throwing.
  const guard = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'unauthorized' && currentUser) {
        currentUser = null;
        setTimeout(() => signedOutListener?.(), 0);
      }
      throw error;
    }
  };
  let callback: Promise<void> | null = null;

  instance = {
    configured: Boolean(client && api),
    recovering: () => recovering,
    async completeCallback() {
      const params = new URL(window.location.href).searchParams;
      const code = params.get('code');
      recovering = params.get('flow') === 'recovery';
      if (!code || code.length > 256 || params.has('error'))
        throw new ApiClientError('auth_failed', 0);
      callback ??= (async () => {
        const result = await bounded(supa().auth.exchangeCodeForSession(code));
        if (result.error || !result.data.session) throw new ApiClientError('auth_failed', 0);
        currentUser = userOf(result.data.session);
      })();
      return callback;
    },
    async session() {
      if (!client) return null;
      const { data, error } = await bounded(client.auth.getSession());
      if (error) throw new ApiClientError('unavailable', 0);
      if (!data.session) return null;
      // A stored token is not proof: ask Supabase who this is.
      const verified = await bounded(client.auth.getUser());
      if (verified.error || !verified.data.user) return null;
      currentUser = { id: verified.data.user.id, email: verified.data.user.email ?? null };
      return currentUser;
    },
    async signIn(email, password) {
      const result = await bounded(supa().auth.signInWithPassword({ email, password }));
      if (result.error || !result.data.session) throw new ApiClientError('auth_failed', 0);
      currentUser = userOf(result.data.session);
      return currentUser;
    },
    async signUp(email, password) {
      const result = await bounded(
        supa().auth.signUp({ email, password, options: { emailRedirectTo: redirect } }),
      );
      if (result.error) throw new ApiClientError('auth_failed', 0);
      // With email confirmation on, there is no session until the link is opened.
      if (!result.data.session) return null;
      currentUser = userOf(result.data.session);
      return currentUser;
    },
    async google() {
      await checked(
        supa().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } }),
      );
    },
    resetPassword: (email) =>
      checked(
        supa().auth.resetPasswordForEmail(email, { redirectTo: `${redirect}?flow=recovery` }),
      ),
    async updatePassword(password) {
      await checked(supa().auth.updateUser({ password }));
      recovering = false;
    },
    async reauth(password) {
      const email = currentUser?.email;
      if (!email) throw new ApiClientError('auth_failed', 0);
      const result = await bounded(supa().auth.signInWithPassword({ email, password }));
      if (result.error || !result.data.session || result.data.session.user.id !== currentUser?.id)
        throw new ApiClientError('auth_failed', 0);
    },
    async signOut() {
      currentUser = null;
      try {
        if (client) await checked(client.auth.signOut({ scope: 'local' }));
      } finally {
        forgetLocal();
      }
    },
    onSignedOut(listener) {
      signedOutListener = listener;
    },
    async account() {
      const a = await guard(() => http().account.get());
      return {
        deletion: a.capabilities.account_deletion,
        letters: a.capabilities.letters,
        voice: a.capabilities.voice_transcription,
      };
    },
    settings: () => guard(() => http().settings.get()),
    updateSettings: (patch, revision) =>
      guard(() => http().settings.update({ ...patch, expected_revision: revision })),
    letters: () =>
      guard(() =>
        all((cursor) => http().letters.list(cursor ? { limit: '100', cursor } : { limit: '100' })),
      ),
    letter: (id) => guard(() => http().letters.get(id)),
    entries: (cursor) =>
      guard(() => http().entries.list(cursor ? { limit: '100', cursor } : { limit: '100' })),
    async seal(text, idempotencyKey, journalDate, deliverAt) {
      const entry = await guard(() =>
        http().entries.create({ text, idempotency_key: idempotencyKey, reflection_opt_in: false }),
      );
      return guard(() =>
        http().letters.request({
          entry_id: entry.id,
          expected_revision: entry.revision,
          journal_date: journalDate,
          deliver_at: deliverAt,
          consent: true,
        }),
      );
    },
    async addToNight(entryId, text, journalDate, deliverAt) {
      let entry = await guard(() => http().entries.get(entryId));
      // a retry after a dropped connection must not add the same words twice
      if (!entry.text.endsWith(text)) {
        const current = entry;
        entry = await guard(() =>
          http().entries.update(entryId, {
            text: `${current.text}\n\n${text}`,
            expected_revision: current.revision,
          }),
        );
      }
      return guard(() =>
        http().letters.request({
          entry_id: entry.id,
          expected_revision: entry.revision,
          journal_date: journalDate,
          deliver_at: deliverAt,
          consent: true,
        }),
      );
    },
    updateLetter: (id, patch) => guard(() => http().letters.update(id, patch)),
    retryLetter: (id) => guard(() => http().letters.retry(id)),
    memories: () =>
      guard(() =>
        all((cursor) => http().memories.list(cursor ? { limit: '100', cursor } : { limit: '100' })),
      ),
    createMemory: (text, idempotencyKey) =>
      guard(() =>
        http().memories.create({
          text,
          source_entry_id: null,
          approved: true,
          idempotency_key: idempotencyKey,
        }),
      ),
    updateMemory: (id, text, revision) =>
      guard(() =>
        http().memories.update(id, { text, approved: true, expected_revision: revision }),
      ),
    async deleteMemory(id) {
      await guard(() => http().memories.delete(id));
    },
    notes: async () => (await guard(() => http().notes.list())).items,
    writeNote: (key) => guard(() => http().notes.write(key)),
    aiStatus: () => guard(() => http().ai.status()),
    transcribe: (audio, spoken) => guard(() => http().ai.transcribe(audio, spoken)),
    async exportAll() {
      const page = (q: AccountExportQuery) => guard(() => http().account.exportPage(q));
      const section = async (name: 'entries' | 'memories' | 'todos' | 'letters') =>
        all(async (cursor) => {
          const p = await page(
            cursor ? { section: name, limit: '50', cursor } : { section: name, limit: '50' },
          );
          if (p.section !== name || !('next_cursor' in p))
            throw new ApiClientError('invalid_response', 0);
          return { items: p.items as unknown[], next_cursor: p.next_cursor };
        }, 20_000);
      const settings = await page({ section: 'settings' });
      const notes = await page({ section: 'notes' });
      return {
        app: 'Beyond',
        format_version: 1,
        exported_at: new Date().toISOString(),
        settings: settings.section === 'settings' ? settings.settings : null,
        entries: await section('entries'),
        letters: await section('letters'),
        memories: await section('memories'),
        notes: notes.section === 'notes' ? notes.items : [],
        todos: await section('todos'),
      };
    },
    async clearAll() {
      await guard(() => http().account.clearData());
    },
    async deleteAccount() {
      await guard(() => http().account.delete());
      currentUser = null;
      try {
        if (client) await client.auth.signOut({ scope: 'local' });
      } finally {
        forgetLocal();
      }
    },
  };
  return instance;
}
