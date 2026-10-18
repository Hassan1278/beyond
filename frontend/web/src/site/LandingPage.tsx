import { NoiseHero } from './NoiseHero';
import { PrivacyPage } from './pages/PrivacyPage';
import { HowPage } from './pages/HowPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { WHO_FOR, PROBLEM, EVIDENCE, STATS, SURVEY_NOTE } from '../data/landing';
import { useCopy } from './copy';
export function LandingPage({ path = '/' }: { path?: string }) {
  const t = useCopy();
  if (path === '/how') return <HowPage />;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/institutions') return <InstitutionsPage />;
  if (path === '/problem')
    return (
      <section id="problem" className="sec day landing-section">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">{t('01 · The problem')}</p>
            <h2>{t('The Great Distraction')}</h2>
            <p className="sub">{t(PROBLEM)}</p>
          </div>
          <div className="evidence-grid">
            {EVIDENCE.map((e) => (
              <article key={e.num}>
                <strong>{e.num}</strong>
                <p>{t(e.text)}</p>
                <p className="evidence-source">{t(e.source)}</p>
              </article>
            ))}
          </div>
          <div className="survey-block">
            <h3>{t('What young people told us')}</h3>
            <div className="survey-grid">
              {STATS.map((s) => (
                <article key={s.num}>
                  <div className="survey-dots" aria-hidden="true">
                    {Array.from({ length: 42 }, (_, i) => (
                      <i key={i} className={i < s.n ? 'lit' : ''} />
                    ))}
                  </div>
                  <strong>{s.num}</strong>
                  <p>{t(s.caption)}</p>
                </article>
              ))}
            </div>
            <p className="foot">{t(SURVEY_NOTE)}</p>
          </div>
        </div>
      </section>
    );
  return (
    <>
      <NoiseHero />
      <div className="who-line">
        <p>{t(WHO_FOR)}</p>
      </div>
    </>
  );
}
