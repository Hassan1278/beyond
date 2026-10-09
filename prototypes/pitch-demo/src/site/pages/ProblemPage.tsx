import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ERAS, STATS, SURVEY_NOTE, SYMPTOMS } from '../../data/site';
import { FeedTicker } from '../FeedWall';

/**
 * The evidence page. Laid out as a descent: the feed across the top, then the
 * naming, then what young people actually said. The lead statistic is set large
 * and alone so the four findings are a hierarchy rather than a row of tiles.
 */

/** Dots fill in once, when the figures come into view: 42 people answering. */
function Dots({ n, live }: { n: number; live: boolean }): ReactElement {
  return (
    <div className="dots" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => (
        <span
          key={i}
          className={live && i < n ? 'on' : undefined}
          style={{ transitionDelay: `${i * 16}ms` }}
        />
      ))}
    </div>
  );
}

export function ProblemPage(): ReactElement {
  const [live, setLive] = useState(false);
  const figures = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = figures.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: '-15% 0px -15% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [lead, ...rest] = STATS;

  return (
    <>
      <FeedTicker />

      <section className="sec night">
        <div className="wrap">
          <p className="eyebrow">A name for it</p>
          <ol className="eras">
            {ERAS.map((e) => (
              <li key={e.era} className={e.now ? 'now' : undefined} data-reveal="">
                <span className="yr">{e.yr}</span>
                <span className="era">{e.era}</span>
              </li>
            ))}
          </ol>
          <div className="two" data-reveal="">
            <p className="big">
              Every feed has a version of you that is further ahead. Scroll long enough and it gets
              hard to tell which goals were yours to begin with.
            </p>
            <ul className="symptoms">
              {SYMPTOMS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec night figures" style={{ paddingTop: 0 }}>
        <div className="wrap" ref={figures}>
          <div className="lead-stat" data-reveal="lead">
            <div>
              <p className="eyebrow">What young people told us</p>
              <p className="lead-num">{lead.num}</p>
              <p className="lead-cap">{lead.caption}</p>
            </div>
            <Dots n={lead.n} live={live} />
          </div>

          <dl className="findings">
            {rest.map((s) => (
              <div key={s.num} data-reveal="">
                <dt>{s.num}</dt>
                <dd>{s.caption}</dd>
                <Dots n={s.n} live={live} />
              </div>
            ))}
          </dl>

          <p className="foot">{SURVEY_NOTE}</p>
        </div>
      </section>
    </>
  );
}
