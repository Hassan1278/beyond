'use dom';
import { useEffect, useMemo, useRef } from 'react';
import type { DOMProps } from 'expo/dom';
import { createApiClient } from '@beyond/shared';
import { AppRoot } from '@beyond/app-ui';
import type { AppRuntime, Identity } from '@beyond/app-ui/runtime';
import { applyTheme, readTheme } from '@beyond/app-ui/lib/theme';
import '@beyond/app-ui/styles/tokens.css';
import '@beyond/app-ui/styles/themes.css';
import '@beyond/app-ui/styles/base.css';
import '@beyond/app-ui/styles/phone.css';
import '@beyond/app-ui/styles/controls.css';
interface Props {
  dom?: DOMProps;
  apiOrigin: string | null;
  user: Identity | null;
  getIdentity: () => Promise<Identity | null>;
  authAction: (operation: string, email: string, password: string) => Promise<void>;
  request: (
    id: string,
    user: string,
    path: string,
    method: string,
    body: string | null,
  ) => Promise<{ status: number; body: string }>;
  cancel: (id: string) => Promise<void>;
  download: (name: string, content: string) => Promise<void>;
}
export default function MobileApp(props: Props) {
  const actions = useRef(props);
  actions.current = props;
  const listeners = useRef(new Set<(identity: Identity | null) => void>());
  useEffect(() => {
    applyTheme(readTheme());
  }, []);
  useEffect(() => {
    listeners.current.forEach((listener) => listener(props.user));
  }, [props.user]);
  const runtime = useMemo<AppRuntime | undefined>(() => {
    if (!props.apiOrigin) return undefined;
    return {
      auth: {
        session: () => actions.current.getIdentity(),
        subscribe: (listener) => {
          listeners.current.add(listener);
          return () => {
            listeners.current.delete(listener);
          };
        },
        signIn: (email, password) => actions.current.authAction('signin', email, password),
        signUp: (email, password) => actions.current.authAction('signup', email, password),
        resetPassword: (email) => actions.current.authAction('reset', email, ''),
        updatePassword: (password) => actions.current.authAction('recovery', '', password),
        google: () => actions.current.authAction('google', '', ''),
        signOut: () => actions.current.authAction('signout', '', ''),
      },
      apiForUser: (userId) =>
        createApiClient({
          origin: props.apiOrigin!,
          timeoutMs: 30000,
          getAccessToken: () => 'native-session',
          fetcher: async (input, init) => {
            const id = crypto.randomUUID();
            const url = new URL(String(input));
            const cancel = () => {
              void actions.current.cancel(id);
            };
            if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            init?.signal?.addEventListener('abort', cancel, { once: true });
            try {
              const result = await actions.current.request(
                id,
                userId,
                url.pathname + url.search,
                init?.method ?? 'GET',
                typeof init?.body === 'string' ? init.body : null,
              );
              return new Response(result.body, {
                status: result.status,
                headers: { 'Content-Type': 'application/json' },
              });
            } finally {
              init?.signal?.removeEventListener('abort', cancel);
            }
          },
        }),
      download: (name, content) => actions.current.download(name, content),
    };
  }, [props.apiOrigin]);
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
        rel="stylesheet"
      />
      <AppRoot runtime={runtime} />
    </>
  );
}
