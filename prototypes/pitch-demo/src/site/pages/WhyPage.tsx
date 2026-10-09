import type { ReactElement } from 'react';
import { COMPARE } from '../../data/site';

export function WhyPage(): ReactElement {
  return (
    <section className="sec day">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow">Why Beyond</p>
          <h2>Less noise. More you.</h2>
          <p className="sub">
            Your feed is optimised for attention. Beyond is designed for reflection. Write without
            interruption, come back later, and see your own patterns instead of everyone
            else&rsquo;s highlight reel.
          </p>
        </div>

        <div className="cmp">
          {COMPARE.map((c) => (
            <article key={c.name} className={c.us ? 'us' : undefined}>
              <h3>{c.name}</h3>
              <dl>
                <div>
                  <dt>{c.us ? 'Built for' : 'Good for'}</dt>
                  <dd>{c.good}</dd>
                </div>
                <div>
                  <dt>{c.us ? "What's different" : 'Falls short'}</dt>
                  <dd>{c.bad}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
