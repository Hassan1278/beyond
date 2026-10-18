/**
 * Words for the first sign-in welcome (four screens), in one place so the team can
 * edit them. English here; the Chinese for every line is in zh.ts (keep both in step).
 * The privacy lines on screen 4 must never claim more than the app does: no
 * "encrypted", "end-to-end" or "fully secure" (see docs/privacy.md).
 */

import { PRIVACY_FOOTNOTE, PRIVACY_POINTS, PRIVACY_TITLE, VOICE_NAMES } from '../copy/shared';

export const WELCOME_STEPS = [
  {
    title: 'Journal and write freely, anytime.',
    text: 'Whatever’s on your mind, whenever it hits.',
  },
  {
    title: 'Wake up to a letter.',
    text: 'Receive a personalised letter and reflection the next morning.',
  },
  {
    title: 'Look back and see yourself grow.',
    text: 'Reflect on your journals and patterns.',
  },
];

/** Screen 2. Keys are what the account stores (see migration 20261017000000_welcome). */
export const WELCOME_REASONS: {
  key: 'want' | 'mind' | 'behind' | 'write' | 'lookback' | 'other';
  label: string;
}[] = [
  { key: 'want', label: 'Figuring out what I actually want' },
  { key: 'mind', label: 'Too much on my mind' },
  { key: 'behind', label: 'Feeling behind everyone else' },
  { key: 'write', label: 'Just want somewhere to write' },
  { key: 'lookback', label: 'Want to have something to look back on' },
  { key: 'other', label: 'Something else…' },
];
export const WELCOME_OTHER_MAX = 150;
/** Screen 3 and Settings: what letters call you (optional; never sent to the letter writer). */
export const LETTER_NAME_MAX = 40;

/** Screen 3. Same four voices as Settings; only the diary label differs here. */
export const WELCOME_VOICES: {
  key: 'friend' | 'mentor' | 'future' | 'diary';
  name: string;
  desc: string;
  example: string;
}[] = [
  {
    key: 'friend',
    name: VOICE_NAMES.friend,
    desc: 'Warm, direct, a little funny.',
    example: 'Hey, so about last night…',
  },
  {
    key: 'mentor',
    name: VOICE_NAMES.mentor,
    desc: 'Clear, structured, honest.',
    example: 'Good morning. Three things stood out.',
  },
  {
    key: 'future',
    name: VOICE_NAMES.future,
    desc: 'Writes back from a few years ahead.',
    example: 'Hi. It’s you, a few years from now.',
  },
  {
    key: 'diary',
    name: VOICE_NAMES.diary,
    desc: 'A plain summary, no voice.',
    example: 'Sat 10 Oct, summary',
  },
];

/** Screen 4: the privacy lines, from the one shared source (copy/shared.ts). */
export const WELCOME_PRIVACY = {
  heading: PRIVACY_TITLE,
  subtitle: 'We value your privacy',
  items: PRIVACY_POINTS,
  note: PRIVACY_FOOTNOTE,
};
