import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  history.replaceState(null, '', '/');
  vi.resetModules();
});
it('keeps the explicit landing choice through sign-in URL cleanup, then consumes it', async () => {
  history.replaceState(null, '', '/app?theme=gold');
  const theme = await import('./theme');
  expect(theme.journalTheme()).toBe('candle');
  history.replaceState(null, '', '/app');
  expect(theme.themeFromLink()).toBe(true);
  theme.clearThemeFromLink();
  expect(theme.themeFromLink()).toBe(false);
  theme.setJournalTheme('ink');
  expect(theme.journalTheme()).toBe('ink');
});
it('accepts only exact known theme parameters', async () => {
  history.replaceState(null, '', '/app?theme=gold-invalid');
  const theme = await import('./theme');
  expect(theme.themeFromLink()).toBe(false);
  expect(theme.journalTheme()).toBe('midnight');
});
