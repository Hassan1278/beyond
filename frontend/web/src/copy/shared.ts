/**
 * Words the site and the journal app must say the same way. The landing page's
 * privacy page is the source of truth; the welcome's privacy screen and Settings
 * read from here too, so they can't drift apart. Chinese for all of it is in
 * journal/zh.ts (the app and the site share that dictionary).
 *
 * Keep every claim true to what the code does (see docs/privacy.md): no
 * "encrypted", "end-to-end" or "fully secure".
 */
import { CRISIS_LINES } from '@beyond/shared';

export { CRISIS_LINES };

/** The welcome's privacy screen: exactly three points. */
export const PRIVACY_TITLE = 'What you write stays yours';
export const PRIVACY_POINTS: { icon: 'lock' | 'seal' | 'memory'; title: string; text: string }[] = [
  {
    icon: 'lock',
    title: 'Private to your account.',
    text: 'Readable only with your sign-in. Nothing is kept in this browser.',
  },
  {
    icon: 'seal',
    title: 'Sealing is the permission.',
    text: 'Only the night you seal goes to the letter writer, never your name or email.',
  },
  {
    icon: 'memory',
    title: 'You stay in control.',
    text: 'See, edit or forget any memory, keep a night out of Growth, or delete everything.',
  },
];
export const PRIVACY_FOOTNOTE =
  'Beyond is a journal, not a crisis service. If you need someone right now, help is one tap away in Settings.';

/** What the letter writer receives when you seal a night, and what it never gets. */
export const AI_SENT = [
  'The night you seal, word for word',
  'The voice and language you chose for letters',
  'Memories you can see in Settings, unless memory is paused',
  'Headlines, themes and skipped to-dos of up to four earlier letters you kept',
];
export const AI_NEVER = [
  'Your email, name or account',
  'Other nights, letters you keep out of Growth, or anything you forgot',
  'Your location, contacts or device details',
];
export const AI_PROVIDER_NOTE =
  'Letters, month and year notes, and voice transcription go through Beyond’s own letter service, which passes them to an AI provider (Anthropic’s Claude by default) and keeps nothing. Names, places or contact details you type are sent as written; nothing is redacted automatically. Recordings are turned into words and not stored. Hosting providers see normal connection information. Each person has a daily limit on letters, notes and transcription.';

/** The privacy commitments, in the order the site shows them. */
export const SAFEGUARDS = [
  {
    title: 'Your private account',
    body: 'Your nights, letters, memories, notes and settings are stored in your Beyond account, readable only with your sign-in. Nothing you write is kept in browser storage, and closing the tab signs you out on shared devices. This is not end-to-end encryption: Beyond’s servers can read what they store in order to write your letters.',
  },
  {
    title: 'Sealing is the permission',
    body: 'A night goes to the letter writer only when you seal it. Just that night, the voice and language you chose, memories you can see (unless paused) and the headlines of up to four earlier letters you kept. Never your email, name or account. The letter writer is a separate service with no access to the database and keeps nothing.',
  },
  {
    title: 'Memory you can see',
    body: 'A letter may remember at most two small things you wrote, each linked to its night. Edit or forget any of them; a forgotten memory is never learned again. Keep a night out of Growth and nothing learned from it is used. Changing your words removes that night’s letter.',
  },
  {
    title: 'Control what stays',
    body: 'Download a copy, delete your journal, or delete your account after confirming it’s you. Deletion removes letters, notes and memories too. Copies you downloaded, and the AI provider’s own short-lived processing records, are outside what deletion can reach.',
  },
  {
    title: 'Not therapy',
    body: 'Beyond doesn’t diagnose or treat anything. A limited keyword check shows support contacts while you write, and a letter that senses risk points you to people, but both can miss things. A morning letter is not emergency help.',
  },
];

/** The four letter voices, by stored key (the stored value stays "diary"). */
export const VOICE_NAMES = {
  friend: 'Friend',
  mentor: 'Mentor',
  future: 'Future you',
  diary: 'Just the notes',
} as const;

/** When letters arrive unless you change it: the account's default delivery time. */
export const DELIVERY_DEFAULT = '08:00';

/**
 * One theme choice across the site and the app, carried in the link
 * (?theme=gold|blue), never in browser storage. Site "gold" is the app's Candle;
 * site "blue" is the app's Midnight. The app's third theme, Ink, shows as blue on
 * the site.
 */
export type SiteTheme = 'gold' | 'blue';
export const SITE_TO_APP = { gold: 'candle', blue: 'midnight' } as const;
export const appToSite = (t: string): SiteTheme => (t === 'candle' ? 'gold' : 'blue');
export const readThemeParam = (): SiteTheme | null => {
  try {
    const v = new URLSearchParams(window.location.search).get('theme');
    return v === 'gold' || v === 'blue' ? v : null;
  } catch {
    return null;
  }
};
