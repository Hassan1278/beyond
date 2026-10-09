import type { ReactElement } from 'react';
import { COMPARE } from '../../data/site';
import { Link } from '../../router';

/**
 * Not a row of tiles. The three alternatives are a ledger of hairline rows,
 * deliberately even and unremarkable, and Beyond then breaks out of that
 * format entirely into a dark full-bleed band. The layout makes the argument
 * before the words do.
 */
export function WhyPage(): ReactElement {
  const others = COMPARE.filter((c) => !c.us);
  const us = COMPARE.find((c) => c.us);

  return (
    <>
      <section className="sec day">
        <div className="wrap">
          <div className="why-head" data-reveal="lead">
            <h2>
              Three places to put
              <br />a hard night.
            </h2>
            <p className="sub">
              Each of them is good at something. None of them is built for a young person who just
              wants to slow down and work out which direction is theirs.
            </p>
          </div>

          <div className="ledger">
            {others.map((c) => (
              <div className="ledger-row" key={c.name} data-reveal="">
                <h3>{c.name}</h3>
                <p className="good">{c.good}</p>
                <p className="short">{c.bad}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {us && (
        <section className="sec night us-band">
          <div className="wrap us-grid" data-reveal="lead">
            <div>
              <p className="eyebrow">The gap</p>
              <h2 className="us-mark">beyond.</h2>
            </div>
            <div className="us-cols">
              <div>
                <p className="kicker">Built for</p>
                <p>{us.good}</p>
              </div>
              <div>
                <p className="kicker">What&rsquo;s different</p>
                <p>{us.bad}</p>
              </div>
              <Link to="/how" className="btn btn-light">
                Try one night
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
