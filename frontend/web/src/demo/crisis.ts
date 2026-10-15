/**
 * Decides whether an entry goes to the safety check instead of straight to
 * Sealed. A morning letter must never be the only thing standing between
 * someone and help they need tonight.
 *
 * This is a deliberately blunt keyword pass, standing in for the classifier the
 * real product would run. It is tuned to over-trigger rather than under-trigger:
 * the screen it leads to is a short list of real phone numbers plus a way back,
 * so a false positive costs one tap and a miss costs much more.
 */

const PHRASES = [
  'kill myself',
  'killing myself',
  'end my life',
  'end it all',
  'take my own life',
  'suicide',
  'suicidal',
  'want to die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'no point living',
  'no reason to live',
  'nothing left to live for',
  'self harm',
  'self-harm',
  'hurt myself',
  'hurting myself',
  'cut myself',
  "can't go on",
  'cannot go on',
  "don't want to be here",
  'do not want to be here',
  "can't do this anymore",
  'give up on everything',
];

export function needsSafetyCheck(entry: string): boolean {
  const text = entry.toLowerCase().replace(/[‘’]/g, "'");
  return PHRASES.some((p) => text.includes(p));
}
