import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { voiceById } from '../data/content';
import { useActions } from '../state/store';

export function MemorySettings({ state, live }: ScreenProps): ReactElement {
  const { dispatch, go, reset } = useActions(live);
  const voice = voiceById(state.voice);
  const aiReady = state.ai.available === true;

  return (
    <div className="v pad">
      <h2>What Beyond remembers</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Sample memories, saved in this browser without encryption. Use fictional content.
      </p>

      <button
        type="button"
        className="srow"
        role="switch"
        aria-checked={!state.paused}
        onClick={() => dispatch({ type: 'mem/pause' })}
      >
        <span>{state.paused ? 'Memory paused' : 'Memory on'}</span>
        <span className="track" />
      </button>
      {state.paused && (
        <p className="pmsg">
          Kept memories and corrections stay out of live requests. Tonight&rsquo;s entry is still
          sent.
        </p>
      )}

      <ul className={`mem${state.paused ? ' paused' : ''}`}>
        {state.mems.length ? (
          state.mems.map((m, i) => (
            <li key={m.t}>
              <span>
                <b>{m.t}</b>
                <small>{m.s}</small>
              </span>
              <button type="button" onClick={() => dispatch({ type: 'mem/forget', index: i })}>
                Forget
              </button>
            </li>
          ))
        ) : (
          <li>
            <span className="empty">
              {state.deleted
                ? 'Everything was deleted (demo).'
                : 'Nothing remembered. Letters will use each night’s entry only.'}
            </span>
          </li>
        )}
      </ul>

      <p className="k">Settings</p>
      <div className="set">
        <button type="button" onClick={() => go('voice')}>
          <span>Letter voice</span>
          <em>{voice.name} &rsaquo;</em>
        </button>
        <button type="button" onClick={() => go('voice')}>
          <span>Letter time</span>
          <em>{state.time} &rsaquo;</em>
        </button>
        <button
          type="button"
          disabled={!aiReady && state.source === 'scripted'}
          onClick={() =>
            dispatch({ type: 'source', source: state.source === 'ai' ? 'scripted' : 'ai' })
          }
        >
          <span>
            Letter writer
            <small>
              {state.source === 'ai'
                ? 'Your entry is sent through this host to Anthropic'
                : aiReady
                  ? 'Enable live AI to send your entry and allowed context to Anthropic.'
                  : 'Fixed demo letters. No AI key on this host.'}
            </small>
          </span>
          <em>{state.source === 'ai' ? 'Live AI ›' : 'Scripted ›'}</em>
        </button>
        <button type="button" onClick={() => dispatch({ type: 'sheet', open: true })}>
          <span>What gets sent to AI</span>
          <em>&rsaquo;</em>
        </button>
        <button type="button" onClick={reset}>
          <span>Restart this demo</span>
          <em>&rsaquo;</em>
        </button>
        {state.delAsk ? (
          <div className="confirm">
            <p>
              Clear this browser&rsquo;s entry, letter, correction and memories? Data already sent
              to live AI cannot be recalled.
            </p>
            <div className="row">
              <button
                type="button"
                className="pb danger sm"
                onClick={() => dispatch({ type: 'del/confirm' })}
              >
                Delete everything
              </button>
              <button
                type="button"
                className="pb line sm"
                onClick={() => dispatch({ type: 'del/cancel' })}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="danger" onClick={() => dispatch({ type: 'del/ask' })}>
            <span>Delete everything</span>
          </button>
        )}
      </div>
    </div>
  );
}
