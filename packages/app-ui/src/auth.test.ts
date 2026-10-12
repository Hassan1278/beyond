import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authAdapter } from './auth';
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'fictional@example.invalid' };
function fixture() {
  let callback: (event: string, session: unknown) => void = () => undefined;
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    onAuthStateChange: vi.fn((fn) => {
      callback = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null, data: { session: { user } } }),
    signUp: vi.fn().mockResolvedValue({ error: null, data: { session: { user } } }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    stopAutoRefresh: vi.fn(),
    startAutoRefresh: vi.fn(),
  };
  const forget = vi.fn().mockResolvedValue(undefined);
  const adapter = authAdapter(
    { auth } as unknown as SupabaseClient,
    'https://web.example.test/auth/callback',
    undefined,
    forget,
  );
  return { auth, adapter, forget, emit: (event: string) => callback(event, { user }) };
}
describe('Supabase auth adapter', () => {
  it('verifies stored display identity with fresh Auth user lookup', async () => {
    const f = fixture();
    expect(await f.adapter.session()).toMatchObject(user);
    expect(f.auth.getUser).toHaveBeenCalledOnce();
  });
  it('does not expose an invalid stored identity', async () => {
    const f = fixture();
    f.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'private' } });
    expect(await f.adapter.session()).toBeNull();
  });
  it('uses PKCE callback URLs for sign-up and password recovery', async () => {
    const f = fixture();
    await f.adapter.signUp(user.email, 'fictional');
    await f.adapter.resetPassword(user.email);
    expect(f.auth.signUp.mock.calls[0]?.[0].options.emailRedirectTo).toBe(
      'https://web.example.test/auth/callback',
    );
    expect(f.auth.resetPasswordForEmail.mock.calls[0]?.[1].redirectTo).toContain('?flow=recovery');
  });
  it('marks password recovery without calling Supabase inside its auth lock', () => {
    const f = fixture();
    const listener = vi.fn();
    f.adapter.subscribe(listener);
    f.emit('PASSWORD_RECOVERY');
    expect(listener).toHaveBeenCalledWith({ ...user, recovery: true });
    expect(f.auth.getSession).not.toHaveBeenCalled();
  });
  it('erases local credentials even when server logout cannot be confirmed', async () => {
    const f = fixture();
    f.auth.signOut.mockResolvedValue({ error: { message: 'network private' } });
    await expect(f.adapter.signOut()).rejects.toThrow('Authentication request failed.');
    expect(f.forget).toHaveBeenCalledOnce();
    expect(f.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await f.adapter.session()).toBe(null);
  });
  it('blocks stale refresh callbacks after logout and unlocks on a successful new login', async () => {
    const f = fixture();
    const listener = vi.fn();
    f.adapter.subscribe(listener);
    await f.adapter.signOut();
    listener.mockClear();
    f.emit('TOKEN_REFRESHED');
    expect(listener).not.toHaveBeenCalled();
    await f.adapter.signIn(user.email, 'fictional');
    expect(f.adapter.isLocked()).toBe(false);
    expect(listener).toHaveBeenCalledWith({ ...user, recovery: false });
  });
  it('keeps local session locked after a failed login', async () => {
    const f = fixture();
    await f.adapter.signOut();
    f.auth.signInWithPassword.mockResolvedValue({ error: { message: 'sensitive' } });
    await expect(f.adapter.signIn(user.email, 'bad')).rejects.toThrow();
    expect(f.adapter.isLocked()).toBe(true);
  });
  it('keeps a locally signed-out session locked after confirmation-only signup', async () => {
    const f = fixture();
    await f.adapter.signOut();
    f.auth.signUp.mockResolvedValue({ error: null, data: { session: null } });
    await f.adapter.signUp('fictional-new@example.invalid', 'fictional');
    expect(f.adapter.isLocked()).toBe(true);
    expect(await f.adapter.session()).toBeNull();
  });
  it('never unlocks stale memory when native OAuth is cancelled', async () => {
    const f = fixture();
    const adapter = authAdapter(
      { auth: f.auth } as unknown as SupabaseClient,
      'beyond:///auth/callback',
      async () => {
        throw new Error('Cancelled.');
      },
      f.forget,
    );
    await adapter.signOut();
    await expect(adapter.google()).rejects.toThrow();
    expect(adapter.isLocked()).toBe(true);
    expect(await adapter.session()).toBeNull();
  });
  it('keeps browser OAuth locked until its independently verified callback', async () => {
    const f = fixture();
    await f.adapter.signOut();
    await f.adapter.google();
    expect(f.adapter.isLocked()).toBe(true);
    expect(f.auth.getSession).not.toHaveBeenCalled();
  });
  it('bounds an unavailable Auth session lookup', async () => {
    const f = fixture();
    f.auth.getSession.mockImplementation(() => new Promise(() => undefined));
    vi.useFakeTimers();
    try {
      const request = f.adapter.session();
      const result = expect(request).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(15000);
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not restore an in-flight login after a later explicit sign-out', async () => {
    const f = fixture();
    let finish!: (value: unknown) => void;
    f.auth.signInWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const listener = vi.fn();
    f.adapter.subscribe(listener);
    const login = f.adapter.signIn(user.email, 'fictional');
    await f.adapter.signOut();
    listener.mockClear();
    finish({ error: null, data: { session: { user } } });
    await login;
    expect(f.adapter.isLocked()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
    expect(f.forget).toHaveBeenCalledTimes(2);
  });
  it('does not accept a stale independently verified callback after sign-out', async () => {
    const f = fixture();
    const expected = f.adapter.generation();
    await f.adapter.signOut();
    await f.adapter.acceptSession({ user } as never, false, expected);
    expect(f.adapter.isLocked()).toBe(true);
  });
});
