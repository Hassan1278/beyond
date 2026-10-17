/* eslint-disable react-hooks/set-state-in-effect -- Preserve existing pitch transitions and immediate demo deletion resets during migration. */
/**
 * The site's one interactive piece: write an entry, leave it for the night,
 * read the letter in the morning.
 *
 * It shares the app demo's store, so the entry typed here is the entry waiting
 * in the app, and live AI works in both places with no second implementation.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { SCRIPTED_LETTERS, VOICES, voiceById } from '../demo/content';
import { morning, tonight } from '../demo/date';
import { useDemo } from '../demo/store';
import { Safety } from '../demo/Safety';
import { needsSafetyCheck } from '../demo/crisis';

type Phase = 'writing' | 'safety' | 'overnight' | 'morning';

/** The clock the overlay runs through while the letter is written. */
const FROM = 23 * 60 + 48;

export function TryOneNight(): ReactElement {
  const { state, dispatch, generate, go } = useDemo();
  const [phase, setPhase] = useState<Phase>(() => (state.ai.letter ? 'morning' : 'writing'));
  const [clock, setClock] = useState(FROM);
  const [warn, setWarn] = useState(false);

  const voice = voiceById(state.voice);
  const target = (() => {
    const [h, m] = state.time.split(':').map(Number);
    return h * 60 + m;
  })();

  const live = state.source === 'ai';
  const fromAi = live && state.ai.status === 'ready' && state.ai.letter !== null;
  const letter = fromAi ? state.ai.letter! : SCRIPTED_LETTERS[state.voice];

  useEffect(() => {
    if (state.deleted) setPhase('writing');
  }, [state.deleted]);

  // Effects run after voice changes commit, so the new request uses the new voice.
  useEffect(() => {
    if (phase === 'overnight' && live && state.ai.status === 'idle') void generate();
  }, [phase, live, state.ai.status, generate]);

  // While the overlay is up, run the clock from 23:48 to the delivery time.
  useEffect(() => {
    if (phase !== 'overnight') return;
    const span = (target + 1440 - FROM) % 1440;
    const id = window.setInterval(() => {
      setClock((c) => {
        const next = c + Math.max(4, Math.round(span / 60));
        return next >= FROM + span ? FROM + span : next;
      });
    }, 40);
    return () => window.clearInterval(id);
  }, [phase, target]);

  // Scripted letters wait for the animation; live ones wait for the model.
  useEffect(() => {
    if (phase !== 'overnight') return;
    if (live) {
      if (state.ai.status === 'ready' || state.ai.status === 'error') setPhase('morning');
      return;
    }
    const id = window.setTimeout(() => setPhase('morning'), 2200);
    return () => window.clearTimeout(id);
  }, [phase, live, state.ai.status]);

  const seal = (): void => {
    if (state.entry.trim().length < 10) {
      setWarn(true);
      return;
    }
    setWarn(false);
    setClock(FROM);
    dispatch({ type: 'seal' });
    setPhase(needsSafetyCheck(state.entry) ? 'safety' : 'overnight');
  };

  const words = (state.entry.trim().match(/\S+/g) ?? []).length;
  const fmt = (m: number): string =>
    `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const dawn = clock % 1440 >= 5 * 60;

  return (
    <div className="try-grid">
      <div className="entry">
        {phase === 'safety' ? (
          <Safety
            onSeal={() => {
              go('sealed');
              setClock(FROM);
              setPhase('overnight');
            }}
            onBack={() => {
              go('write');
              setPhase('writing');
            }}
          />
        ) : (
          <>
            <div className="entry-top">
              <span>{tonight()} &middot; 23:48</span>
              <span>No replies. Just you.</span>
            </div>
            <label className="sr" htmlFor="siteEntry">
              Tonight&rsquo;s entry
            </label>
            <textarea
              id="siteEntry"
              value={state.entry}
              maxLength={6000}
              disabled={phase === 'overnight'}
              placeholder="What's actually on your mind?"
              onChange={(e) => {
                dispatch({ type: 'entry', entry: e.target.value });
                setWarn(false);
              }}
            />
            <div className="entry-foot">
              <span className="mono">
                {words} {words === 1 ? 'word' : 'words'}
                {warn && ' · write something first'}
              </span>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={seal}
                disabled={phase === 'overnight'}
              >
                Leave it for tonight
              </button>
            </div>
          </>
        )}
      </div>

      <div className="letter">
        {phase === 'overnight' && (
          <div className={`overnight${dawn ? ' dawn' : ''}`}>
            <span className="m" />
            <p className="t">{fmt(clock)}</p>
            <p>
              {live
                ? 'Beyond is reading tonight’s entry next to what it remembers.'
                : 'Reading between the nights…'}
            </p>
          </div>
        )}

        <div className="letter-head">
          <div className="meta">
            <span className="mono">
              {morning()} &middot; {state.time}
            </span>
            <span className="from">{voice.from}</span>
          </div>
          <div className="voices" role="tablist" aria-label="Letter voice">
            {VOICES.map((v) => (
              <button
                type="button"
                key={v.id}
                role="tab"
                aria-selected={state.voice === v.id}
                disabled={phase === 'safety'}
                onClick={() => {
                  if (state.voice === v.id) return;
                  dispatch({ type: 'voice', voice: v.id });
                  if (live && phase === 'morning') {
                    setClock(FROM);
                    setPhase('overnight');
                  }
                }}
              >
                {v.name === 'Plain diary' ? 'Diary' : v.name}
              </button>
            ))}
          </div>
        </div>

        <div className="letter-body">
          {letter.greet && <p className="greet">{letter.greet}</p>}
          <p>{letter.said}</p>
          {letter.rec && <p>{letter.rec}</p>}
          {letter.sign && <p className="sign">{letter.sign}</p>}
        </div>

        <div>
          <p className="kicker" style={{ marginBottom: 10 }}>
            Sample growth
          </p>
          <div className="chips">
            <span>
              Feeling behind &middot; <b>3 nights</b>
            </span>
            <span>
              Photography &middot; <b>2 entries</b>
            </span>
            <span>Internships</span>
          </div>
        </div>

        <div className="step">
          <p className="kicker">One small step</p>
          <p className="what">{letter.step}</p>
          {state.step ? (
            <p className="step-note">
              {state.step === 'try' ? 'Marked for today in this demo.' : 'Skipped in this demo.'}
            </p>
          ) : (
            <div className="step-actions">
              <button
                type="button"
                className="pri"
                onClick={() => dispatch({ type: 'step', step: 'try' })}
              >
                I&rsquo;ll try it
              </button>
              <button type="button" onClick={() => dispatch({ type: 'step', step: 'skip' })}>
                Not for me
              </button>
            </div>
          )}
        </div>

        <p className="demo-note">
          {fromAi
            ? `Written for your entry by ${state.ai.model ?? 'fictional demo'}${
                state.ai.ms ? ` in ${(state.ai.ms / 1000).toFixed(1)}s` : ''
              }. `
            : 'Scripted letter for the fictional sample entry. Growth above is a sample, including when live AI is used. '}
        </p>
      </div>
    </div>
  );
}
