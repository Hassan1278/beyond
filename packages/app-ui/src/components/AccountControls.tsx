import { useState } from 'react';
import { useBeyond } from '../state/store';
import { voiceById } from '../data/content';
export function AccountControls() {
  const {
    state,
    dispatch,
    go,
    refresh,
    remember,
    exportData,
    signOut,
    deleteAccount,
    moreProducts,
    settingsChange,
  } = useBeyond();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [asking, setAsking] = useState<'data' | 'account' | null>(null);
  const [busy, setBusy] = useState(false);
  const product = state.product!;
  return (
    <div className="v pad account-controls">
      <h2>What Beyond remembers</h2>
      <p className="muted">Only memories you approve are saved in your account.</p>
      <button
        className="srow"
        type="button"
        role="switch"
        aria-checked={!state.paused}
        onClick={() => dispatch({ type: 'mem/pause' })}
      >
        <span>{state.paused ? 'Memory paused' : 'Memory on'}</span>
        <span className="track" />
      </button>
      {state.paused && (
        <p className="pmsg">
          Your memories remain private. They will stay out of future AI context until you turn
          memory back on.
        </p>
      )}
      <ul className="mem">
        {product.memories.length ? (
          product.memories.map((memory, index) => (
            <li key={memory.id}>
              <span>
                <b>{memory.text}</b>
                <small>You approved this memory</small>
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setText(memory.text);
                    setEditing(memory.id);
                    setAdding(true);
                  }}
                >
                  Correct
                </button>
                <button type="button" onClick={() => dispatch({ type: 'mem/forget', index })}>
                  Forget
                </button>
              </div>
            </li>
          ))
        ) : (
          <li>
            <span className="empty">Nothing remembered.</span>
          </li>
        )}
      </ul>
      {product.memoryCursor && (
        <button className="pb line sm" type="button" onClick={() => void moreProducts('memories')}>
          Load more memories
        </button>
      )}
      {adding ? (
        <form
          className="fixbox"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void remember(text, editing)
              .then((saved) => {
                if (saved) {
                  setText('');
                  setEditing(undefined);
                  setAdding(false);
                }
              })
              .finally(() => {
                setBusy(false);
              });
          }}
        >
          <label className="k" htmlFor="approvedMemory">
            Memory you explicitly approve
          </label>
          <textarea
            id="approvedMemory"
            value={text}
            maxLength={2000}
            required
            onChange={(event) => setText(event.target.value)}
          />
          <div className="row">
            <button className="pb dark sm" type="submit" disabled={busy || !text.trim()}>
              Approve memory
            </button>
            <button
              className="pb line sm"
              type="button"
              onClick={() => {
                setAdding(false);
                setText('');
                setEditing(undefined);
              }}
            >
              Close
            </button>
          </div>
        </form>
      ) : (
        <button
          className="pb line sm"
          type="button"
          onClick={() => {
            setAdding(true);
            setText('');
            setEditing(undefined);
          }}
        >
          Add a memory
        </button>
      )}
      <p className="k">Settings</p>
      <div className="set">
        <button type="button" onClick={() => go('voice')}>
          <span>Letter voice</span>
          <em>{voiceById(state.voice).name} ›</em>
        </button>
        <button type="button" onClick={() => go('voice')}>
          <span>Letter time</span>
          <em>{state.time} ›</em>
        </button>
        <button type="button" disabled>
          <span>
            Letter writer<small>Consent is requested for each entry.</small>
          </span>
          <em>{product.account?.capabilities.reflections ? 'Available' : 'Not connected'}</em>
        </button>
        <button type="button" onClick={() => dispatch({ type: 'sheet', open: true })}>
          <span>What is saved</span>
          <em>›</em>
        </button>
        <button type="button" onClick={() => void refresh()}>
          <span>Reload my data</span>
          <em>›</em>
        </button>
        <button
          type="button"
          onClick={() => {
            go('welcome');
            dispatch({ type: 'auth/open' });
            dispatch({ type: 'auth/mode', mode: 'signin' });
          }}
        >
          <span>Sign in again for private actions</span>
          <em>›</em>
        </button>
        <button type="button" onClick={() => void exportData()}>
          <span>
            Export my data
            <small>Recent sign-in required. Downloads are your own private copies.</small>
          </span>
          <em>›</em>
        </button>
        <button type="button" onClick={() => void signOut()}>
          <span>Sign out</span>
          <em>›</em>
        </button>
        <button className="danger" type="button" onClick={() => setAsking('data')}>
          <span>Delete saved content</span>
        </button>
        <button
          className="danger"
          type="button"
          disabled={!product.account?.capabilities.account_deletion}
          onClick={() => setAsking('account')}
        >
          <span>
            Delete account
            <small>
              {product.account?.capabilities.account_deletion
                ? 'Permanent account and data cleanup.'
                : 'Account cleanup is not configured on this host.'}
            </small>
          </span>
        </button>
        {asking && (
          <div className="confirm">
            <p>
              {asking === 'account'
                ? 'Permanently delete your account and all its content?'
                : 'Delete all saved entries, approved memories and todos, and reset your preferences? Your account stays open.'}{' '}
              This cannot be undone.
            </p>
            <div className="row">
              <button
                className="pb danger sm"
                type="button"
                onClick={() => {
                  if (asking === 'account') void deleteAccount();
                  else dispatch({ type: 'del/confirm' });
                  setAsking(null);
                }}
              >
                Confirm deletion
              </button>
              <button className="pb line sm" type="button" onClick={() => setAsking(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <label className="k">
        Timezone
        <input
          aria-label="Timezone"
          defaultValue={product.settings?.timezone}
          onBlur={(event) => {
            if (event.target.value !== product.settings?.timezone)
              void settingsChange({ timezone: event.target.value });
          }}
        />
      </label>
    </div>
  );
}
