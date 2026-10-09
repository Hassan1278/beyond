import type { ReactElement } from 'react';
import type { LetterTime } from '../types';
import type { ScreenProps } from '../components/Phone';
import { VOICES } from '../data/content';
import { useActions } from '../state/store';

const TIMES: LetterTime[] = ['07:00', '07:30', '08:00'];

export function VoicePick({ state, live }: ScreenProps): ReactElement {
  const { dispatch, go } = useActions(live);
  return (
    <div className="v pad">
      <p className="k">Set up &middot; your letters</p>
      <h2>Who should write your letters?</h2>
      <p className="muted">You can change this anytime.</p>
      <div className="opts">
        {VOICES.map((v) => (
          <button
            type="button"
            key={v.id}
            className={`opt${state.voice === v.id ? ' sel' : ''}`}
            aria-pressed={state.voice === v.id}
            onClick={() => dispatch({ type: 'voice', voice: v.id })}
          >
            <span>
              <b>{v.name}</b>
              <small>{v.desc}</small>
            </span>
            <i className="radio" />
          </button>
        ))}
      </div>
      <p className="k" style={{ marginTop: 4 }}>
        Letter arrives at
      </p>
      <div className="seg">
        {TIMES.map((t) => (
          <button
            type="button"
            key={t}
            className={state.time === t ? 'sel' : ''}
            onClick={() => dispatch({ type: 'time', time: t })}
          >
            {t}
          </button>
        ))}
      </div>
      <button type="button" className="pb dark mt-auto" onClick={() => go('home')}>
        Continue
      </button>
    </div>
  );
}
