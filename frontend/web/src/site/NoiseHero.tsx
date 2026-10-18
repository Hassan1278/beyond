/**
 * The hero. The noise is real: every word is a button, and quieting them is the
 * argument the rest of the site makes in prose.
 */
import { useCopy } from './copy';
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
  const t = useCopy();
  const [quiet, setQuiet] = useState(false);
  return (
    <header className={`hero night noise-experience${quiet ? ' is-quiet' : ''}`}>
      <div className="noise" aria-hidden="true">
        {WORDS.map((w, i) => (
          <span
            key={w.text}
            className={`word${w.small ? ' m-hide' : ''}`}
            style={
              {
                ...w.style,
                '--fly-x': `${i % 2 ? 1 : -1}00vw`,
                '--fly-y': `${i % 3 === 0 ? -1 : 1}00vh`,
                '--fly-delay': `${i * 12}ms`,
              } as CSSProperties
            }
          >
            {t(w.text)}
          </span>
        ))}
      </div>
      <div className="quiet-wave" aria-hidden="true" />
      {!quiet && (
        <button
          type="button"
          className="quiet-trigger"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setQuiet(true)}
        />
      )}
      <div className="center" key={quiet ? 'quiet' : 'noise'}>
        <p className="eyebrow">beyond.</p>
        <h1>
          {t(quiet ? 'Now you can hear yourself.' : 'Everyone is telling you who to become.')}
        </h1>
        <p className="lede">
          {t(
            quiet
              ? 'No one telling you who to be. Just a little space to find out.'
              : 'Beyond gives you a space to step away from the noise, understand your own thoughts, and decide what actually matters.',
          )}
        </p>
        {!quiet && (
          <button type="button" className="quiet-cta" onClick={() => setQuiet(true)}>
            <span aria-hidden="true">✧</span> {t('Remove all noise')}
          </button>
        )}
        {quiet && (
          <button className="quiet-replay" onClick={() => setQuiet(false)}>
            {t('Bring the noise back')}
          </button>
        )}
      </div>
      <p className="hint" aria-live="polite">
        {t(quiet ? 'Quiet. Take a breath.' : 'Click anywhere to quiet the noise')}
      </p>
    </header>
  );
}
