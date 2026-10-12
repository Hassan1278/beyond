/** The controls that make this a demo rather than a slide: branches, voices, live AI. */
import type { ReactElement } from 'react';
import type { ScreenMeta } from '../types';
import { VOICES } from '../data/content';
import { useBeyond } from '../state/store';

export function DemoControls({ screen }: { screen: ScreenMeta }): ReactElement {
  const { state, dispatch, go, generate, reset } = useBeyond();
  const onLetterPath = screen.id === 'write' || screen.id === 'sealed' || screen.id === 'letter';
  const aiReady = state.ai.available === true;

  return (
    <>
      {screen.id === 'write' && (
        <div className="demo-box">
          <p className="eyebrow">Demo controls</p>
          <p>
            Edit the entry on the phone, then seal it. An entry that sounds urgent goes to the
            safety check instead of Sealed.
          </p>
          <div className="row">
            <button type="button" className="chipbtn" onClick={() => go('safety')}>
              Show the safety check &rarr;
            </button>
          </div>
        </div>
      )}

      {screen.id === 'letter' && (
        <div className="demo-box">
          <p className="eyebrow">Demo controls &middot; letter voice</p>
          <div className="row">
            {VOICES.map((v) => (
              <button
                type="button"
                key={v.id}
                className="chipbtn"
                aria-pressed={state.voice === v.id}
                onClick={() => dispatch({ type: 'voice', voice: v.id })}
              >
                {v.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="chipbtn start"
            onClick={() => dispatch({ type: 'letter/reset' })}
          >
            Reset this letter
          </button>
        </div>
      )}

      {onLetterPath && (
        <div className="demo-box">
          <p className="eyebrow">Letter writer</p>
          <div className="row">
            <button
              type="button"
              className="chipbtn"
              aria-pressed={state.source === 'scripted'}
              onClick={() => dispatch({ type: 'source', source: 'scripted' })}
            >
              Scripted
            </button>
            <button
              type="button"
              className="chipbtn"
              aria-pressed={state.source === 'ai'}
              disabled={!aiReady}
              onClick={() => dispatch({ type: 'source', source: 'ai' })}
            >
              Live AI
            </button>
            {state.source === 'ai' && (
              <button
                type="button"
                className="chipbtn"
                disabled={state.ai.status === 'writing'}
                onClick={() => {
                  dispatch({ type: 'ai/clear' });
                  void generate();
                }}
              >
                {state.ai.status === 'writing' ? 'Writing…' : 'Rewrite now'}
              </button>
            )}
          </div>
          <p>
            {state.ai.available === null
              ? 'Checking whether this host can write live letters…'
              : aiReady
                ? state.source === 'ai'
                  ? `Claude writes the letter from the entry on the phone${
                      state.ai.model ? ` · ${state.ai.model}` : ''
                    }. The key stays on the server.`
                  : 'Live AI sends the entry and allowed context through this host to Anthropic. Review “What gets sent to AI” first and use fictional content.'
                : 'No ANTHROPIC_API_KEY on this host, so letters stay scripted. Set one on the deployment to enable live AI.'}
          </p>
          {state.ai.error && <p style={{ color: 'var(--dawn)' }}>{state.ai.error}</p>}
        </div>
      )}

      <div className="demo-box">
        <p className="eyebrow">Demo controls</p>
        <div className="row">
          <button
            type="button"
            className="chipbtn"
            onClick={() => {
              reset();
            }}
          >
            Restart the prototype
          </button>
        </div>
      </div>
    </>
  );
}
