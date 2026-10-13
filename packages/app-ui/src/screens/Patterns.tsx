import type { CSSProperties, ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import type { Trend } from '../types';
import { TRENDS, WRAPPED } from '../data/content';
import { monthSoFar } from '../lib/date';

const W = 64;
const H = 24;
const MAX = 4;

/** One trend line: filled area, stroke, and a dot on the latest week. */
function Spark({ t }: { t: Trend }): ReactElement {
  const pts = t.w.map<[number, number]>((v, i) => [
    i * (W / (t.w.length - 1)),
    H - (v / MAX) * (H - 4) - 2,
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const col = t.up ? 'var(--ok)' : 'var(--ink)';
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-label={`Weekly: ${t.w.join(', ')}`}>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={col} fillOpacity=".08" />
      <polyline
        points={line}
        fill="none"
        stroke={col}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1].toFixed(1)} r="2.6" fill={col} />
    </svg>
  );
}

const arrow = (t: Trend): string => (t.up ? '↑' : t.w[0] === t.w[t.w.length - 1] ? '·' : '↓');

export function Patterns({ state }: ScreenProps): ReactElement {
  if (state.product)
    return (
      <div className="v pad">
        <p className="k">Your patterns</p>
        <div className="tr" />
        <p className="fine">
          No patterns yet. This area will use your own data once AI analysis is connected.
        </p>
        <p className="k">Quarterly Wrapped</p>
        <div className="film" />
      </div>
    );
  return (
    <div className="v pad">
      <div>
        <p className="k">{monthSoFar()} &middot; 22 fictional entries</p>
        <h2 style={{ marginTop: 6 }}>Your patterns</h2>
        <p className="muted">
          Fictional sample patterns and Quarterly Wrapped. These do not analyze your entry.
        </p>
      </div>

      <div className="tr">
        {TRENDS.map((t) => (
          <div key={t.name}>
            <span className="name">{t.name}</span>
            <span className="cnt">
              {t.w.reduce((a, b) => a + b, 0)} {arrow(t)}
            </span>
            <Spark t={t} />
          </div>
        ))}
      </div>

      <p className="quote">
        &ldquo;You wrote &lsquo;behind&rsquo; less every week this month. Photography went the other
        way.&rdquo;
      </p>

      <p className="k">Quarterly Wrapped</p>
      <div className="film">
        {WRAPPED.map((w) => (
          <div className="qcard" key={w.quarter} style={{ '--g': w.grad } as CSSProperties}>
            <span className="k">{w.quarter}</span>
            <div>
              <p className="qtheme">{w.topTheme}</p>
              <p className="qcount">{w.topThemeCount}</p>
            </div>
            <p className="qnums">
              {w.entries} entries &middot; {w.steps} steps
            </p>
          </div>
        ))}
      </div>
      <p className="fine" style={{ opacity: 0.6 }}>
        This quarter is totalled up when it ends.
      </p>
    </div>
  );
}
