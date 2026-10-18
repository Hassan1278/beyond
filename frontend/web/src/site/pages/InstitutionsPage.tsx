import { useCopy } from '../copy';
import type { ReactElement } from 'react';
import { INSTITUTIONS } from '../../data/deployed';

/**
 * The three audiences sit in a band divided by rules rather than cut into
 * cards. The beta sign-up used to close this page; it now has one of its own,
 * so this page can be about the institution rather than the individual.
 */
export function InstitutionsPage(): ReactElement {
  const t = useCopy();
  return (
    <section className="sec night">
      <div className="wrap">
        <div className="sec-head" data-reveal="lead">
          <p className="eyebrow">{t('For institutions')}</p>
          <h2>{t('Somewhere to put it down, provided by the people who look after you.')}</h2>
          <p className="sub">
            {t(
              'Universities, schools and youth organisations can encourage a daily reflection habit. Each person uses their own private Beyond account. Entries, letters and memories stay personal.',
            )}
          </p>
        </div>

        <div className="audiences">
          {INSTITUTIONS.map((s) => (
            <section key={t(s.big)} data-reveal="">
              <p className="big">{t(s.big)}</p>
              <h3>{t(s.title)}</h3>
              <p>{t(s.body)}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
