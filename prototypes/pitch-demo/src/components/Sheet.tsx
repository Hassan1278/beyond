/** "What gets sent to the AI" - the plain list, opened from the entry screen. */
import type { ReactElement } from 'react';
import type { BeyondState } from '../types';

export function Sheet({
  state,
  onClose,
}: {
  state: BeyondState;
  onClose: () => void;
}): ReactElement {
  const kept = state.paused ? 0 : state.mems.length;
  return (
    <div
      className="sheet-bg"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-label="What gets sent to AI">
        <span className="grab" />
        <h3>What gets sent to the AI</h3>
        <p className="k">To write tomorrow&rsquo;s letter</p>
        <ul>
          <li className="yes">
            <i>&#10003;</i>Tonight&rsquo;s entry
          </li>
          <li className="yes">
            <i>&#10003;</i>Memories you&rsquo;ve kept ({kept})
          </li>
          <li className="yes">
            <i>&#10003;</i>Short snippets from past entries, only when relevant
          </li>
          <li className="yes">
            <i>&#10003;</i>Your letter voice
          </li>
        </ul>
        <p className="k">Never sent</p>
        <ul>
          <li className="no">
            <i>&#10005;</i>Your name, email or contact details
          </li>
          <li className="no">
            <i>&#10005;</i>Anything you&rsquo;ve forgotten
          </li>
          <li className="no">
            <i>&#10005;</i>Your location
          </li>
        </ul>
        <button type="button" className="pb dark" onClick={onClose} style={{ marginTop: 6 }}>
          Got it
        </button>
      </div>
    </div>
  );
}
