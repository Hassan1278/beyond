/** "What gets sent to the AI" - the plain list, opened from the entry screen. */
import type { ReactElement } from 'react';
import type { BeyondState } from '../types';
import { tonight, morning } from '../lib/date';

export function Sheet({
  state,
  onClose,
}: {
  state: BeyondState;
  onClose: () => void;
}): ReactElement {
  const kept = state.paused ? 0 : state.mems.length;
  if (state.product)
    return (
      <div
        className="sheet-bg"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="sheet" role="dialog" aria-label="Private storage">
          <span className="grab" />
          <h3>What is saved</h3>
          <p>
            Your entries, approved memories, todos and preferences are saved in your private account
            through the product API.
          </p>
          <p>No text is sent to AI. AI processing and voice transcription are not connected yet.</p>
          <p>
            Journal text stays in memory in this app; it is not saved in browser storage. Your
            signed-in session is stored separately.
          </p>
          <button type="button" className="pb dark" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    );
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
        <p className="k">
          {state.source === 'ai'
            ? 'Live AI sends this through the host to the independent AI service'
            : 'Scripted mode sends no entry to AI'}
        </p>
        <ul>
          <li className="yes">
            <i>&#10003;</i>Tonight&rsquo;s entry
          </li>
          <li className="yes">
            <i>&#10003;</i>Memories you&rsquo;ve kept ({kept})
          </li>
          <li className="yes">
            <i>&#10003;</i>Your correction{' '}
            {state.paused ? '(paused)' : state.correction ? '(included)' : '(none)'}
          </li>
          <li className="yes">
            <i>&#10003;</i>Your letter voice, date labels and chosen time
          </li>
          <li className="yes">
            <i>&#10003;</i>Themes you asked the letter not to raise ({state.popped.length})
          </li>
        </ul>
        <details>
          <summary>Review the text and context</summary>
          <p>{state.entry || 'No entry yet.'}</p>
          {!state.paused && state.mems.map((m) => <p key={m.t}>{m.t}</p>)}
          {!state.paused && state.correction && <p>{state.correction}</p>}
          <p>
            {state.voice} &middot; {tonight()} &rarr; {morning()} &middot; {state.time}
          </p>
        </details>
        <p>
          Pausing memory still sends tonight&rsquo;s entry in live mode. Names, contacts and
          locations typed here are not redacted. Browser storage is not encrypted. When memory is
          on, the same entry also goes to the demo theme reader, with the names of the fictional
          sample themes. Memory pause disables that extra request.
        </p>
        <button type="button" className="pb dark" onClick={onClose} style={{ marginTop: 6 }}>
          Got it
        </button>
      </div>
    </div>
  );
}
