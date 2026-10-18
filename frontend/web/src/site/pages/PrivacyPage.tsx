import type { ReactElement } from 'react';
import { CRISIS, SAFEGUARDS } from '../../data/site';

/**
 * Read as a document, not a dashboard: a plain manifest of what leaves the
 * device, then the commitments as a definition list on full-width rules. No
 * cards here on purpose - the subject is candour, and boxes look like
 * marketing.
 */

const SENT = [
  'The night you seal, word for word',
  'The voice and language you chose for letters',
  'Memories you can see in Settings, unless memory is paused',
  'Headlines, themes and skipped to-dos of up to four earlier letters you kept',
];

const AUTOMATIC = [
  'Your email, name or account',
  'Other nights, letters you keep out of Growth, or anything you forgot',
  'Your location, contacts or device details',
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
            it, before you write anything. Your journal is saved in your private account and never
            in browser storage. The demos on this site are fictional and forget what you type when
            you leave.
          </p>
        </div>

        <div className="manifest" data-reveal="">
          <div className="manifest-col">
            <p className="kicker">Sent to the letter writer when you seal a night</p>
            <ul className="yeslist">
              {SENT.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="manifest-col">
            <p className="kicker">Never sent</p>
            <ul className="nolist">
              {AUTOMATIC.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="sub">
          Letters, month and year notes, and voice transcription go through Beyond’s own letter
          service, which passes them to an AI provider (Anthropic’s Claude by default) and keeps
          nothing. Names, places or contact details you type are sent as written; nothing is
          redacted automatically. Recordings are turned into words and not stored. Hosting providers
          see normal connection information. Each person has a daily limit on letters, notes and
          transcription.
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
