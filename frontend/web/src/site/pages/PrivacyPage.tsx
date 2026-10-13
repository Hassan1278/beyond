import type { ReactElement } from 'react';
import { CRISIS, SAFEGUARDS } from '../../data/site';

/**
 * Read as a document, not a dashboard: a plain manifest of what leaves the
 * device, then the commitments as a definition list on full-width rules. No
 * cards here on purpose - the subject is candour, and boxes look like
 * marketing.
 */

const SENT = [
  'The saved entry you explicitly allow',
  'Approved memories and past corrections, unless memory is paused',
  'Your selected letter voice',
];

const AUTOMATIC = [
  'Your address book or device location',
  'Your email or account profile as extra context',
  'Other journal entries',
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
            it, before you write anything. Signed-in writing is saved in your private account;
            journal text is not saved in browser storage. The separate demo stores fictional samples
            locally. Use fictional content when trying that demo.
          </p>
        </div>

        <div className="manifest" data-reveal="">
          <div className="manifest-col">
            <p className="kicker">Only with your entry’s permission</p>
            <ul className="yeslist">
              {SENT.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="manifest-col">
            <p className="kicker">Not added to AI context</p>
            <ul className="nolist">
              {AUTOMATIC.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="sub">
          AI generation is not connected yet. When enabled, each saved entry needs your permission.
          Pausing memory excludes remembered context; you can still allow the current entry. Names,
          contact details and locations typed into text are included, without automatic redaction.
          The host receives normal connection information. Provider retention must be reviewed
          before live processing is enabled.
        </p>

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
