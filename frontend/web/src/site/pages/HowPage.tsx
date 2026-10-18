import { Beats } from '../Beats';
import { TryOneNight } from '../TryOneNight';
import { AppPreviews } from '../AppPreviews';
import { MEMORY_POINTS } from '../../data/landing';
import { useCopy } from '../copy';
export function HowPage() {
  const t = useCopy();
  return (
    <>
      <section className="sec day">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">{t('How Beyond works')}</p>
            <h2>{t('Say it whenever. Understand it tomorrow.')}</h2>
            <p className="sub">
              {t(
                'Beyond keeps expressing and reflecting apart. Write as often as you like, whenever it hits — you get to finish a thought before anything answers it.',
              )}
            </p>
          </div>
          <Beats />
          <p className="beats-note" data-reveal="">
            {t(
              'Write whenever you like. The night you seal becomes one letter, delivered at your chosen time. The default is 08:00.',
            )}
          </p>
        </div>
      </section>
      <section className="sec day-2">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">{t('Try one night')}</p>
            <h2>{t('Leave it for the night. Read it in the morning.')}</h2>
            <p className="sub">
              {t(
                'Edit the entry if you like, then leave it. Switch voices to see how the same night reads from a friend, a mentor, or your future self.',
              )}
            </p>
          </div>
          <TryOneNight />
        </div>
      </section>
      <section className="sec night">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">{t('Over months')}</p>
            <h2>{t('Your growth. Not their highlight reel.')}</h2>
            <p className="sub">
              {t(
                'One letter helps you get through a week. Over months, Beyond shows what keeps coming back, what is fading, and who you are turning into.',
              )}
            </p>
          </div>
          <AppPreviews />
        </div>
      </section>
      <section className="sec day">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">{t('Memory you control')}</p>
            <h2>{t('You decide what Beyond remembers.')}</h2>
            <p className="sub">
              {t('Memory is what makes a letter feel like it knows you. It still belongs to you.')}
            </p>
          </div>
          <ul className="memory-summary">
            {MEMORY_POINTS.map((p) => (
              <li key={p}>{t(p)}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
