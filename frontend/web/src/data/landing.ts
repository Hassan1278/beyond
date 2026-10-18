/**
 * Words for the landing page: one scrolling page in four numbered sections.
 * Privacy, crisis lines, voice names and the delivery time come from
 * copy/shared.ts so the site and the app say the same thing.
 */
import { DELIVERY_DEFAULT } from '../copy/shared';

/** The sections, in page order. `path` is the old hash route that still scrolls here. */
export const SECTIONS = [
  { id: 'problem', path: '/problem', nav: 'The problem', label: '01 · The problem' },
  { id: 'how', path: '/how', nav: 'How it works', label: '02 · How it works' },
  { id: 'privacy', path: '/privacy', nav: 'Privacy', label: '03 · Privacy' },
  {
    id: 'institutions',
    path: '/institutions',
    nav: 'For institutions',
    label: '04 · For institutions',
  },
] as const;

/** Old links keep working: they scroll to the section that replaced them. */
export const MOVED: Record<string, string> = {
  '/why': '/how',
  '/beta': '/how',
  '/patterns': '/how',
  '/schools': '/institutions',
};

export const WHO_FOR =
  'Beyond is for you if your phone has more say in your plans than you do. It is not therapy, not a chatbot, and not another feed.';

/* ---------------------------------------------------------- 01 the problem */

export const PROBLEM =
  'The feed always has someone further ahead. Scroll long enough and you can’t tell which goals were yours to begin with.';

/** Hong Kong studies, worded exactly as published. */
export const EVIDENCE = [
  {
    num: '59.5%',
    text: 'of 1,241 Form 5–6 students surveyed chose 迷惘 (“lost”) to describe the path ahead.',
    source: 'HKFYG, 2026',
  },
  {
    num: '82% vs 32%',
    text: 'of 1,134 Form 4–5 students, 82% had study or career goals; 32% consistently followed up on them.',
    source: 'Hang Seng × St. James’ Settlement, 2022',
  },
];

/** n is out of 42 respondents; each dot is one person. */
export const STATS = [
  { n: 34, num: '80%+', caption: 'feel lost about where they’re heading' },
  { n: 38, num: '91%', caption: 'have things to get off their chest, but no right person to tell' },
  { n: 36, num: '86%', caption: 'want advice that fits their life' },
  { n: 31, num: '73%', caption: 'would use a letter that arrives the next morning' },
];

export const SURVEY_NOTE =
  'Beyond team survey, 2026, n = 42 young people in high school and university across Asia, ' +
  'Europe and North America. Each dot is one respondent. A small sample, so we will keep testing it.';

/* ---------------------------------------------------------- 02 how it works */

export const STEPS = [
  {
    when: 'Any time',
    title: 'Write freely, anytime.',
    body: 'Type or talk, in English, Cantonese or both. Nothing replies while you write.',
    why: 'Chatbots answer before you’ve finished thinking.',
  },
  {
    when: `${DELIVERY_DEFAULT} · Next morning`,
    title: 'Wake up to a letter.',
    body: 'One letter the next morning, in the voice you choose, with one question and one small step.',
    why: 'One step you’ll actually do beats ten tips.',
  },
  {
    when: 'Over weeks',
    title: 'Look back and grow.',
    body: 'Your Identity map and Growth page show the directions that keep showing up.',
    why: 'AI journals stop at insight; Beyond turns it into direction.',
  },
];

export const WHY_NOT = [
  { name: 'AI chatbots', gap: 'Answer before you’ve finished thinking, and forget you after.' },
  {
    name: 'Therapy and helplines',
    gap: 'Essential for serious needs, and Beyond points people there. Not built for everyday reflection.',
  },
  {
    name: 'Other AI journal apps',
    gap: 'Stop at insight. Beyond turns it into one step and a direction.',
  },
];

export const MEMORY_POINTS = [
  'Every memory shows its source',
  'Edit or forget any line: forgotten means gone',
  'Pause memory for a night or for good',
];

/* ------------------------------------------------------- 04 institutions */

export const INSTITUTIONS = [
  {
    big: 'Schools',
    title: 'Universities and secondary schools',
    body: 'A daily reflection habit for students facing big choices about subjects, JUPAS and who they want to be.',
  },
  {
    big: 'NGOs',
    title: 'Youth NGOs',
    body: 'A quiet place between sessions for the young people you already support.',
  },
  {
    big: 'Private',
    title: 'Entries stay personal',
    body: 'Institutions pay for access. They never see anyone’s entries, letters or memories.',
  },
];

export const CREDIT =
  'Made by Team Beyond for the HK Inter-University GenAI Hackathon for SDGs 2026 · ' +
  'SDG 3: Good health and well-being';
