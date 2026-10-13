import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { AuthAdapter, Identity } from './runtime';
export function identity(session: Session | null, recovery = false): Identity | null {
  return session ? { id: session.user.id, email: session.user.email ?? null, recovery } : null;
}
export function authAdapter(
  client: SupabaseClient,
  redirect: string,
  google?: () => Promise<Session>,
  forgetLocal?: () => Promise<void>,
): AuthAdapter & {
  isLocked: () => boolean;
  generation: () => number;
  acceptSession: (session: Session, recovery?: boolean, expected?: number) => Promise<void>;
} {
  let locked = false,
    generation = 0;
  let lastIntent: 'signin' | 'signup' | 'google' | 'signout' | null = null;
  const listeners = new Set<(user: Identity | null) => void>();
  const bounded = async <T>(request: PromiseLike<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve(request),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Authentication request timed out.')), 15_000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const checked = async (request: PromiseLike<{ error: unknown }>): Promise<void> => {
    if ((await bounded(request)).error) throw new Error('Authentication request failed.');
  };
  const accept = async (
    session: Session,
    recovery = false,
    expected = generation,
  ): Promise<void> => {
    if (expected !== generation) {
      if (lastIntent === 'signout') await forgetLocal?.();
      return;
    }
    locked = false;
    client.auth.startAutoRefresh();
    listeners.forEach((listener) => listener(identity(session, recovery)));
  };
  return {
    isLocked: () => locked,
    generation: () => generation,
    acceptSession: accept,
    session: () =>
      bounded(
        (async () => {
          if (locked) return null;
          const { data, error } = await client.auth.getSession();
          if (error) throw new Error('Session unavailable.');
          if (!data.session || locked) return null;
          const verified = await client.auth.getUser();
          if (verified.error || !verified.data.user || locked) return null;
          return { id: verified.data.user.id, email: verified.data.user.email ?? null };
        })(),
      ),
    subscribe: (listener) => {
      listeners.add(listener);
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Never await Supabase inside its auth lock, or unlock from stale callbacks.
        if (!locked && event !== 'SIGNED_IN')
          listener(identity(session, event === 'PASSWORD_RECOVERY'));
      });
      return () => {
        listeners.delete(listener);
        data.subscription.unsubscribe();
      };
    },
    signIn: async (email, password) => {
      const expected = ++generation;
      lastIntent = 'signin';
      const result = await bounded(client.auth.signInWithPassword({ email, password }));
      if (result.error || !result.data.session) throw new Error('Authentication request failed.');
      await accept(result.data.session, false, expected);
    },
    signUp: async (email, password) => {
      const expected = ++generation;
      lastIntent = 'signup';
      const result = await bounded(
        client.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }),
      );
      if (result.error) throw new Error('Authentication request failed.');
      // Confirmation-only signup is not proof of a new authenticated session.
      if (result.data.session) await accept(result.data.session, false, expected);
    },
    resetPassword: (email) =>
      checked(
        client.auth.resetPasswordForEmail(email, { redirectTo: redirect + '?flow=recovery' }),
      ),
    updatePassword: (password) => checked(client.auth.updateUser({ password })),
    google: async () => {
      const expected = ++generation;
      lastIntent = 'google';
      if (google) await accept(await google(), false, expected);
      // Web OAuth navigates away. Only its PKCE callback establishes a new session.
      else
        await checked(
          client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } }),
        );
    },
    signOut: async () => {
      generation++;
      lastIntent = 'signout';
      locked = true;
      listeners.forEach((listener) => listener(null));
      client.auth.stopAutoRefresh();
      try {
        await checked(client.auth.signOut({ scope: 'local' }));
      } finally {
        await forgetLocal?.();
      }
    },
  };
}
