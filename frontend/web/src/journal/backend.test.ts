import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const created: Array<{ url: string; key: string; options: Record<string, unknown> }> = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: Record<string, unknown>) => {
    created.push({ url, key, options });
    return {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
    };
  },
}));

beforeEach(() => {
  vi.resetModules();
  created.length = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe('journal backend', () => {
  it('reports itself unconfigured without public settings and never signs anyone in', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const { journalBackend } = await import('./backend');
    const backend = journalBackend();
    expect(backend.configured).toBe(false);
    expect(await backend.session()).toBeNull();
    await expect(backend.settings()).rejects.toMatchObject({ code: 'not_ready' });
    expect(created).toHaveLength(0);
  });

  it('keeps the Supabase session in sessionStorage with PKCE, never localStorage', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://sb.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    const { journalBackend } = await import('./backend');
    const backend = journalBackend();
    expect(backend.configured).toBe(true);
    const { options } = created[0]!;
    const auth = options.auth as {
      flowType: string;
      detectSessionInUrl: boolean;
      storage: { setItem(k: string, v: string): void; removeItem(k: string): void };
    };
    expect(auth.flowType).toBe('pkce');
    expect(auth.detectSessionInUrl).toBe(false);
    auth.storage.setItem('sb-fixture-auth-token', 'fictional-token');
    expect(sessionStorage.getItem('sb-fixture-auth-token')).toBe('fictional-token');
    expect(localStorage.length).toBe(0);
    await backend.signOut();
    expect(sessionStorage.getItem('sb-fixture-auth-token')).toBeNull();
  });

  it('refuses to call the API without a signed-in session', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://sb.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const { journalBackend } = await import('./backend');
    await expect(journalBackend().letters()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
