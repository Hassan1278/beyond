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
  'Kept memories and your correction, unless memory is paused',
  'Your letter voice, date labels and chosen delivery time',
];

const AUTOMATIC = [
  'Your address book or device location',
  'A separate name, email or account profile',
  'A history of past entries',
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
            it, before you write anything. This prototype saves text in your browser without
            encryption. Use fictional entries when trying it.
          </p>
        </div>

        <div className="manifest" data-reveal="">
          <div className="manifest-col">
            <p className="kicker">Sent only with live AI enabled</p>
            <ul className="yeslist">
              {SENT.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="manifest-col">
            <p className="kicker">Not automatically collected</p>
            <ul className="nolist">
              {AUTOMATIC.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="sub">
          Scripted mode sends no entry to AI. Live mode sends the items above through this host to
          the independent AI service. Pausing memory still sends tonight&rsquo;s entry. Names,
          contact details and locations typed into text are included; this demo does not redact
          them. The host also receives normal connection information. AI provider retention is
          outside these demo controls.
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
