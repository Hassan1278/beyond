import type { CSSProperties, ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { Close } from '../components/Icons';
import { mmss, tonight } from '../lib/date';
import { useActions } from '../state/store';

/** 22 bars, fixed heights, so the mock waveform never looks random. */
const BARS = Array.from({ length: 22 }, (_, i) => ({
  h: 18 + Math.round(Math.abs(Math.sin(i * 1.7)) * 60),
  d: (-i * 0.09).toFixed(2),
}));

export function Write({ state, live }: ScreenProps): ReactElement {
  const { dispatch, go } = useActions(live);

  return (
    <div className="v v-write">
      <div className="wt">
        <button type="button" className="ib" aria-label="Close entry" onClick={() => go('home')}>
          <Close />
        </button>
        <span className="k">{tonight()} &middot; 23:48</span>
        <span className="k timer">{mmss(state.secs)}</span>
      </div>

      <div className="seg dk">
        <button
          type="button"
          className={state.mode === 'text' ? 'sel' : ''}
          onClick={() => dispatch({ type: 'mode', mode: 'text' })}
        >
          Write
        </button>
        <button
          type="button"
          className={state.mode === 'voice' ? 'sel' : ''}
          onClick={() => dispatch({ type: 'mode', mode: 'voice' })}
        >
          Speak
        </button>
      </div>

      {state.mode === 'text' ? (
        <>
          <p className="prompt">What&rsquo;s actually on your mind?</p>
          <textarea
            className="area"
            aria-label="Tonight's entry"
            value={state.entry}
            readOnly={!live}
            tabIndex={live ? 0 : -1}
            onChange={(e) => dispatch({ type: 'entry', entry: e.target.value })}
          />
        </>
      ) : (
        <div className="voice">
          <div className="wave" aria-hidden="true">
            {BARS.map((b, i) => (
              <i key={i} style={{ '--h': `${b.h}px`, '--d': `${b.d}s` } as CSSProperties} />
            ))}
          </div>
          <p className="k" style={{ opacity: 0.8 }}>
            Recording &middot; 03:41
          </p>
          <p className="muted" style={{ maxWidth: '24ch' }}>
            Preview only. Nothing is being recorded.
          </p>
          <span className="rec" aria-hidden="true" />
        </div>
      )}

      <div className="wf">
        <p className="k c">No replies. Just you.</p>
        <button
          type="button"
          className="pb light"
          disabled={live && state.entry.trim().length < 10}
          onClick={() => dispatch({ type: 'seal' })}
        >
          Leave it for tonight
        </button>
        <button
          type="button"
          className="fine-btn"
          onClick={() => dispatch({ type: 'sheet', open: true })}
        >
          Encrypted &middot; see what&rsquo;s sent to the AI
        </button>
      </div>
    </div>
  );
}
