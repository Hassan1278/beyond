/**
 * The feed.
 *
 * Every handle, face and number here is invented. The point is made by the
 * captions and the counts, not by photographs of real people: putting real
 * someones on a page that calls them a social ill would be both a licensing
 * problem and a dishonest one. The art is drawn in `FeedArt.tsx`.
 *
 * The pressure is not one genre. Muscle, money and 4am were only ever half of
 * it, so the wall also carries the version aimed at young women - the routine
 * to start before you turn 25, the morning nobody could actually keep up, the
 * milestone reached on time - which sells the same shortfall in a softer
 * voice. Spread through the list rather than grouped, because that is how it
 * arrives: mixed in with everything else.
 */

export type ArtKind =
  | 'torso'
  | 'cash'
  | 'watch'
  | 'car'
  | 'chart'
  | 'mirror'
  | 'meal'
  | 'desk'
  | 'trophy'
  | 'beach'
  | 'glow'
  | 'mat'
  | 'ring';

export interface Post {
  handle: string;
  caption: string;
  /** Engagement, already formatted. The number is the part that stings. */
  metric: string;
  art: ArtKind;
  /**
   * Two stops for the backdrop gradient, as CSS colours. They are written as
   * mixes of palette tokens rather than fixed hexes so the wall - the biggest
   * block of colour on the page - moves with the theme. Each post keeps its
   * own warmth and weight; only the palette underneath it changes.
   */
  grad: [string, string];
  sponsored?: boolean;
}

export const FEED: Post[] = [
  {
    handle: 'aidan.lifts',
    caption: '5% body fat at 19. No excuses left.',
    metric: '412K',
    art: 'torso',
    grad: ['color-mix(in srgb, var(--g4) 60%, var(--night))', 'var(--g1)'],
  },
  {
    handle: 'mayabuilds',
    caption: 'Dropped out at 20. $180k/mo. Ask me anything.',
    metric: '2.1M',
    art: 'cash',
    grad: ['color-mix(in srgb, var(--dusk) 50%, var(--night))', 'var(--night-2)'],
    sponsored: true,
  },
  {
    handle: 'skin.by.neve',
    caption: 'My 11-step routine. Start before 25 or it is already too late.',
    metric: '1.4M',
    art: 'glow',
    grad: ['color-mix(in srgb, var(--dawn) 26%, var(--night))', 'var(--night-2)'],
    sponsored: true,
  },
  {
    handle: 'the.focused.few',
    caption: '4:30am. While you were asleep.',
    metric: '89K',
    art: 'desk',
    grad: ['color-mix(in srgb, var(--g3) 72%, var(--night))', 'var(--night)'],
  },
  {
    handle: 'claraglow',
    caption: 'What I eat in a day — 1,200 calories.',
    metric: '1.2M',
    art: 'meal',
    grad: ['color-mix(in srgb, var(--g4) 70%, var(--dawn))', 'var(--g1)'],
  },
  {
    handle: 'dev.ascend',
    caption: 'Three offers before finals. Resume in bio.',
    metric: '340K',
    art: 'chart',
    grad: ['color-mix(in srgb, var(--g2) 80%, var(--moon))', 'var(--night)'],
  },
  {
    handle: 'grind.szn',
    caption: 'Your twenties are supposed to hurt.',
    metric: '756K',
    art: 'trophy',
    grad: ['color-mix(in srgb, var(--dawn) 34%, var(--night))', 'var(--g1)'],
  },
  {
    handle: 'that.girl.era',
    caption: '5am. Pilates, matcha, journal, before anyone else is awake.',
    metric: '668K',
    art: 'mat',
    grad: ['color-mix(in srgb, var(--g3) 66%, var(--moon))', 'var(--g1)'],
  },
  {
    handle: 'elena.studies',
    caption: '14 hours of revision. Day 61 of 100.',
    metric: '203K',
    art: 'mirror',
    grad: ['color-mix(in srgb, var(--g4) 52%, var(--g1))', 'var(--night-2)'],
  },
  {
    handle: 'firstclass.only',
    caption: 'Bought it at 22. Keep going.',
    metric: '1.8M',
    art: 'car',
    grad: ['color-mix(in srgb, var(--warm) 26%, var(--night))', 'var(--night)'],
    sponsored: true,
  },
  {
    handle: 'summer.unreal',
    caption: 'Third country this month. Remote life hits different.',
    metric: '934K',
    art: 'beach',
    grad: ['color-mix(in srgb, var(--dusk) 40%, var(--g2))', 'var(--night)'],
  },
  {
    handle: 'ella.andjames',
    caption: 'He proposed. 23, and everything is finally falling into place.',
    metric: '2.4M',
    art: 'ring',
    grad: ['color-mix(in srgb, var(--warm) 22%, var(--night))', 'var(--night-3)'],
  },
  {
    handle: 'minuteman.hustle',
    caption: 'If you are not up at 5, you do not want it.',
    metric: '627K',
    art: 'watch',
    grad: ['color-mix(in srgb, var(--g3) 64%, var(--night-3))', 'var(--g1)'],
  },
];
