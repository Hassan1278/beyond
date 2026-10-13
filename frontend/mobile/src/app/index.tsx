import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileApp from '../dom/App';
import { nativeConnection } from '../connection';
import type { Identity } from '@beyond/app-ui/runtime';
export default function Index() {
  const [connection] = useState(nativeConnection);
  const [user, setUser] = useState<Identity | null>(null);
  useEffect(() => {
    if (!connection) return;
    const unsubscribe = connection.auth.subscribe(setUser);
    void connection.auth
      .session()
      .then(setUser)
      .catch(() => setUser(null));
    const link = Linking.addEventListener('url', ({ url }) => {
      void connection.consumeUrl(url).catch(() => setUser(null));
    });
    void Linking.getInitialURL()
      .then((url) => (url ? connection.consumeUrl(url) : undefined))
      .catch(() => setUser(null));
    const refresh = (state: string) =>
      state === 'active'
        ? connection.client.auth.startAutoRefresh()
        : connection.client.auth.stopAutoRefresh();
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);
    return () => {
      unsubscribe();
      link.remove();
      appState.remove();
      connection.client.auth.stopAutoRefresh();
    };
  }, [connection]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0c0e' }} edges={['top', 'bottom']}>
      <MobileApp
        dom={{
          scrollEnabled: false,
          bounces: false,
          style: { flex: 1 },
          unstable_useExpoModulesBridge: false,
        }}
        apiOrigin={connection?.apiOrigin ?? null}
        user={user}
        getIdentity={async () => connection?.auth.session() ?? null}
        authAction={async (operation, email, password) => {
          if (!connection) throw new Error('Account connection is not configured.');
          const auth = connection.auth;
          if (operation === 'signin') await auth.signIn(email, password);
          else if (operation === 'signup') await auth.signUp(email, password);
          else if (operation === 'reset') await auth.resetPassword(email);
          else if (operation === 'recovery') await auth.updatePassword(password);
          else if (operation === 'google') await auth.google();
          else if (operation === 'signout') await auth.signOut();
          else throw new Error('Invalid authentication action.');
        }}
        request={async (id, identity, path, method, body) => {
          if (!connection) throw new Error('No API connection.');
          return connection.request(id, identity, path, method, body);
        }}
        cancel={async (id) => {
          await connection?.cancel(id);
        }}
        download={async (name, content) => {
          if (!connection) throw new Error('No account connection.');
          await connection.download(name, content);
        }}
      />
    </SafeAreaView>
  );
}
