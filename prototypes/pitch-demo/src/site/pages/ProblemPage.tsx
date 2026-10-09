import type { ReactElement } from 'react';
import { ERAS, STATS, SURVEY_NOTE, SYMPTOMS } from '../../data/site';

export function ProblemPage(): ReactElement {
  return (
    <>
      <section className="sec night">
        <div className="wrap">
          <p className="eyebrow">A name for it</p>
          <ol className="eras">
            {ERAS.map((e) => (
              <li key={e.era} className={e.now ? 'now' : undefined}>
                <span className="yr">{e.yr}</span>
                <span className="era">{e.era}</span>
              </li>
            ))}
          </ol>
          <div className="two">
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

      <section className="sec night" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">What students told us</p>
            <h2>We asked 42 students how it feels.</h2>
          </div>
          <div className="stat-grid">
            {STATS.map((s) => (
              <figure className="stat" key={s.num}>
                <p className="num">{s.num}</p>
                <div className="dots" aria-hidden="true">
                  {Array.from({ length: 42 }, (_, i) => (
                    <span key={i} className={i < s.n ? 'on' : undefined} />
                  ))}
                </div>
                <figcaption>{s.caption}</figcaption>
              </figure>
            ))}
          </div>
          <p className="foot">{SURVEY_NOTE}</p>
        </div>
      </section>
    </>
  );
}
