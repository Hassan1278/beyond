import 'react-native-url-polyfill/auto';
import './native-crypto';
import { createClient, processLock, type Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { authAdapter } from '@beyond/app-ui/auth';
import { secureSessionStorage } from './secure-session';

function createNativeConnection() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const apiOrigin = process.env.EXPO_PUBLIC_API_URL;
  if (!url || !key || !apiOrigin) return null;
  try {
    const origin = new URL(apiOrigin);
    if (
      origin.origin !== apiOrigin ||
      (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname))
    )
      return null;
    const storage = secureSessionStorage({
      get: SecureStore.getItemAsync,
      set: (name, value) =>
        SecureStore.setItemAsync(name, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      remove: SecureStore.deleteItemAsync,
    });
    const client = createClient(url, key, {
      auth: {
        storage,
        lock: processLock,
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
    const redirect = Linking.createURL('/auth/callback', { scheme: 'beyond' });
    let recovering = false;
    const callbacks = new Map<string, Promise<Session>>();
    const consumeUrl = async (value: string) => {
      const incoming = new URL(value);
      const expected = new URL(redirect);
      if (
        incoming.protocol !== expected.protocol ||
        incoming.host !== expected.host ||
        incoming.pathname !== expected.pathname
      )
        return;
      if (incoming.searchParams.has('error')) throw new Error('Authentication callback failed.');
      recovering = incoming.searchParams.get('flow') === 'recovery';
      const code = incoming.searchParams.get('code');
      if (!code || code.length > 256) throw new Error('Authentication callback failed.');
      const prior = callbacks.get(code);
      if (prior) return prior;
      const expectedGeneration = auth.generation();
      const task = (async () => {
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error || !result.data.session)
          throw new Error('Authentication callback failed.');
        await auth.acceptSession(result.data.session, recovering, expectedGeneration);
        return result.data.session;
      })();
      callbacks.set(code, task);
      if (callbacks.size > 20) callbacks.delete(callbacks.keys().next().value!);
      return task;
    };
    const auth = authAdapter(
      client,
      redirect,
      async () => {
        const { data, error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirect, skipBrowserRedirect: true },
        });
        if (error || !data.url) throw new Error('OAuth unavailable.');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirect);
        if (result.type !== 'success') throw new Error('OAuth was cancelled.');
        const session = await consumeUrl(result.url);
        if (!session) throw new Error('Authentication callback failed.');
        return session;
      },
      () => storage.clear(),
    );
    const session = auth.session;
    const subscribe = auth.subscribe;
    const updatePassword = auth.updatePassword;
    auth.session = async () => {
      const user = await session();
      return user ? { ...user, recovery: recovering } : null;
    };
    auth.subscribe = (listener) =>
      subscribe((user) =>
        listener(user ? { ...user, recovery: recovering || user.recovery } : null),
      );
    auth.updatePassword = async (password) => {
      await updatePassword(password);
      recovering = false;
    };
    const inflight = new Map<string, AbortController>();
    const cancelled = new Set<string>();
    return {
      client,
      auth,
      apiOrigin,
      consumeUrl,
      cancel: async (id: string) => {
        if (inflight.has(id)) inflight.get(id)!.abort();
        else {
          cancelled.add(id);
          if (cancelled.size > 256) cancelled.delete(cancelled.values().next().value!);
        }
      },
      request: async (
        id: string,
        expectedUser: string,
        path: string,
        method: string,
        body: string | null,
      ) => {
        if (
          !/^[A-Za-z0-9_-]{1,80}$/.test(id) ||
          !['GET', 'POST', 'PATCH', 'DELETE'].includes(method) ||
          !/^\/api\/v1\/(entries|settings|memories|todos|account|reflections)(?:\/[A-Za-z0-9_-]+){0,2}(?:\?[^#]*)?$/.test(
            path,
          ) ||
          (body !== null && body.length > 128000)
        )
          throw new Error('Invalid API request.');
        if (cancelled.delete(id)) throw new Error('API request cancelled.');
        const controller = new AbortController();
        inflight.set(id, controller);
        const cancelledWork = new Promise<never>((_resolve, reject) =>
          controller.signal.addEventListener(
            'abort',
            () => reject(new Error('API request cancelled.')),
            { once: true },
          ),
        );
        void cancelledWork.catch(() => undefined);
        const bounded = <T>(work: Promise<T>): Promise<T> => Promise.race([work, cancelledWork]);
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const session = await bounded(client.auth.getSession());
          if (controller.signal.aborted) throw new Error('API request cancelled.');
          if (auth.isLocked() || session.error || session.data.session?.user.id !== expectedUser)
            return {
              status: 401,
              body: JSON.stringify({
                error: {
                  code: 'unauthorized',
                  message: 'Authentication required.',
                  request_id: id,
                },
              }),
            };
          const response = await fetch(apiOrigin + path, {
            method,
            signal: controller.signal,
            redirect: 'error',
            headers: {
              Authorization: 'Bearer ' + session.data.session.access_token,
              ...(body === null ? {} : { 'Content-Type': 'application/json' }),
            },
            ...(body === null ? {} : { body }),
          });
          if (!response.body) throw new Error('Invalid API response.');
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8', { fatal: true });
          let bytes = 0,
            text = '';
          try {
            for (;;) {
              const part = await bounded(reader.read());
              if (part.done) break;
              bytes += part.value.byteLength;
              if (bytes > 8_000_000) throw new Error('API response too large.');
              text += decoder.decode(part.value, { stream: true });
            }
            text += decoder.decode();
          } finally {
            void reader.cancel().catch(() => undefined);
            reader.releaseLock();
          }
          return { status: response.status, body: text };
        } finally {
          clearTimeout(timer);
          inflight.delete(id);
        }
      },
      download: async (_name: string, content: string) => {
        if (content.length > 64000000) throw new Error('Export exceeds device limits.');
        if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable.');
        const file = new File(Paths.cache, 'beyond-export-' + crypto.randomUUID() + '.json');
        try {
          file.create();
          file.write(content);
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export your Beyond data',
          });
        } finally {
          if (file.exists) file.delete();
        }
      },
    };
  } catch {
    return null;
  }
}

let cached: ReturnType<typeof createNativeConnection> | undefined;
export function nativeConnection() {
  if (cached === undefined) cached = createNativeConnection();
  return cached;
}
