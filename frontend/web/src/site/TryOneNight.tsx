import { useEffect, useState } from 'react';
import { NIGHT, BODIES } from '../data/kit';
import { CRISIS_LINES, DELIVERY_DEFAULT, VOICE_NAMES } from '../copy/shared';
import { needsSafetyCheck } from '../demo/crisis';
import { useCopy } from './copy';
type Voice = keyof typeof VOICE_NAMES;
const FROM = 23 * 60 + 48;
const [deliveryHour, deliveryMinute] = DELIVERY_DEFAULT.split(':').map(Number);
const ARRIVAL = FROM + ((deliveryHour * 60 + deliveryMinute + 1440 - FROM) % 1440);
export function TryOneNight() {
  const t = useCopy();
  const [draft, setDraft] = useState<string | null>(null);
  const entry = draft ?? NIGHT.entries.map((e) => `${e.t} · ${t(e.text)}`).join('\n\n');
  const [voice, setVoice] = useState<Voice>('mentor');
  const [phase, setPhase] = useState<'writing' | 'safety' | 'overnight' | 'morning'>('writing');
  const [clock, setClock] = useState(FROM);
  const [warn, setWarn] = useState(false);
  const [step, setStep] = useState<'' | 'try' | 'skip'>('');
  const letter = NIGHT.content;
  useEffect(() => {
    if (phase !== 'overnight') return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const duration = reduced ? 0 : 2200;
    const timer = window.setInterval(
      () =>
        setClock(
          FROM +
            Math.round(
              Math.min(1, (performance.now() - start) / Math.max(1, duration)) * (ARRIVAL - FROM),
            ),
        ),
      40,
    );
    const end = window.setTimeout(() => {
      setClock(ARRIVAL);
      setPhase('morning');
    }, duration);
    return () => {
      clearInterval(timer);
      clearTimeout(end);
    };
  }, [phase]);
  const seal = () => {
    if (entry.trim().length < 10) {
      setWarn(true);
      return;
    }
    setWarn(false);
    setClock(FROM);
    setStep('');
    setPhase(needsSafetyCheck(entry) ? 'safety' : 'overnight');
  };
  const time = `${String(Math.floor((clock % 1440) / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
  return (
    <div className="try-grid">
      <div className="entry">
        {phase === 'safety' ? (
          <div className="sample-safety">
            <h3>{t('Need someone right now?')}</h3>
            <p>
              {t('Please don’t wait for a letter. In Hong Kong, you can reach someone tonight.')}
            </p>
            {CRISIS_LINES.map((c) => (
              <p key={c.phone}>
                <a href={`tel:${c.phone.replaceAll(' ', '')}`}>
                  {c.phone} · {t(c.name)}
                </a>
              </p>
            ))}
            <button className="btn btn-light" onClick={() => setPhase('writing')}>
              {t('Back to writing')}
            </button>
          </div>
        ) : (
          <>
            <div className="entry-top">
              <span>{t('Kit’s journal')}</span>
              <span>{t('No replies. Just you.')}</span>
            </div>
            <label className="sr" htmlFor="siteEntry">
              {t('Tonight’s entry')}
            </label>
            <textarea
              id="siteEntry"
              value={entry}
              maxLength={6000}
              disabled={phase === 'overnight'}
              onChange={(e) => {
                setDraft(e.target.value);
                setWarn(false);
              }}
              placeholder={t("What's actually on your mind?")}
            />
            <div className="entry-foot">
              <span className="mono">
                {entry.trim().length} {t('characters')}
                {warn && ` · ${t('Write something first')}`}
              </span>
              <button
                className="btn btn-light btn-sm"
                onClick={seal}
                disabled={phase === 'overnight'}
              >
                {t('Leave it for tonight')}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="letter" aria-busy={phase === 'overnight'}>
        {phase === 'overnight' && (
          <div className={`overnight${clock % 1440 >= 300 ? ' dawn' : ''}`}>
            <span className="m" />
            <p className="t">{time}</p>
            <p>{t('Reading between the nights…')}</p>
          </div>
        )}
        <div className="letter-head">
          <div className="meta">
            <span className="mono">
              {t('Tomorrow')} · {DELIVERY_DEFAULT}
            </span>
            <span className="from">{t(VOICE_NAMES[voice])}</span>
          </div>
          <div className="voices" role="group" aria-label={t('Letter voice')}>
            {(Object.keys(VOICE_NAMES) as Voice[]).map((v) => (
              <button
                key={v}
                aria-pressed={voice === v}
                disabled={phase === 'overnight'}
                onClick={() => {
                  setVoice(v);
                  setStep('');
                }}
              >
                {t(VOICE_NAMES[v])}
              </button>
            ))}
          </div>
        </div>
        <div className="letter-body" aria-live="polite">
          <h3>{t(letter.title)}</h3>
          {t(BODIES[voice])
            .split(/\n{2,}/)
            .map((p, i) => (
              <p className="sample-letter-paragraph" key={i}>
                {p}
              </p>
            ))}
        </div>
        <div className="step">
          <p className="kicker">{t('Something to think about today')}</p>
          <p className="what sample-question">{t(letter.reflection_question)}</p>
        </div>
        <div className="step">
          <p className="kicker">{t('One small step')}</p>
          <p className="what">{t(letter.small_step.text)}</p>
          <div className="step-actions">
            <button
              className={step === 'try' ? 'pri' : ''}
              aria-pressed={step === 'try'}
              onClick={() => setStep(step === 'try' ? '' : 'try')}
            >
              {t('I’ll try it')}
            </button>
            <button
              className={step === 'skip' ? 'pri' : ''}
              aria-pressed={step === 'skip'}
              onClick={() => setStep(step === 'skip' ? '' : 'skip')}
            >
              {t('Not for me')}
            </button>
          </div>
        </div>
        <p className="demo-note" role="status">
          {phase === 'morning' && `${t('Morning. Your sample letter is here.')} `}
          {t(
            'Kit’s entry and Mentor letter come from the app’s fictional demo. Other voices are scripted variations. Editing this example does not generate a personalised letter. Nothing you type here is saved or sent.',
          )}
        </p>
      </div>
    </div>
  );
}
