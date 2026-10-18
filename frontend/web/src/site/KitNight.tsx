/**
 * One of Kit's nights, exactly as the app's Demo mode shows it (sample.json, the
 * mock test night), and its morning letter in the app's format: one flowing letter,
 * then one question and one small step. The Mentor letter is the app's own; the
 * other voices are the same letter in their tone. Scripted and fictional.
 */
import { useCopy } from './copy';
import { useState, type ReactElement } from 'react';
import { DELIVERY_DEFAULT, VOICE_NAMES } from '../copy/shared';

import { NIGHT, BODIES, type VoiceKey } from '../data/kit';

const ampm = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
};

export function KitNight(): ReactElement {
  const t = useCopy();
  const [voice, setVoice] = useState<VoiceKey>('mentor');
  const [step, setStep] = useState<'' | 'try' | 'skip'>('');
  const c = NIGHT.content;
  const paras = t(BODIES[voice]).split(/\n{2,}/);

  return (
    <div className="kit">
      <div className="kit-page">
        <p className="kit-k">{t('Kit’s journal')}</p>
        <ol className="kit-entries">
          {NIGHT.entries.map((e) => (
            <li key={e.id}>
              <time>{ampm(e.t)}</time>
              <p>{t(e.text)}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="kit-letter-wrap">
        <div className="kit-voices" role="group" aria-label={t('Letter voice')}>
          {(Object.keys(VOICE_NAMES) as VoiceKey[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={voice === v}
              className={voice === v ? 'on' : undefined}
              onClick={() => setVoice(v)}
            >
              {t(VOICE_NAMES[v])}
            </button>
          ))}
        </div>
        <article className="kit-letter" aria-live="polite">
          <p className="kit-meta">
            {t('Arrives')} {DELIVERY_DEFAULT} · {t(VOICE_NAMES[voice])}
          </p>
          <h3>{t(c.title)}</h3>
          {paras.map((p, i) => (
            <p key={i} className="kit-p">
              {p}
            </p>
          ))}
          <div className="kit-end">
            <p className="kit-end-k">{t('Something to think about today')}</p>
            <p className="kit-q">{t(c.reflection_question)}</p>
          </div>
          <div className="kit-end">
            <p className="kit-end-k">{t('One small step')}</p>
            <p className="kit-s">{t(c.small_step.text)}</p>
            <p className="kit-min">
              {c.small_step.minutes} {t('min')} · {t(c.small_step.category)}
            </p>
            <div className="kit-step-btns">
              <button
                type="button"
                aria-pressed={step === 'try'}
                className={step === 'try' ? 'on' : undefined}
                onClick={() => setStep(step === 'try' ? '' : 'try')}
              >
                {t('I’ll try it')}
              </button>
              <button
                type="button"
                aria-pressed={step === 'skip'}
                className={step === 'skip' ? 'on' : undefined}
                onClick={() => setStep(step === 'skip' ? '' : 'skip')}
              >
                {t('Not for me')}
              </button>
            </div>
          </div>
        </article>
        <p className="kit-note">
          {t('A scripted sample. Kit is fictional; real letters are written from your own nights.')}
        </p>
      </div>
    </div>
  );
}
