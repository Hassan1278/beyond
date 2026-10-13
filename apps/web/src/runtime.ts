import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createApiClient } from '@beyond/shared';
import { authAdapter } from '@beyond/app-ui/auth';
import type { AppRuntime } from '@beyond/app-ui/runtime';

let browserRuntime: AppRuntime | undefined;
let browserClient: SupabaseClient | undefined;
let browserAuth: ReturnType<typeof authAdapter> | undefined;
let recovering = false;
let callbackTask: { code: string; promise: Promise<void> } | undefined;
export async function completeWebCallback(): Promise<void> {
  webRuntime();
  const params = new URL(window.location.href).searchParams;
  const code = params.get('code');
  recovering = params.get('flow') === 'recovery';
  if (!browserClient || !code || code.length > 256 || params.has('error'))
    throw new Error('Authentication callback failed.');
  if (callbackTask?.code === code) return callbackTask.promise;
  const client = browserClient;
  const expectedGeneration = browserAuth?.generation();
  const promise = (async () => {
    const result = await client.auth.exchangeCodeForSession(code);
    if (result.error || !result.data.session) throw new Error('Authentication callback failed.');
    await browserAuth?.acceptSession(result.data.session, recovering, expectedGeneration);
  })();
  callbackTask = { code, promise };
  return promise;
}
/** Never initialized on a server or shared across server requests. */
export function webRuntime(): AppRuntime | undefined {
  if (typeof window === 'undefined') return undefined;
  if (browserRuntime) return browserRuntime;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env.NEXT_PUBLIC_API_URL;
  if (!url || !key || !origin) return undefined;
  try {
    const ownedKeys = new Set<string>();
    const client = createClient(url, key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
        storage: {
          getItem: (name) => {
            ownedKeys.add(name);
            return sessionStorage.getItem(name);
          },
          setItem: (name, value) => {
            ownedKeys.add(name);
            sessionStorage.setItem(name, value);
          },
          removeItem: (name) => sessionStorage.removeItem(name),
        },
      },
    });
    const apiForUser = (userId: string) =>
      createApiClient({
        origin,
        timeoutMs: 30000,
        getAccessToken: async () => {
          const { data, error } = await client.auth.getSession();
          if (auth.isLocked() || error || data.session?.user.id !== userId) return null;
          return data.session?.access_token ?? null;
        },
      });
    browserClient = client;
    const auth = authAdapter(
      client,
      window.location.origin + '/auth/callback',
      undefined,
      async () => {
        for (const name of ownedKeys) sessionStorage.removeItem(name);
        ownedKeys.clear();
      },
    );
    browserAuth = auth;
    const subscribe = auth.subscribe;
    auth.subscribe = (listener) =>
      subscribe((user) =>
        listener(user ? { ...user, recovery: recovering || user.recovery } : null),
      );
    const session = auth.session;
    const updatePassword = auth.updatePassword;
    auth.session = async () => {
      const value = await session();
      return value ? { ...value, recovery: recovering } : null;
    };
    auth.updatePassword = async (password) => {
      await updatePassword(password);
      recovering = false;
    };
    browserRuntime = {
      apiForUser,
      auth,
      download: async (name, content) => {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        try {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = name;
          anchor.click();
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      },
    };
    return browserRuntime;
  } catch {
    return undefined;
  }
}
