import SAMPLE from '../journal/sample.json';
import { VOICE_NAMES } from '../copy/shared';
export type VoiceKey = keyof typeof VOICE_NAMES;
export const NIGHT = SAMPLE.find((s) => s.id === 'l_d13')!;

export const BODIES: Record<VoiceKey, string> = {
  mentor: NIGHT.content.body,
  friend: `Hey Kit,

Chem at 38 again, and a whole break listening to the two boys next to you compare scores and talk about needing top grades for medicine. Then, in bed, the question you couldn’t shake: do you actually want any of this, or is it just what everyone expects?

That’s a fair thing to wonder, and it doesn’t need an answer before your next test. Think about the best moments of your summer so far: a photo walk you almost skipped, a seat Wing saved for you, explaining titration so well that three people finally got it. None of those were about a score. Marks still matter, but the clues about what you want are coming from somewhere else.

Keep collecting them for a bit.

Talk soon,
Your friend`,
  future: `Hi Kit,

It’s you, a few years from now. I remember this day: 38 in chem again, two boys comparing scores beside you, and you lying in bed asking whether you want any of this or are just doing what everyone expects.

I won’t tell you how the DSE goes. But I’m glad you asked that question out loud, because the answer was already showing up in your summer: the photo walk you nearly skipped, Wing saving you a seat, the moment three classmates understood titration because of you. None of it was about a score.

Keep noticing those moments. They point somewhere.

With love,
You, later`,
  diary: `Kit,

Mock test: chem 38 again. Classmates compared scores and talked about needing top grades for medicine. At night: unsure whether the goal is yours or expected of you.

The moments that went well this summer were not about scores: a photo walk, a seat saved by Wing, explaining titration to three classmates.

Worth noticing where those moments come from before deciding anything.`,
};
