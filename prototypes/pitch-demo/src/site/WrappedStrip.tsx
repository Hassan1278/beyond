/**
 * Quarterly Wrapped.
 *
 * Four quarters rather than twelve months, so each card carries enough to be
 * worth looking at. The arc across them is the product's claim in numbers:
 * "feeling behind" falls quarter on quarter while photography climbs, until
 * the thing they care about is the thing they write about most.
 */
import type { CSSProperties, ReactElement } from 'react';
import { WRAPPED } from '../data/content';

export function WrappedStrip({ compact = false }: { compact?: boolean }): ReactElement {
  return (
    <div className={`wrapped${compact ? ' compact' : ''}`}>
      {WRAPPED.map((w) => (
        <article className="wrap-card" key={w.quarter} style={{ '--g': w.grad } as CSSProperties}>
          <header className="wrap-top">
            <span className="q">{w.quarter}</span>
            {w.open && <span className="open">Still being written</span>}
          </header>

          <div className="wrap-theme">
            <p className="kicker">Your top theme</p>
            <p className="theme">{w.topTheme}</p>
            <p className="count">{w.topThemeCount}</p>
          </div>

          <dl className="wrap-nums">
            <div>
              <dt>{w.entries}</dt>
              <dd>entries</dd>
            </div>
            <div>
              <dt>{w.words}</dt>
              <dd>words</dd>
            </div>
            <div>
              <dt>{w.steps}</dt>
              <dd>steps taken</dd>
            </div>
          </dl>

          <p className="wrap-rise">
            {w.rising} <b>&uarr; {w.risingBy}</b>
          </p>
        </article>
      ))}
    </div>
  );
}
