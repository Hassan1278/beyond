import type { ReactElement } from 'react';
import { CRISIS, SAFEGUARDS } from '../../data/site';

export function PrivacyPage(): ReactElement {
  return (
    <section className="sec night">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow">Privacy &amp; limits</p>
          <h2>Safe enough to be honest.</h2>
          <p className="sub">
            People only write honestly when they trust where the words go. So Beyond is clear about
            what it keeps, what it sends, and what it isn&rsquo;t.
          </p>
        </div>

        <div className="safe-grid">
          {SAFEGUARDS.map((s) => (
            <article key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>

        <div className="crisis">
          <p>
            If you&rsquo;re struggling right now, please don&rsquo;t wait for a letter. In Hong Kong
            you can reach someone tonight.
          </p>
          <div className="lines">
            {CRISIS.map((c) => (
              <div className="line" key={c.label}>
                <b>{c.label}</b>
                <span>{c.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
