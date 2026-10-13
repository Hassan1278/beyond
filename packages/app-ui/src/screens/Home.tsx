import { useState, type CSSProperties, type ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { BubbleMap } from '../components/BubbleMap';
import { voiceById, WRAPPED } from '../data/content';
import { liveThemes, themeById, withExtract } from '../data/themes';
import { tonight } from '../lib/date';
import { useActions } from '../state/store';
import { Todos } from '../components/Todos';

const LIST = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/**
 * Home.
 *
 * Four things, in the order they matter: write something, what you keep coming
 * back to, the letter waiting for you, and the quarter so far. The theme map
 * replaced a row of flat chips - the same information, but the sizes carry the
 * weight, and you can do something about what you see.
 */
export function Home({ state, live }: ScreenProps): ReactElement {
  const { go, dispatch, edit, remove, more } = useActions(live);
  const [asking, setAsking] = useState<string | null>(null);
  if (state.product)
    return (
      <div className="v pad">
        <div>
          <p className="k">{tonight()}</p>
          <h2 style={{ marginTop: 6 }}>Good evening.</h2>
        </div>
        <div className="tonight">
          <p className="k">New entry</p>
          <h3>What&rsquo;s actually on your mind?</h3>
          <p>5–10 minutes, any time of day. Nothing replies.</p>
          <button type="button" className="pb light" onClick={() => edit(null)}>
            Start an entry
          </button>
        </div>
        <p className="k">Your journal</p>
        <div className="entry-list">
          {state.product.entries.length ? (
            state.product.entries.map((entry) => (
              <div key={entry.id}>
                <button className="last" type="button" onClick={() => edit(entry)}>
                  <span className="k">{new Date(entry.created_at).toLocaleDateString()}</span>
                  <b>
                    {entry.text.slice(0, 140)}
                    {entry.text.length > 140 ? '…' : ''}
                  </b>
                  <span className="go">Read or edit →</span>
                </button>
                {asking === entry.id ? (
                  <div className="entry-actions">
                    <button
                      className="fine-btn"
                      type="button"
                      onClick={() => {
                        setAsking(null);
                        void remove(entry);
                      }}
                    >
                      Confirm delete
                    </button>
                    <button className="fine-btn" type="button" onClick={() => setAsking(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="fine-btn" type="button" onClick={() => setAsking(entry.id)}>
                    Delete entry
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="fine">No entries yet. Your journal starts with what you write.</p>
          )}
        </div>
        {state.product.nextCursor && (
          <button className="pb line sm" type="button" onClick={() => void more()}>
            Load older entries
          </button>
        )}
        <Todos />
        <p className="k">Coming back</p>
        <div className="map-empty">No themes yet.</div>
        <button className="last" type="button" onClick={() => go('letter')}>
          <span className="k">Letters</span>
          <b>{state.product.reflections.length ? 'Read your latest letter' : 'No letter yet'}</b>
          <span className="go">Read →</span>
        </button>
        <p className="k">This quarter, so far</p>
        <div className="map-empty">Quarterly Wrapped will appear when analysis is connected.</div>
      </div>
    );
  const voice = voiceById(state.voice);
  const themes = liveThemes(state.popped).map((t) => withExtract(t, state.extract.found));
  const open = WRAPPED.find((w) => w.open) ?? WRAPPED[WRAPPED.length - 1];

  // What the model did with the entry, said once and plainly. Silent when it
  // found nothing or could not run: a map that quietly keeps its history is
  // the right outcome, not an error on someone's home screen.
  const filed = state.extract.found.map((f) => themeById(f.id).name);
  const note =
    state.extract.status === 'writing'
      ? 'Reading your entry…'
      : filed.length
        ? `Your entry was filed under ${LIST.format(filed)}.`
        : null;

  return (
    <div className="v pad">
      <div>
        <p className="k">{tonight()}</p>
        <h2 style={{ marginTop: 6 }}>Good evening.</h2>
      </div>

      <div className="tonight">
        <p className="k">New entry</p>
        <h3>What&rsquo;s actually on your mind?</h3>
        <p>5&ndash;10 minutes, any time of day. Nothing replies.</p>
        <button type="button" className="pb light" onClick={() => go('write')}>
          Start an entry
        </button>
      </div>

      <div className="map-head">
        <p className="k">Coming back &middot; fictional sample history</p>
        <button
          type="button"
          className={`popb${state.popMode ? ' on' : ''}`}
          aria-pressed={state.popMode}
          onClick={() => dispatch({ type: 'pop/mode' })}
        >
          {state.popMode ? 'Done' : 'Pop'}
        </button>
      </div>
      <p className="map-hint">
        {state.popMode
          ? 'Hold a bubble to hide it and ask live letters not to raise it.'
          : 'Bigger means more often. Tap one to read it back.'}
      </p>
      {themes.length > 0 ? (
        <BubbleMap
          themes={themes}
          popMode={state.popMode}
          live={live}
          onOpen={(id) => dispatch({ type: 'theme/open', id })}
          onPop={(id) => dispatch({ type: 'theme/pop', id })}
        />
      ) : (
        <p className="map-empty">
          You popped all of them. Restore any from the You tab whenever you want them back.
        </p>
      )}

      {note && <p className="filed">{note}</p>}

      <button type="button" className="last" onClick={() => go('letter')}>
        <span className="k">Letters &middot; sample</span>
        <b>Your latest letter from your {voice.name}</b>
        <span className="go">Read &rarr;</span>
      </button>

      <p className="k">This quarter, so far &middot; fictional sample</p>
      <button
        type="button"
        className="qnow"
        style={{ '--g': open.grad } as CSSProperties}
        onClick={() => go('patterns')}
      >
        <span className="qnow-top">
          <span className="k">{open.quarter}</span>
          <span className="open">Still being written</span>
        </span>
        <span className="qnow-mid">
          <b>{open.topTheme}</b>
          <i>
            {open.topThemeCount} &middot; {open.entries} entries
          </i>
        </span>
        <span className="go">See every Wrapped &rarr;</span>
      </button>
    </div>
  );
}
