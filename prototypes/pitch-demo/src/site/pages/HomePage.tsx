import { useState, type ReactElement } from 'react';
import { NoiseHero } from '../NoiseHero';
import { FeedWall } from '../FeedWall';
import { WHO_FOR } from '../../data/site';
import { Link } from '../../router';
import { Presence } from '../motion';

/**
 * The argument, in order: the noise, the feed behind it, who this is for, and
 * what young people said. The feed section is the one place the page raises
 * its voice; everything after it is deliberately quiet.
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
            <div className="swap-stack">
              <Presence show={down}>
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
              </Presence>
              <Presence show={!down}>
                <div className="ctas">
                  <button type="button" className="btn btn-light" onClick={() => setDown(true)}>
                    Put it down
                  </button>
                </div>
              </Presence>
            </div>
          </div>

          <div className="feed-frame">
            <FeedWall quiet={down} columns={2} />
          </div>
        </div>
      </section>

      <section className="sec day">
        <div className="wrap">
          <div className="who-head" data-reveal="lead">
            <div>
              <p className="eyebrow">Who it is for</p>
              <h2>{WHO_FOR.lead}</h2>
            </div>
            <p className="who-note">
              Beyond is a journal that answers you once, the next morning. It is not therapy, not a
              chatbot, and not another feed.
            </p>
          </div>
          <div className="who-grid">
            {WHO_FOR.points.map((p) => (
              <div key={p.t} data-reveal="">
                <h3>{p.t}</h3>
                <p>{p.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">What young people told us</p>
            <h2>80%+ feel lost about where they&rsquo;re heading.</h2>
            <p className="sub">
              We asked 42 young people across three continents. Nine in ten have things to get off
              their chest and no right person to tell.
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
