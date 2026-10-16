/**
 * The demo: Beyond with no account and no AI. It answers the journal app the
 * way the real backend does, but keeps everything in this page's memory, so a
 * reload starts the demo over. The app shows Kit's fictional sample journal on
 * top, and a night sealed here gets a pre-written letter (see app.js). Nothing
 * here is sent anywhere and nothing is written to browser storage.
 */
import { ApiClientError, type Letter, type Memory, type Note, type Settings } from '@beyond/shared';
import type { JournalBackend, User } from './backend';

const DEMO_USER: User = { id: '00000000-0000-4000-8000-000000000000', email: null };

export function demoBackend(): JournalBackend {
  const now = () => new Date().toISOString();
  let settings: Settings = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong',
    morning_time: '08:00',
    voice: 'friend',
    memory_paused: false,
    reflection_enabled: false,
    letter_language: 'auto',
    delivery_time: '08:00',
    allow_early: true,
    onboarded: false,
    directions: {},
    revision: 1,
    updated_at: now(),
  };
  let memories: Memory[] = [];
  const letters: Letter[] = [];
  const notes: Note[] = [];
  const notHere = (): never => {
    throw new ApiClientError('not_ready', 0);
  };

  return {
    configured: true,
    session: async () => DEMO_USER,
    recovering: () => false,
    completeCallback: async () => {},
    signIn: async () => DEMO_USER,
    signUp: async () => DEMO_USER,
    google: async () => {},
    resetPassword: async () => {},
    updatePassword: async () => {},
    reauth: async () => {},
    signOut: async () => {},
    onSignedOut: () => {},
    account: async () => ({ deletion: false, letters: false, voice: false }),
    settings: async () => ({ ...settings }),
    async updateSettings(patch) {
      settings = { ...settings, ...patch, revision: settings.revision + 1, updated_at: now() };
      return { ...settings };
    },
    letters: async () => [...letters],
    letter: async (id) => letters.find((l) => l.id === id) ?? notHere(),
    // Demo nights are sealed and answered inside the app; they never get here.
    seal: async () => notHere(),
    updateLetter: async (id) => letters.find((l) => l.id === id) ?? notHere(),
    retryLetter: async (id) => letters.find((l) => l.id === id) ?? notHere(),
    memories: async () => [...memories],
    async createMemory(text) {
      const at = now();
      const memory: Memory = {
        id: crypto.randomUUID(),
        text,
        source_entry_id: null,
        kind: 'told',
        created_at: at,
        revision: 1,
        updated_at: at,
      };
      memories = [...memories, memory];
      return memory;
    },
    async updateMemory(id, text) {
      const found = memories.find((m) => m.id === id) ?? notHere();
      const next: Memory = {
        ...found,
        text,
        kind: 'edited',
        revision: found.revision + 1,
        updated_at: now(),
      };
      memories = memories.map((m) => (m.id === id ? next : m));
      return next;
    },
    async deleteMemory(id) {
      memories = memories.filter((m) => m.id !== id);
    },
    notes: async () => [...notes],
    writeNote: async () => notHere(),
    aiStatus: async () => ({ letters: false, notes: false, transcribe: false }),
    transcribe: async () => notHere(),
    exportAll: async () => notHere(),
    async clearAll() {
      memories = [];
    },
    deleteAccount: async () => notHere(),
  };
}
