/** Copy for the site, trimmed from the long single-page version. */

export interface SitePage {
  path: string;
  /** Nav label. Empty for pages that are not in the nav. */
  nav: string;
  title: string;
  /** Drives the clock in the nav: the site runs from night to morning. */
  time: string;
}

export const PAGES: SitePage[] = [
  { path: '/', nav: '', title: 'Beyond', time: '23:41' },
  { path: '/problem', nav: 'The problem', title: 'The Great Distraction', time: '00:14' },
  { path: '/how', nav: 'How it works', title: 'How Beyond works', time: '07:30' },
  { path: '/why', nav: 'Why Beyond', title: 'Why Beyond', time: '12:40' },
  { path: '/privacy', nav: 'Privacy', title: 'Privacy and limits', time: '16:20' },
  {
    path: '/institutions',
    nav: 'For institutions',
    title: 'Beyond for institutions',
    time: '21:05',
  },
  { path: '/beta', nav: 'Join the beta', title: 'Join the beta', time: '22:47' },
];

/**
 * Who this is for, said plainly. The site used to explain what Beyond does
 * without ever naming its reader; this block is the fix, and it is the one
 * thing a skimmer should not be able to miss.
 */
export const WHO_FOR = {
  lead: 'Beyond is for you if your phone has more say in your plans than you do.',
  points: [
    {
      t: 'You are always a little behind',
      s: 'Not because you are, but because the feed is built so that somebody always is further ahead.',
    },
    {
      t: 'You want to understand yourself, not be diagnosed',
      s: 'You are not in crisis. You just have no quiet place to work out what you actually think.',
    },
    {
      t: 'You want a direction that is yours',
      s: 'Not the one that trended this month. Something you would still choose with the apps closed.',
    },
  ],
};

/* ------------------------------------------------------------ the problem */

export const ERAS = [
  { yr: '1914–1918', era: 'The Great War', now: false },
  { yr: '1929–1939', era: 'The Great Depression', now: false },
  { yr: 'Now', era: 'The Great Distraction', now: true },
];

export const SYMPTOMS = [
  'Shorter attention spans',
  'A new life goal every trend cycle',
  'Insecurity about mind and body',
  'Less motivation to grow',
  'Nowhere to think out loud without being judged',
];

/** n is out of 42 respondents; each dot is one person. */
export const STATS = [
  { n: 34, num: '80%+', caption: 'feel lost about where they’re heading' },
  { n: 38, num: '91%', caption: 'have things to get off their chest, but no right person to tell' },
  { n: 36, num: '86%', caption: 'want advice that fits their life, not generic stress tips' },
  { n: 31, num: '73%', caption: 'would use a letter that arrives the next morning' },
];

export const SURVEY_NOTE =
  'Beyond team survey, 2026, n = 42 young people in high school and university across Asia, ' +
  'Europe and North America. Each dot is one respondent. It is a small sample, so our beta ' +
  'will test these findings with more people.';

/* ------------------------------------------------------------ how it works */

export const BEATS = [
  {
    cls: 'b1',
    when: 'Any time · The day',
    title: 'Say it the way it comes.',
    body:
      'Write or speak whenever it hits — on the bus, between classes, at 2am. Add as many ' +
      'entries as you like. Beyond never replies, interrupts, or asks follow-up questions.',
  },
  {
    cls: 'b2',
    when: '02:00 · Overnight',
    title: 'Beyond reads between the nights.',
    body:
      'It reads everything you wrote that day next to the memories you have let it keep, and ' +
      'finds what keeps coming back.',
  },
  {
    cls: 'b3',
    when: '07:30 · Morning',
    title: 'One letter, not a feed.',
    body:
      'However many times you wrote, one letter arrives: what you said, what keeps returning, ' +
      'and one small step for today.',
  },
];

/* ------------------------------------------------------------- why beyond */

export const COMPARE = [
  {
    name: 'AI chatbots',
    good: 'Fast answers to almost anything.',
    bad: 'Answers before you’ve finished thinking. Advice often feels generic, and it forgets you.',
    us: false,
  },
  {
    name: 'Therapy & helplines',
    good: 'Serious mental-health needs. Essential, and Beyond points people there.',
    bad: 'Not built for everyday reflection on where your life is going.',
    us: false,
  },
  {
    name: 'AI journaling apps',
    good: 'Guided prompts and AI feedback on entries.',
    bad: 'The AI joins the conversation while you’re still writing.',
    us: false,
  },
  {
    name: 'beyond.',
    good: 'Young people who don’t need therapy or another instant answer, but want to slow down and find their direction.',
    bad: 'Expression first, reflection later. A letter in the voice you choose, with one small step instead of ten.',
    us: true,
  },
];

/* ---------------------------------------------------------------- privacy */

export const SAFEGUARDS = [
  {
    title: 'Kept to a minimum',
    body: 'Beyond stores only what your letters need. Sensitive entries are encrypted, and only you can read them.',
  },
  {
    title: 'You see what goes to AI',
    body: 'Before you submit, you can see exactly what will be sent to the model to write your letter.',
  },
  {
    title: 'Delete anything',
    body: 'An entry, a memory, or your whole account. Deleting is permanent.',
  },
  {
    title: 'Not therapy',
    body: 'Beyond doesn’t diagnose or treat anything. If an entry sounds urgent, it points you to people who can help right away, instead of waiting for morning.',
  },
];

export const CRISIS = [
  { label: '18111', note: 'Mental Health Support Hotline · 24h' },
  { label: '999', note: 'Emergency' },
];

/* ----------------------------------------------------------- institutions */

export const INSTITUTIONS = [
  {
    big: 'Schools',
    title: 'Universities & high schools',
    body: 'A daily reflection habit for young people facing big choices about subjects, careers and who they want to be.',
  },
  {
    big: 'Teams',
    title: 'Employers',
    body: 'A quiet place for staff to process their week and set one realistic next step, away from performance reviews.',
  },
  {
    big: 'Private',
    title: 'Entries stay personal',
    body: 'Institutions pay for access. They never see anyone’s entries, letters or memories.',
  },
];

export const MEMORY_POINTS = [
  { b: 'Every memory shows its source', s: 'Which entries or settings it came from.' },
  { b: 'Edit or forget any line', s: 'Forgotten means gone, not hidden.' },
  {
    b: 'Pause memory',
    s: 'For one night or for good. Letters then use tonight’s entry only.',
  },
];

export const CREDIT =
  'Made by Team Beyond for the HK Inter-University GenAI Hackathon for SDGs 2026 · ' +
  'SDG 3: Good health and well-being';
