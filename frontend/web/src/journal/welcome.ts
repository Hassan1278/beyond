/**
 * Words for the first sign-in welcome (four screens), in one place so the team can
 * edit them. English here; the Chinese for every line is in zh.ts (keep both in step).
 * The privacy lines on screen 4 must never claim more than the app does: no
 * "encrypted", "end-to-end" or "fully secure" (see docs/privacy.md).
 */

export const WELCOME_STEPS = [
  {
    title: 'Journal and write freely, anytime.',
    text: 'Whatever’s on your mind, whenever it hits. Nothing interrupts you.',
  },
  {
    title: 'Wake up to a letter.',
    text: 'Beyond reads your day and writes back once, the next morning.',
  },
  {
    title: 'Look back, reflect and see yourself grow.',
    text: 'Your letters and patterns stay with you, so you can see where you’re heading.',
  },
];

/** Screen 2. Keys are what the account stores (see migration 20261017000000_welcome). */
export const WELCOME_REASONS: {
  key: 'want' | 'mind' | 'behind' | 'write' | 'other';
  label: string;
}[] = [
  { key: 'want', label: 'Figuring out what I actually want' },
  { key: 'mind', label: 'Too much on my mind' },
  { key: 'behind', label: 'Feeling behind everyone else' },
  { key: 'write', label: 'Just want somewhere to write' },
  { key: 'other', label: 'Something else…' },
];
export const WELCOME_OTHER_MAX = 150;

/** Screen 3. Same four voices as Settings; only the diary label differs here. */
export const WELCOME_VOICES: {
  key: 'friend' | 'mentor' | 'future' | 'diary';
  name: string;
  desc: string;
  example: string;
}[] = [
  {
    key: 'friend',
    name: 'Friend',
    desc: 'Warm, direct, a little funny.',
    example: 'Hey, so about last night…',
  },
  {
    key: 'mentor',
    name: 'Mentor',
    desc: 'Clear, structured, honest.',
    example: 'Good morning. Three things stood out.',
  },
  {
    key: 'future',
    name: 'Future you',
    desc: 'Writes back from a few years ahead.',
    example: 'Hi. It’s you, a few years from now.',
  },
  {
    key: 'diary',
    name: 'Just the notes',
    desc: 'A plain summary, no voice.',
    example: 'Sat 10 Oct, summary',
  },
];

/** Screen 4: the privacy lines. */
export const WELCOME_PRIVACY = {
  heading: 'Privacy',
  subtitle: 'We value your privacy',
  items: [
    { icon: 'lock', title: 'Private to your account.', text: 'Only you can read your journal.' },
    {
      icon: 'seal',
      title: 'Nothing leaves until you seal it.',
      text: 'Only that night is used to write your letter. Never your name or email.',
    },
    {
      icon: 'memory',
      title: 'You decide what Beyond remembers.',
      text: 'See, edit, or forget anything, anytime.',
    },
    {
      icon: 'clear',
      title: 'Delete everything, anytime.',
      text: 'Your journal, letters, and memories, gone for good.',
    },
  ],
  note: 'Beyond is a journal, not a crisis service. If you ever need someone right now, help is one tap away in Settings.',
};
