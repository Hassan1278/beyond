/**
 * The seven themes the journal keeps returning to, and the lines behind them.
 *
 * In the product these are not written by hand: the model reads each entry as
 * it is sealed, decides which themes it touches, and keeps one short line per
 * entry with its date. What ships here is one person's two years of that -
 * October 2024 to October 2026 - so the demo has a history to show on a stage
 * with no network. `api/themes.ts` does the real thing to whatever is typed
 * into the entry screen, and those lines land on top of these.
 *
 * `mentions` is every entry a theme appears in and sets the size of its
 * bubble. `lines` are the few the theme page quotes, newest last.
 */
import type { JournalLine, JournalTheme, ThemeExtract, ThemeId } from '../types';

export const THEMES: JournalTheme[] = [
  {
    id: 'behind',
    name: 'Feeling behind',
    tone: 'hard',
    dir: 'down',
    mentions: 14,
    summary:
      'Your most written-about theme, and the one that has faded most. It almost always ' +
      'follows an evening on your phone, and it has never once followed a day you made ' +
      'something.',
    lines: [
      { date: '2024-11-03', text: 'everyone from my year seems to be two steps ahead already' },
      { date: '2025-03-19', text: 'spent an hour comparing myself to people I have never met' },
      {
        date: '2025-09-27',
        text: 'behind on what though. nobody has ever told me the finish line',
      },
      { date: '2026-10-04', text: 'did not think about being behind once today. noticed that' },
    ],
  },
  {
    id: 'photography',
    name: 'Photography',
    tone: 'good',
    dir: 'up',
    mentions: 12,
    summary:
      'Started as an aside and became the thing you write about most warmly. It is the only ' +
      'theme that has never appeared in the same entry as feeling behind.',
    lines: [
      { date: '2025-02-08', text: 'borrowed a camera for the weekend, surprised how quiet it was' },
      { date: '2025-08-16', text: 'walked four hours for one photo and did not mind at all' },
      { date: '2026-05-30', text: 'first time someone asked to buy a print' },
      { date: '2026-10-06', text: 'the photo walk was the only part of this week that felt mine' },
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep',
    tone: 'hard',
    dir: 'down',
    mentions: 11,
    summary:
      'Mentioned in eleven entries, and worse in every one that also mentions your phone. ' +
      'It has improved steadily since the spring.',
    lines: [
      { date: '2024-10-26', text: 'sleep is still very bad, third night past two again' },
      { date: '2025-06-11', text: 'put the phone in the other room and got seven hours' },
      { date: '2026-02-23', text: 'tired but it is ordinary tired now, not the wired kind' },
      { date: '2026-09-12', text: 'sleep is constantly good now, I had stopped noticing' },
    ],
  },
  {
    id: 'internships',
    name: 'Internships',
    tone: 'hard',
    dir: 'down',
    mentions: 9,
    summary:
      'Nine entries, seven of them in application season. You have written twice that you are ' +
      'not sure you want the thing you were applying for.',
    lines: [
      {
        date: '2025-01-14',
        text: 'sent eleven applications and cannot name why I want any of them',
      },
      {
        date: '2025-10-22',
        text: 'three people posted offers today. I closed the app and reopened it',
      },
      { date: '2026-07-09', text: 'turned down the one I would have taken two years ago' },
    ],
  },
  {
    id: 'friends',
    name: 'Friends',
    tone: 'good',
    dir: 'up',
    mentions: 8,
    summary:
      'Rising since last autumn, and almost always on days you saw someone rather than ' +
      'messaged them.',
    lines: [
      { date: '2025-04-05', text: 'realised I had not seen anyone in person all week' },
      {
        date: '2026-01-17',
        text: 'two hours on a bench talking about nothing. best part of the month',
      },
      { date: '2026-09-28', text: 'cooked for four people and nobody took a photo of it' },
    ],
  },
  {
    id: 'money',
    name: 'Money',
    tone: 'hard',
    dir: 'up',
    mentions: 7,
    summary:
      'Newer than the rest and still growing. It arrives most often straight after an evening ' +
      'of watching other people spend theirs.',
    lines: [
      { date: '2025-11-30', text: 'watched a 22 year old explain his portfolio and felt poor' },
      {
        date: '2026-06-02',
        text: 'worked out what I actually need per month. it was less than I feared',
      },
      { date: '2026-10-01', text: 'said no to something I could afford and did not want' },
    ],
  },
  {
    id: 'running',
    name: 'Running',
    tone: 'good',
    dir: 'up',
    mentions: 5,
    summary: 'Five entries, all of them in the last four months, all of them good ones.',
    lines: [
      { date: '2026-06-21', text: 'ran without music and heard my own thinking for once' },
      { date: '2026-08-14', text: 'slow, ugly, finished it. counts' },
      { date: '2026-10-08', text: 'it is the one hour nobody can reach me' },
    ],
  },
];

export const themeById = (id: ThemeId): JournalTheme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Everything Beyond is still allowed to surface, biggest first. */
export const liveThemes = (popped: ThemeId[]): JournalTheme[] =>
  THEMES.filter((t) => !popped.includes(t.id)).sort((a, b) => b.mentions - a.mentions);

/**
 * A theme with whatever the model pulled out of this session's entry folded
 * in. The fresh lines go last and lift the mention count, so the bubble that
 * grows on stage is the one the entry was actually about.
 */
export function withExtract(t: JournalTheme, found: ThemeExtract[]): JournalTheme {
  const fresh = found.filter((f) => f.id === t.id).map((f) => f.line);
  if (!fresh.length) return t;
  return { ...t, mentions: t.mentions + fresh.length, lines: [...t.lines, ...fresh] };
}

/**
 * `2026-10-06` as `6 Oct 2026`. Parsed by hand to stay off the local timezone,
 * and tolerant of nonsense because the fresh lines arrive over the network: a
 * malformed date shows as itself rather than taking the screen down.
 */
export function showDate(iso: string): string {
  if (typeof iso !== 'string') return '';
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const [y, m, d] = iso.split('-');
  const month = MONTHS[Number(m) - 1];
  if (!month) return iso;
  return `${Number(d)} ${month} ${y}`;
}

export const newestFirst = (lines: JournalLine[]): JournalLine[] =>
  [...lines].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
