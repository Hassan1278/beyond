/**
 * The feed.
 *
 * Every handle, face and number here is invented. The point is made by the
 * captions and the counts, not by photographs of real people: putting real
 * someones on a page that calls them a social ill would be both a licensing
 * problem and a dishonest one. The art is drawn in `FeedArt.tsx`.
 */

export type ArtKind =
  'torso' | 'cash' | 'watch' | 'car' | 'chart' | 'mirror' | 'meal' | 'desk' | 'trophy' | 'beach';

export interface Post {
  handle: string;
  caption: string;
  /** Engagement, already formatted. The number is the part that stings. */
  metric: string;
  art: ArtKind;
  /** Two stops for the backdrop gradient. */
  grad: [string, string];
  sponsored?: boolean;
}

export const FEED: Post[] = [
  {
    handle: 'aidan.lifts',
    caption: '5% body fat at 19. No excuses left.',
    metric: '412K',
    art: 'torso',
    grad: ['#2d3340', '#12141a'],
  },
  {
    handle: 'mayabuilds',
    caption: 'Dropped out at 20. $180k/mo. Ask me anything.',
    metric: '2.1M',
    art: 'cash',
    grad: ['#3b4258', '#171a24'],
    sponsored: true,
  },
  {
    handle: 'the.focused.few',
    caption: '4:30am. While you were asleep.',
    metric: '89K',
    art: 'desk',
    grad: ['#243040', '#101419'],
  },
  {
    handle: 'claraglow',
    caption: 'What I eat in a day — 1,200 calories.',
    metric: '1.2M',
    art: 'meal',
    grad: ['#4a3f4e', '#1b1820'],
  },
  {
    handle: 'dev.ascend',
    caption: 'Three offers before finals. Resume in bio.',
    metric: '340K',
    art: 'chart',
    grad: ['#2a3a46', '#11161b'],
  },
  {
    handle: 'grind.szn',
    caption: 'Your twenties are supposed to hurt.',
    metric: '756K',
    art: 'trophy',
    grad: ['#4a4030', '#1c1812'],
  },
  {
    handle: 'elena.studies',
    caption: '14 hours of revision. Day 61 of 100.',
    metric: '203K',
    art: 'mirror',
    grad: ['#363b4c', '#15171f'],
  },
  {
    handle: 'firstclass.only',
    caption: 'Bought it at 22. Keep going.',
    metric: '1.8M',
    art: 'car',
    grad: ['#3f3a35', '#161414'],
    sponsored: true,
  },
  {
    handle: 'summer.unreal',
    caption: 'Third country this month. Remote life hits different.',
    metric: '934K',
    art: 'beach',
    grad: ['#2f4450', '#11191e'],
  },
  {
    handle: 'minuteman.hustle',
    caption: 'If you are not up at 5, you do not want it.',
    metric: '627K',
    art: 'watch',
    grad: ['#33384a', '#14161d'],
  },
];
