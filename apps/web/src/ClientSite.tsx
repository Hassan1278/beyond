'use client';
import { useEffect, useState } from 'react';
import { applyTheme, readTheme } from '@beyond/app-ui/lib/theme';
import SiteApp from './SiteApp';
import { completeWebCallback, webRuntime } from './runtime';
export function ClientSite({ callback = false }: { callback?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    applyTheme(readTheme());
    let active = true;
    void (async () => {
      webRuntime();
      if (callback) {
        try {
          await completeWebCallback();
        } catch {
          /* The app shows signed-out/setup state. */
        }
        window.history.replaceState(null, '', '/#/app');
      }
      if (active) setMounted(true);
    })();
    return () => {
      active = false;
    };
  }, [callback]);
  return mounted ? <SiteApp /> : null;
}
