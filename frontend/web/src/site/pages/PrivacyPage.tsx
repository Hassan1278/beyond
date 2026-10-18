import { AI_SENT, AI_NEVER, AI_PROVIDER_NOTE, SAFEGUARDS, CRISIS_LINES } from '../../copy/shared';
import { useCopy } from '../copy';
export function PrivacyPage() {
  const t = useCopy();
  return (
    <section id="privacy" className="sec day landing-section">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow">{t('03 · Privacy')}</p>
          <h2>{t('What you write stays yours')}</h2>
          <p className="sub">
            {t(
              'Your journal is saved in your private account, never in browser storage. The examples on this site are fictional.',
            )}
          </p>
        </div>
        <div className="privacy-manifest">
          {[
            ['Sent to the letter writer when you seal a night', AI_SENT],
            ['Never sent', AI_NEVER],
          ].map(([title, items]) => (
            <div key={title as string}>
              <h3>{t(title as string)}</h3>
              <ul>
                {(items as string[]).map((s) => (
                  <li key={s}>{t(s)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="privacy-provider">{t(AI_PROVIDER_NOTE)}</p>
        <dl className="privacy-commitments">
          {SAFEGUARDS.map((s) => (
            <div key={s.title}>
              <dt>{t(s.title)}</dt>
              <dd>{t(s.body)}</dd>
            </div>
          ))}
        </dl>
        <aside className="privacy-crisis">
          <h3>{t('Need someone right now?')}</h3>
          <p>{t('Please don’t wait for a letter. In Hong Kong, you can reach someone tonight.')}</p>
          <div>
            {CRISIS_LINES.map((c) => (
              <a href={`tel:${c.phone.replaceAll(' ', '')}`} key={c.phone}>
                <strong>{c.phone}</strong>
                <span>
                  {t(c.name)}
                  {c.hours && ` · ${t('24 hours')}`}
                </span>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
