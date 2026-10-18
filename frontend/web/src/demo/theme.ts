/**
 * The site's two palettes, shared with the journal app: Gold (the app's Candle)
 * and Blue (the app's Midnight, same tokens). The choice lives in the page and in
 * the link (?theme=gold|blue) only, never in browser storage, and it travels to
 * the app with "Open Beyond App".
 */
import { useSyncExternalStore } from 'react';
import { readThemeParam, type SiteTheme } from '../copy/shared';

export const THEME_IDS = ['candle', 'night'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

const BAR: Record<ThemeId, string> = { candle: '#15100e', night: '#0b0d17' };
const toSite = (id: ThemeId): SiteTheme => (id === 'candle' ? 'gold' : 'blue');

/** From the link, else Blue (the app's default). */
export function readTheme(): ThemeId {
  return readThemeParam() === 'gold' ? 'candle' : 'night';
}

export const currentTheme = (): ThemeId =>
  document.documentElement.dataset.theme === 'candle' ? 'candle' : 'night';

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  window.dispatchEvent(new Event('beyond-theme'));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR[id]);
  // keep it in the address, so a reload or a shared link opens in the same colours
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('theme', toSite(id));
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* the page still switches */
  }
}

/** Where "Open Beyond App" goes, carrying the colours. */
export const appHref = (): string => `/app?theme=${toSite(currentTheme())}`;

const subscribeTheme = (callback: () => void) => {
  window.addEventListener('beyond-theme', callback);
  return () => window.removeEventListener('beyond-theme', callback);
};
export const useAppHref = () =>
  useSyncExternalStore(subscribeTheme, appHref, () => '/app?theme=blue');
