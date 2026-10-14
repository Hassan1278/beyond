'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme, readTheme } from './demo/theme';
import SiteApp from './SiteApp';

const noSubscription = () => () => undefined;

/** The marketing site renders only in the browser (hash routes, motion). */
export function ClientSite() {
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  useEffect(() => applyTheme(readTheme()), []);
  return inBrowser ? <SiteApp /> : null;
}
