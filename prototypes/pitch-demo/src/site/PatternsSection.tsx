/**
 * What a few months of Beyond adds up to. Lives at the bottom of How it works
 * rather than on a page of its own: it is the back half of the same story, not
 * a separate feature.
 */
import type { ReactElement } from 'react';
import { TRENDS } from '../data/content';
import { MEMORY_POINTS } from '../data/site';
import { monthSoFar } from '../lib/date';
import { useBeyond } from '../state/store';
import { WrappedStrip } from './WrappedStrip';

const W = 96;
const H = 30;
const MAX = 4;

function Spark({ w, up }: { w: number[]; up: boolean }): ReactElement {
  const pts = w.map<[number, number]>((v, i) => [
    i * (W / (w.length - 1)),
    H - (v / MAX) * (H - 5) - 2,
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const col = up ? 'var(--ok)' : 'var(--ink)';
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-label={`Weekly mentions: ${w.join(', ')}`}>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={col} fillOpacity=".08" />
      <polyline
        points={line}
        fill="none"
        stroke={col}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1].toFixed(1)} r="2.8" fill={col} />
    </svg>
  );
}

export function PatternsSection(): ReactElement {
  const { state, dispatch } = useBeyond();

  return (
    <>
      <section className="sec day">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">Over months</p>
            <h2>Your patterns. Not their highlight reel.</h2>
            <p className="sub">
              One letter helps you get through a week. Over months, Beyond shows what keeps coming
              back, what is fading, and who you are turning into.
            </p>
          </div>

          <div className="review" data-reveal="">
            <div className="review-head">
              <h3>{monthSoFar()}</h3>
              <span className="mono">22 entries &middot; sample</span>
            </div>
            {TRENDS.map((t) => (
              <div className="trend" key={t.name}>
                <span className="name">{t.name}</span>
                <span className="n">{t.w.reduce((a, b) => a + b, 0)} entries</span>
                <Spark w={t.w} up={t.up} />
              </div>
            ))}
            <p className="note">
              &ldquo;You wrote &lsquo;behind&rsquo; less every week this month. Photography went the
              other way.&rdquo;
            </p>
          </div>

          <div className="wrapped-head" data-reveal="">
            <p className="eyebrow">Quarterly Wrapped</p>
            <h3>Four times a year, it all adds up.</h3>
            <p className="sub">
              Four times a year Beyond totals it up. Not to score you, and not to share &mdash; just
              so you can see the shape of a few months at once.
            </p>
          </div>
          <WrappedStrip />
          <p className="demo-note">
            Fictional sample patterns and Quarterly Wrapped; these do not analyze your entry.
          </p>
        </div>
      </section>

      <section className="sec day-2">
        <div className="wrap">
          <div className="mem-grid" data-reveal="">
            <div>
              <p className="eyebrow">Memory you control</p>
              <h2 style={{ marginTop: 20 }}>You decide what Beyond remembers.</h2>
              <p className="sub" style={{ marginTop: 20 }}>
                Memory is what makes a letter feel like it knows you. It still belongs to you.
              </p>
              <ul className="mem-points">
                {MEMORY_POINTS.map((p) => (
                  <li key={p.b}>
                    <b>{p.b}</b>
                    <span>{p.s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mem-card">
              <div className="mem-card-head">
                <h3>What Beyond remembers</h3>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={!state.paused}
                  onClick={() => dispatch({ type: 'mem/pause' })}
                >
                  <span>{state.paused ? 'Memory paused' : 'Memory on'}</span>
                  <span className="track" />
                </button>
              </div>
              {state.paused && (
                <p className="paused-msg">
                  Memory is paused. Tomorrow&rsquo;s letter will only use what you wrote today.
                </p>
              )}
              <ul className={`mem-list${state.paused ? ' paused' : ''}`}>
                {state.mems.length ? (
                  state.mems.map((m, i) => (
                    <li key={m.t}>
                      <span className="txt">{m.t}</span>
                      <span className="src">{m.s}</span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'mem/forget', index: i })}
                      >
                        Forget
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="mem-empty">
                    Beyond doesn&rsquo;t remember anything about you. Letters will use only what you
                    wrote that day.
                  </li>
                )}
              </ul>
              <p className="demo-note">Sample memories. Try pausing or forgetting one.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
