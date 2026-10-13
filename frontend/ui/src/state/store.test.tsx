import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { createApiClient, type Entry, type Settings } from '@beyond/shared';
import { BeyondProvider, useBeyond } from './store';
import type { AppRuntime, Identity } from '../runtime';
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let api: ReturnType<typeof useBeyond>;
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  entryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const stamp = '2026-10-12T00:00:00Z';
function fixture() {
  let user: Identity | null = { id: a, email: 'fictional-a@example.invalid' };
  const listeners = new Set<(user: Identity | null) => void>();
  const settings: Settings = {
    timezone: 'Etc/UTC',
    voice: 'friend',
    morning_time: '07:30',
    memory_paused: false,
    reflection_enabled: false,
    revision: 1,
    updated_at: stamp,
  };
  const entries = new Map<string, Entry[]>();
  let resolveWrite: ((response: Response) => void) | undefined;
  let delayed = false,
    lost = false;
  let key: string | undefined;
  const calls: {
    owner: string;
    path: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const owner = (init?.headers as { Authorization: string }).Authorization.slice(7);
    const path = new URL(String(url)).pathname;
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ owner, path, method, body });
    if (path.endsWith('/settings')) {
      if (method === 'PATCH') {
        Object.assign(settings, body, { revision: settings.revision + 1 });
        delete (settings as unknown as Record<string, unknown>).expected_revision;
      }
      return Response.json({ data: settings });
    }
    if (path.endsWith('/account'))
      return Response.json({
        data: {
          status: 'active',
          capabilities: { account_deletion: false, reflections: false, voice_transcription: false },
        },
      });
    if (path.endsWith('/memories') || path.endsWith('/todos') || path.endsWith('/reflections'))
      return Response.json({ data: { items: [], next_cursor: null } });
    if (path.endsWith('/entries') && method === 'GET')
      return Response.json({ data: { entries: entries.get(owner) ?? [], next_cursor: null } });
    if (path.endsWith('/entries') && method === 'POST') {
      let entry = entries.get(owner)?.find((e) => e.id === entryId);
      if (!entry || key !== body.idempotency_key) {
        entry = {
          id: entryId,
          text: body.text,
          reflection_opt_in: false,
          revision: 1,
          created_at: stamp,
          updated_at: stamp,
        };
        key = body.idempotency_key;
        entries.set(owner, [entry]);
      }
      if (lost) {
        lost = false;
        throw new Error('Lost network response');
      }
      if (delayed)
        return new Promise((resolve) => {
          resolveWrite = resolve;
        });
      return Response.json({ data: entry });
    }
    if (method === 'PATCH') {
      const old = entries.get(owner)![0]!;
      const entry = { ...old, text: body.text, revision: old.revision + 1 };
      entries.set(owner, [entry]);
      return Response.json({ data: entry });
    }
    throw new Error('Unexpected fixture route');
  });
  const runtime: AppRuntime = {
    apiForUser: (owner) =>
      createApiClient({
        origin: 'https://api.example.test',
        getAccessToken: () => (user?.id === owner ? owner : null),
        fetcher,
      }),
    auth: {
      session: async () => user,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      signIn: async () => undefined,
      signUp: async () => undefined,
      resetPassword: async () => undefined,
      updatePassword: async () => undefined,
      google: async () => undefined,
      signOut: async () => {
        user = null;
        listeners.forEach((l) => l(null));
      },
    },
    download: async () => undefined,
  };
  return {
    runtime,
    calls,
    entries,
    switch: () => {
      user = { id: b, email: 'fictional-b@example.invalid' };
      listeners.forEach((l) => l(user));
    },
    delay: () => {
      delayed = true;
    },
    lose: () => {
      lost = true;
    },
    finish: () => {
      resolveWrite?.(Response.json({ data: entries.get(a)![0] }));
    },
  };
}
function Probe() {
  api = useBeyond();
  return <div>{api.state.entry}</div>;
}
async function mount(runtime?: AppRuntime) {
  const el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  await act(async () => {
    root!.render(
      <BeyondProvider runtime={runtime}>
        <Probe />
      </BeyondProvider>,
    );
  });
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = '';
  localStorage.clear();
});
describe('connected product state', () => {
  it('shows setup and empty private data without configuration', async () => {
    await mount();
    expect(api.state.product?.status).toBe('setup');
    expect(api.state.entry).toBe('');
    expect(api.state.mems).toEqual([]);
  });
  it('loads only authenticated real data and never persists journal text in browser storage', async () => {
    const f = fixture();
    await mount(f.runtime);
    expect(api.state.product?.status).toBe('ready');
    await act(async () => api.dispatch({ type: 'entry', entry: 'Private fictional draft' }));
    expect(api.state.entry).toBe('Private fictional draft');
    expect(localStorage.length).toBe(0);
    expect(f.calls.every((c) => c.owner === a)).toBe(true);
  });
  it('saves through the owned API and loads the entry again', async () => {
    const f = fixture();
    await mount(f.runtime);
    await act(async () => {
      api.edit(null);
      api.dispatch({ type: 'entry', entry: 'Fictional saved text' });
      await api.save();
    });
    expect(api.state.screen).toBe('sealed');
    expect(api.state.product?.entries[0]?.text).toBe('Fictional saved text');
    await act(async () => api.refresh());
    expect(api.state.product?.entries).toEqual(f.entries.get(a));
  });
  it('retries a lost create response with the original key and payload before applying a newer draft', async () => {
    const f = fixture();
    await mount(f.runtime);
    f.lose();
    await act(async () => {
      api.edit(null);
      api.dispatch({ type: 'entry', entry: 'Original fictional text' });
      await api.save();
    });
    await act(async () => {
      api.dispatch({ type: 'entry', entry: 'Changed fictional text' });
      await api.save();
    });
    const posts = f.calls.filter((c) => c.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[0]?.body).toEqual(posts[1]?.body);
    expect(api.state.product?.entries[0]?.text).toBe('Changed fictional text');
    expect(f.calls.some((c) => c.method === 'PATCH')).toBe(true);
  });
  it('never restores previous-owner content when an in-flight response arrives after account switch', async () => {
    const f = fixture();
    await mount(f.runtime);
    f.delay();
    let save: Promise<void>;
    await act(async () => {
      api.edit(null);
      api.dispatch({ type: 'entry', entry: 'Owner A private text' });
      save = api.save();
    });
    await act(async () => f.switch());
    expect(api.state.product?.identity?.id).toBe(b);
    expect(api.state.entry).toBe('');
    await act(async () => {
      f.finish();
      await save!;
    });
    expect(api.state.product?.identity?.id).toBe(b);
    expect(api.state.product?.entries).toEqual([]);
    expect(api.state.entry).toBe('');
    expect(api.state.product?.busy).toBe(false);
  });
  it('preserves a newer draft typed while a save response is pending', async () => {
    const f = fixture();
    await mount(f.runtime);
    f.delay();
    let save: Promise<void>;
    await act(async () => {
      api.edit(null);
      api.dispatch({ type: 'entry', entry: 'First draft' });
      save = api.save();
    });
    await act(async () => api.dispatch({ type: 'entry', entry: 'Newer unsaved draft' }));
    await act(async () => {
      f.finish();
      await save!;
    });
    expect(api.state.entry).toBe('Newer unsaved draft');
    expect(api.state.screen).toBe('write');
  });
  it('queues quick preference changes against the latest server revision', async () => {
    const f = fixture();
    await mount(f.runtime);
    await act(async () => {
      await Promise.all([
        api.settingsChange({ voice: 'mentor' }),
        api.settingsChange({ morning_time: '08:00' }),
      ]);
    });
    const patches = f.calls.filter((c) => c.path.endsWith('/settings') && c.method === 'PATCH');
    expect(patches.map((c) => c.body?.expected_revision)).toEqual([1, 2]);
    expect(api.state.voice).toBe('mentor');
    expect(api.state.time).toBe('08:00');
  });
  it('clears drafts and owned data immediately on local logout', async () => {
    const f = fixture();
    await mount(f.runtime);
    await act(async () => {
      api.dispatch({ type: 'entry', entry: 'Fictional draft' });
      await api.signOut();
    });
    expect(api.state.product?.identity).toBe(null);
    expect(api.state.product?.status).toBe('signed_out');
    expect(api.state.entry).toBe('');
  });
});
