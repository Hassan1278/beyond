import { useState, type ReactElement } from 'react';
import { NoiseHero } from '../NoiseHero';
import { Beats } from '../Beats';
import { FeedWall } from '../FeedWall';
import { Link } from '../../router';

/**
 * The argument, in order: the noise, then the feed behind it, then what
 * Beyond does instead. The feed section is the one place the page raises its
 * voice; everything after it is deliberately quiet.
 */
export function HomePage(): ReactElement {
  const [down, setDown] = useState(false);

  return (
    <>
      <NoiseHero />

      <section className={`sec night feed-sec${down ? ' is-quiet' : ''}`}>
        <div className="feed-layout">
          <div className="feed-copy">
            <p className="eyebrow">Every night, this</p>
            <h2>
              It never runs out.
              <br />
              That is the design.
            </h2>
            <p className="sub">
              There is no last post. Someone is always further ahead, and the feed will keep showing
              you until you close it. Scroll long enough and it gets hard to tell which goals were
              ever yours.
            </p>
            {down ? (
              <div className="quiet-state" aria-live="polite">
                <p className="quiet-line">Quiet.</p>
                <p className="sub">
                  Nothing is asking for your attention now. That is the whole idea behind Beyond:
                  one place that does not compete for it.
                </p>
                <div className="ctas">
                  <Link to="/how" className="btn btn-light">
                    See what happens next
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={() => setDown(false)}>
                    Let it back in
                  </button>
                </div>
              </div>
            ) : (
              <div className="ctas">
                <button type="button" className="btn btn-light" onClick={() => setDown(true)}>
                  Put it down
                </button>
                <Link to="/problem" className="btn btn-ghost">
                  Why it works on us
                </Link>
              </div>
            )}
          </div>

          <div className="feed-frame">
            <FeedWall quiet={down} columns={2} />
          </div>
        </div>
      </section>

      <section className="sec day">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">How Beyond works</p>
            <h2>Say it tonight. Understand it tomorrow.</h2>
            <p className="sub">
              Beyond keeps expressing and reflecting apart. You get to finish a thought before
              anything answers it.
            </p>
          </div>
          <Beats />
          <div className="ctas" style={{ marginTop: 32 }}>
            <Link to="/how" className="btn btn-dark">
              Try one night
            </Link>
            <Link to="/app" className="btn btn-ghost">
              Open the app demo
            </Link>
          </div>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">What students told us</p>
            <h2>80%+ feel lost about where they&rsquo;re heading.</h2>
            <p className="sub">
              We asked 42 high school and university students across three continents. Nine in ten
              have things to get off their chest and no right person to tell.
            </p>
          </div>
          <div className="ctas">
            <Link to="/problem" className="btn btn-light">
              See what they said
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
