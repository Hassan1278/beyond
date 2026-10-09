import type { ReactElement } from 'react';
import { NoiseHero } from '../NoiseHero';
import { Beats } from '../Beats';
import { Link } from '../../router';

export function HomePage(): ReactElement {
  return (
    <>
      <NoiseHero />

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
              Try one night &rarr;
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
              See what they said &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
