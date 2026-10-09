import type { ReactElement } from 'react';
import { CRISIS, SAFEGUARDS } from '../../data/site';

/**
 * Read as a document, not a dashboard: a plain manifest of what leaves the
 * device, then the commitments as a definition list on full-width rules. No
 * cards here on purpose - the subject is candour, and boxes look like
 * marketing.
 */

const SENT = [
  'Tonight’s entry',
  'Memories you have kept',
  'Short snippets from past entries, only when relevant',
  'Your letter voice',
];

const NEVER = [
  'Your name, email or contact details',
  'Anything you have forgotten',
  'Your location',
  'Anything at all, if you pause memory',
];

export function PrivacyPage(): ReactElement {
  return (
    <section className="sec night">
      <div className="wrap">
        <div className="sec-head" data-reveal="lead">
          <p className="eyebrow">Privacy &amp; limits</p>
          <h2>Safe enough to be honest.</h2>
          <p className="sub">
            People only write honestly when they trust where the words go. So here is the whole of
            it, before you write anything.
          </p>
        </div>

        <div className="manifest" data-reveal="">
          <div className="manifest-col">
            <p className="kicker">Sent, to write your letter</p>
            <ul className="yeslist">
              {SENT.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="manifest-col">
            <p className="kicker">Never sent</p>
            <ul className="nolist">
              {NEVER.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="commitments">
          {SAFEGUARDS.map((s) => (
            <div key={s.title} data-reveal="">
              <dt>{s.title}</dt>
              <dd>{s.body}</dd>
            </div>
          ))}
        </dl>

        <div className="crisis" data-reveal="">
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
