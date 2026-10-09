/**
 * Live dates, so the demo reads as tonight and tomorrow morning rather than a
 * frozen Thursday in October. Format matches the design: "Thu 8 Oct".
 */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const shortDate = (d: Date): string =>
  `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

/** The night the entry is written. */
export const tonight = (): string => shortDate(new Date());

/** The morning the letter arrives. */
export const morning = (): string => shortDate(addDays(new Date(), 1));

/** "October so far", for the patterns header. */
export const monthSoFar = (): string =>
  `${
    [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][new Date().getMonth()]
  } so far`;

/** Month name of the frame that is still being written, for the Life Film note. */
export const nextMonthFirst = (): string => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${MONTHS[d.getMonth()]}’s frame is finished on 1 ${MONTHS[first.getMonth()]}.`;
};

export const mmss = (secs: number): string =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
