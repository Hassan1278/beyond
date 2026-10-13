/**
 * The hero. The noise is real: every word is a button, and quieting them is the
 * argument the rest of the site makes in prose.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

interface Word {
  text: string;
  style: CSSProperties;
  small?: boolean;
}

/** The words carry CSS custom properties, which CSSProperties does not model. */
const css = (o: Record<string, string>): CSSProperties => o as CSSProperties;

const WORDS: Word[] = [
  { text: 'INTERNSHIP', style: css({ top: '13%', left: '6%', '--s': '56px', '--r': '-8deg' }) },
  { text: 'SUCCESS', style: css({ top: '19%', right: '7%', '--s': '30px', '--dl': '-2s' }) },
  { text: 'PRODUCTIVITY', style: css({ bottom: '21%', left: '5%', '--s': '34px', '--dl': '-1s' }) },
  {
    text: 'FITNESS',
    style: css({ bottom: '11%', right: '9%', '--s': '58px', '--r': '8deg', '--dl': '-3s' }),
  },
  {
    text: 'STARTUP',
    style: css({ top: '42%', left: '4%', '--s': '22px', '--dl': '-4s' }),
    small: true,
  },
  {
    text: 'EVERYONE IS AHEAD',
    style: css({ top: '50%', right: '4%', '--s': '26px', '--dl': '-2.5s' }),
    small: true,
  },
  {
    text: '5AM ROUTINE',
    style: css({ top: '10%', left: '42%', '--s': '18px', '--dl': '-1.5s' }),
    small: true,
  },
  {
    text: 'SIDE HUSTLE',
    style: css({ top: '31%', left: '3%', '--s': '20px', '--r': '4deg', '--dl': '-3.5s' }),
    small: true,
  },
  {
    text: 'DREAM JOB',
    style: css({ top: '31%', right: '5%', '--s': '38px', '--r': '6deg', '--dl': '-.5s' }),
    small: true,
  },
  {
    text: "YOU'RE BEHIND",
    style: css({ bottom: '33%', right: '6%', '--s': '20px', '--dl': '-5s' }),
    small: true,
  },
  {
    text: 'PASSIVE INCOME',
    style: css({ bottom: '6%', left: '27%', '--s': '22px', '--r': '-3deg', '--dl': '-2s' }),
  },
  { text: 'GLOW UP', style: css({ bottom: '12%', left: '6%', '--s': '28px', '--dl': '-4s' }) },
  {
    text: 'STUDY WITH ME',
    style: css({ top: '15%', right: '30%', '--s': '16px', '--dl': '-1s' }),
    small: true,
  },
  {
    text: '10X YOUR LIFE',
    style: css({ bottom: '7%', right: '36%', '--s': '18px', '--r': '5deg', '--dl': '-3s' }),
    small: true,
  },
];

export function NoiseHero(): ReactElement {
  const [gone, setGone] = useState<string[]>([]);
  const [quiet, setQuiet] = useState(false);

  const allQuiet = quiet || gone.length === WORDS.length;
  const hint = allQuiet
    ? 'Quiet. Now, what’s actually on your mind?'
    : gone.length
      ? `${gone.length} of ${WORDS.length} quieted`
      : 'Click any word to quiet it';

  return (
    <header className={`hero night${quiet ? ' quiet' : ''}`}>
      <div className="noise">
        {WORDS.map((w) => (
          <button
            type="button"
            key={w.text}
            className={`word${w.small ? ' m-hide' : ''}${gone.includes(w.text) ? ' gone' : ''}`}
            style={w.style}
            aria-label={`Quiet "${w.text}"`}
            onClick={() => setGone((g) => (g.includes(w.text) ? g : [...g, w.text]))}
          >
            {w.text}
          </button>
        ))}
      </div>

      <div className="center">
        <p className="eyebrow">The Great Distraction</p>
        <h1>Everyone is telling you who to become.</h1>
        <p className="lede">
          Beyond gives you a space to step away from the noise, understand your own thoughts, and
          decide what actually matters.
        </p>
        <div className="ctas" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-light" onClick={() => setQuiet(true)}>
            Step beyond the noise &rarr;
          </button>
        </div>
      </div>

      <p className="hint" aria-live="polite">
        {hint}
      </p>
    </header>
  );
}
