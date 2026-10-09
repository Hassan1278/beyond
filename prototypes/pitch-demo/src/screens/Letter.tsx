/** The morning letter: what you said, what keeps coming back, one small step. */
import { useEffect, type ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { SCRIPTED_LETTERS, voiceById } from '../data/content';
import { morning, tonight } from '../lib/date';
import { useActions } from '../state/store';

export function Letter({ state, live }: ScreenProps): ReactElement {
  const { dispatch, generate } = useActions(live);
  const voice = voiceById(state.voice);
  const wantsAi = state.source === 'ai';
  const status = state.ai.status;

  // Switching voice clears the letter, so in live mode write the new one.
  useEffect(() => {
    if (live && wantsAi && status === 'idle') void generate();
  }, [live, wantsAi, status, generate]);

  const fromAi = wantsAi && status === 'ready' && state.ai.letter !== null;
  const letter = fromAi ? state.ai.letter! : SCRIPTED_LETTERS[state.voice];
  // The plain diary voice dates its summary instead of greeting you.
  const greet = state.voice === 'diary' && !fromAi ? `${tonight()}, ${letter.greet}` : letter.greet;

  return (
    <div className="v pad v-letter">
      <div>
        <p className="k">
          {morning()} &middot; {state.time}
        </p>
        <p className="from">{voice.from}</p>
      </div>

      <div className="lb">
        {greet && <p className="greet">{greet}</p>}
        <p>{letter.said}</p>
        {letter.rec && <p>{letter.rec}</p>}
        {letter.sign && <p className="sign">{letter.sign}</p>}
      </div>

      {wantsAi && status === 'writing' ? (
        <p className="src" aria-live="polite">
          <span className="dot" style={{ background: 'var(--dawn)' }} />
          Writing this letter from your entry…
        </p>
      ) : fromAi ? (
        <p className="src">
          <span className="dot" />
          Written for this entry by <b>{state.ai.model ?? 'Claude'}</b>
          {state.ai.ms ? ` · ${(state.ai.ms / 1000).toFixed(1)}s` : ''}
        </p>
      ) : null}

      <p className="k">Coming back</p>
      <div className="chips">
        <span>Feeling behind &middot; 3 nights</span>
        <span>Photography &middot; 2 entries</span>
      </div>

      <div className="stepc">
        <p className="k" style={{ opacity: 0.7 }}>
          One small step
        </p>
        <p className="sw">{letter.step}</p>
        {state.step ? (
          <p className="note">
            {state.step === 'try'
              ? 'Added to today. No reminders unless you ask.'
              : 'Okay. Tomorrow’s letter will suggest something else.'}
          </p>
        ) : (
          <div className="row">
            <button
              type="button"
              className="pb light sm"
              onClick={() => dispatch({ type: 'step', step: 'try' })}
            >
              I&rsquo;ll try it
            </button>
            <button
              type="button"
              className="pb ghost sm"
              onClick={() => dispatch({ type: 'step', step: 'skip' })}
            >
              Not for me
            </button>
          </div>
        )}
      </div>

      {state.fixed ? (
        <p className="ok-note">Thanks. Your correction will shape the next letter.</p>
      ) : state.fixOpen ? (
        <div className="fixbox">
          <label className="k" htmlFor="fixText">
            What did Beyond get wrong?
          </label>
          <textarea
            id="fixText"
            value={state.fixText}
            readOnly={!live}
            tabIndex={live ? 0 : -1}
            placeholder="e.g. I'm not into photography, I just liked being outside."
            onChange={(e) => dispatch({ type: 'fix/text', text: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pb dark sm"
              onClick={() => dispatch({ type: 'fix/send' })}
            >
              Send correction
            </button>
            <button
              type="button"
              className="pb line sm"
              onClick={() => dispatch({ type: 'fix/cancel' })}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="linkish" onClick={() => dispatch({ type: 'fix/open' })}>
          Something&rsquo;s off? Correct it
        </button>
      )}
    </div>
  );
}
