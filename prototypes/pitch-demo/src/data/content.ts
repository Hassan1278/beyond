/**
 * Every word in the demo, in one place.
 *
 * The scripted letters are the ones that ship. They are what the demo shows
 * with no network, no key and no risk on stage; live AI letters replace them
 * when `/api/letter` is configured.
 */
import type { CSSProperties } from 'react';
import type {
  FilmFrame,
  LetterContent,
  Memory,
  ScreenId,
  ScreenMeta,
  Trend,
  Voice,
  VoiceId,
} from '../types';

export const SAMPLE_ENTRY =
  'Three people from my year posted internship offers today. I closed Instagram, opened it ' +
  'again ten minutes later, and saved another “how I landed Goldman at 19” video. I ' +
  "don't even know if I want finance. The only part of this week that felt like mine was the " +
  "photo walk on Sunday. I'm tired of feeling behind in a race I never signed up for.";

export const VOICES: Voice[] = [
  { id: 'friend', name: 'Friend', desc: 'Warm, direct, a little funny.', from: 'From your Friend' },
  { id: 'mentor', name: 'Mentor', desc: 'Clear, structured, honest.', from: 'From your Mentor' },
  {
    id: 'future',
    name: 'Future you',
    desc: 'Writes back from a few years ahead.',
    from: 'From Future you',
  },
  { id: 'diary', name: 'Plain diary', desc: 'Just the summary. No voice.', from: 'Plain diary' },
];

export const voiceById = (id: VoiceId): Voice => VOICES.find((v) => v.id === id) ?? VOICES[0];

/** `greet` for the diary voice is filled in with the live date at render time. */
export const SCRIPTED_LETTERS: Record<VoiceId, LetterContent> = {
  friend: {
    greet: 'Hey,',
    said:
      'Last night was a lot. Three people posted offers, you went back to Instagram twice, and ' +
      'you saved another video about landing finance at 19. Then you said it yourself: you' +
      '’re not even sure you want finance.',
    rec:
      'This is the third night this week you wrote the word “behind.” And for the ' +
      'second time, the photo walk was the part of your week that felt like yours.',
    step: 'Take your camera out for 20 minutes today, before you open Instagram.',
    sign: 'Talk tonight,\nB.',
  },
  mentor: {
    greet: 'Good morning.',
    said:
      'Here is what I heard. You measured yourself against three internship offers, spent the ' +
      'evening collecting advice for a path you’re unsure of, and ended the night tired.',
    rec:
      'Two signals repeat across your recent entries. Feeling behind tends to follow time on ' +
      'social apps (3 of 4 entries this week). Photography is the one activity you describe ' +
      'with energy.',
    step:
      'Spend 20 minutes on a photo walk before any social apps. Tonight, write one line about ' +
      'how the day felt.',
    sign: 'Until tonight.',
  },
  future: {
    greet: 'Hi. It’s you, a few years from now.',
    said:
      'I remember this week. Everyone seemed to be getting offers, and you kept saving videos ' +
      'for a life you weren’t sure you wanted.',
    rec:
      'I don’t remember whose offers they were. I do remember the photo walks. You keep ' +
      'coming back to them, even on the nights you feel furthest behind.',
    step: 'Go on one 20-minute photo walk today, before you check anyone else’s news.',
    sign: 'See you down the road,\nYou',
  },
  diary: {
    greet: 'summary',
    said:
      'Compared yourself with three peers’ internship offers. Saved more finance-career ' +
      'content. Unsure finance is the goal. Sunday’s photo walk was the best part of the week.',
    rec: '“Behind”: 3 nights this week. Photography: 2 entries, both positive.',
    step: '20-minute photo walk before opening social apps.',
    sign: '',
  },
};

export const MEMORIES: Memory[] = [
  { t: 'First-year university student', s: 'You told Beyond · 3 Sep' },
  { t: 'Photography is what makes a week feel like yours', s: 'From 2 entries' },
  { t: 'Internship posts tend to spiral your evening', s: 'From 3 entries' },
  { t: 'Sleeps badly the week before deadlines', s: 'From 4 entries' },
  { t: 'Prefers short, direct letters', s: 'From your settings' },
];

export const TRENDS: Trend[] = [
  { name: 'Feeling behind', w: [4, 3, 1, 1], up: false },
  { name: 'Internships', w: [3, 2, 1, 1], up: false },
  { name: 'Photography', w: [0, 1, 2, 3], up: true },
  { name: 'Sleep', w: [1, 1, 1, 1], up: false },
];

export const FILM: FilmFrame[] = [
  {
    month: 'Jul',
    text: "The summer of saving other people's advice.",
    grad: 'linear-gradient(160deg,#3b4258,#1a1d29)',
  },
  {
    month: 'Aug',
    text: 'You moved, and wrote mostly about being nervous.',
    grad: 'linear-gradient(160deg,#5a4a5e,#22202c)',
  },
  {
    month: 'Sep',
    text: '“Behind” shows up eleven times.',
    grad: 'linear-gradient(160deg,#6e5a52,#2a2422)',
  },
  {
    month: 'Oct',
    text: 'The camera comes back.',
    grad: 'linear-gradient(160deg,#c49a72,#5b4436)',
  },
  { month: 'Nov', text: 'Not written yet.', grad: null },
];

/** The noise words that drift behind the welcome screen. */
export const NOISE: { text: string; style: CSSProperties }[] = [
  { text: 'INTERNSHIP', style: { top: '5%', left: '-6%', fontSize: 36, rotate: '-8deg' } },
  { text: 'SUCCESS', style: { top: '15%', right: '-8%', fontSize: 21, animationDelay: '-2s' } },
  { text: '5AM ROUTINE', style: { top: '25%', left: '10%', fontSize: 14, animationDelay: '-3s' } },
  { text: 'STARTUP', style: { top: '33%', right: '2%', fontSize: 15, animationDelay: '-1s' } },
  {
    text: 'FITNESS',
    style: { top: '40%', left: '-4%', fontSize: 30, rotate: '6deg', animationDelay: '-4s' },
  },
  {
    text: 'EVERYONE IS AHEAD',
    style: { top: '49%', right: '-12%', fontSize: 19, animationDelay: '-2.5s' },
  },
];

export const HELPLINES = [
  { label: '18111', note: 'Mental Health Support Hotline · 24 hours' },
  { label: 'Open Up', note: 'Online text chat for young people · openup.hk' },
  { label: '999', note: "If you're in immediate danger" },
];

export const SCREENS: ScreenMeta[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    time: '23:40',
    theme: 'dk',
    short: 'The same noise as the website, then quiet.',
    lead: 'The first screen repeats the website’s idea: the noise is still there, but it fades into the background.',
    notes: [
      'One action: Step beyond',
      'States the limits up front: Beyond is not therapy or emergency support',
    ],
  },
  {
    id: 'voice',
    title: 'Choose a letter voice',
    time: '23:41',
    theme: 'lt',
    short: 'Friend, Mentor, Future you or Plain diary.',
    lead: 'People pick who writes their letters and when the letter arrives. In our survey, 73% said they’d use a next-morning letter in a format they choose.',
    notes: [
      'Four voices, changeable anytime from settings',
      'Letter time sets the morning notification',
      'Tap a voice, then Continue',
    ],
  },
  {
    id: 'home',
    title: 'Tonight',
    time: '23:46',
    theme: 'lt',
    tab: 'home',
    short: 'One main action. No feed, no streaks.',
    lead: 'The evening home screen has one job: get you writing. There is no feed and no streak counter to protect.',
    notes: ['Recurring themes, shown without scores', 'Letters one tap away'],
  },
  {
    id: 'write',
    title: 'Night entry',
    time: '23:48',
    theme: 'dk',
    short: 'Write or speak for 5–10 minutes. Nothing replies.',
    lead: 'A dark, low-stimulation screen for late at night. Write or speak; Beyond doesn’t answer until morning.',
    notes: [
      'The timer is a guide, not a limit',
      'Speak mode is a visual mock in this preview',
      '“See what’s sent to the AI” opens a plain list',
      'Edit the entry, then switch on live AI to get a letter about what you actually wrote',
    ],
    demo: 'write',
  },
  {
    id: 'sealed',
    title: 'Sealed for the night',
    time: '23:59',
    theme: 'nt',
    short: 'The entry waits until morning. So should you.',
    lead: 'The entry is sealed until the letter arrives. No AI output at night, by design.',
    notes: [
      'Tells you when to expect the letter',
      'The skip button exists only in this demo',
      'With live AI on, this is where the letter is actually written',
    ],
  },
  {
    id: 'letter',
    title: 'Morning letter',
    time: '07:30',
    theme: 'lt',
    tab: 'letter',
    short: 'What you said, what keeps coming back, one small step.',
    lead: 'The core of Beyond. A letter in your chosen voice, ending with one small step you can take today.',
    notes: [
      'Accept or skip the step',
      'Correct anything Beyond got wrong',
      'Corrections shape the next letter',
    ],
    demo: 'voice',
  },
  {
    id: 'patterns',
    title: 'Patterns & Life Film',
    time: '12:40',
    theme: 'lt',
    tab: 'patterns',
    short: 'Monthly themes and one film frame per month.',
    lead: 'Over weeks, Beyond shows which themes are growing and which are fading. Each month becomes one frame of your Life Film.',
    notes: ['Trends are counts of entries per week', 'Sample data for one person’s October'],
  },
  {
    id: 'memory',
    title: 'Memory & settings',
    time: '15:05',
    theme: 'lt',
    tab: 'memory',
    short: 'See, forget or pause everything Beyond keeps.',
    lead: 'Everything Beyond remembers is listed with its source. Forget lines, pause memory, or delete everything.',
    notes: [
      'Forgotten means gone, not hidden',
      'Delete everything asks before it acts',
      'Letter writer switches between the scripted demo and live AI',
    ],
  },
  {
    id: 'safety',
    title: 'Safety check',
    time: '23:58',
    theme: 'nt',
    branch: true,
    short: 'Shown instead of Sealed when an entry sounds urgent.',
    lead: 'If an entry sounds urgent, Beyond doesn’t wait for morning. It shows people who can help tonight, before sealing.',
    notes: [
      'A morning letter is never presented as emergency help',
      'Hong Kong services: 18111, Open Up, 999',
      'The person can still choose to seal the entry',
    ],
  },
];

export const screenIndex = (id: ScreenId): number => SCREENS.findIndex((s) => s.id === id);

export const screenById = (id: ScreenId): ScreenMeta =>
  SCREENS.find((s) => s.id === id) ?? SCREENS[0];
