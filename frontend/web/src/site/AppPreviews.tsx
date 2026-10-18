/**
 * What builds over time: small, faithful drawings of three app pages, in the
 * site's current colours (they use the same tokens). Not screenshots, so they
 * follow the theme and never show anyone's real journal.
 */
import { useCopy } from './copy';
import type { ReactElement } from 'react';

function Constellation(): ReactElement {
  const t = useCopy();
  const bubbles = [
    { x: 64, y: 70, r: 34, t: ['Curious', 'Learner'] },
    { x: 216, y: 58, r: 40, t: ['Community', 'Builder'] },
    { x: 168, y: 136, r: 28, t: ['Creative', 'Explorer'] },
  ];
  return (
    <svg viewBox="0 0 280 170" className="pv-svg" aria-hidden="true">
      <circle cx="140" cy="86" r="62" className="pv-orbit" />
      {bubbles.map((b) => (
        <line key={t(b.t[0])} x1="140" y1="86" x2={b.x} y2={b.y} className="pv-thread" />
      ))}
      <circle cx="140" cy="86" r="17" className="pv-you" />
      <text x="140" y="90" className="pv-you-t" textAnchor="middle">
        {t('You')}
      </text>
      {bubbles.map((b) => (
        <g key={t(b.t[0])}>
          <circle cx={b.x} cy={b.y} r={b.r} className="pv-bubble" />
          <text x={b.x} y={b.y - 2} className="pv-bt" textAnchor="middle">
            {t(b.t[0])}
          </text>
          <text x={b.x} y={b.y + 11} className="pv-bt" textAnchor="middle">
            {t(b.t[1])}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Growth(): ReactElement {
  const t = useCopy();
  return (
    <svg viewBox="0 0 280 170" className="pv-svg" aria-hidden="true">
      <text x="10" y="16" className="pv-k">
        {t('PASSION COMPASS')}
      </text>
      <circle cx="62" cy="92" r="40" className="pv-ring" />
      <line x1="62" y1="52" x2="62" y2="132" className="pv-axis" />
      <line x1="22" y1="92" x2="102" y2="92" className="pv-axis" />
      <line x1="62" y1="92" x2="34" y2="92" className="pv-needle" />
      <circle cx="62" cy="92" r="5" className="pv-dot" />
      <text x="62" y="46" className="pv-small" textAnchor="middle">
        {t('what you love')}
      </text>
      <text x="62" y="146" className="pv-small" textAnchor="middle">
        {t('what matters')}
      </text>
      <text x="150" y="16" className="pv-k">
        {t('ENERGY MAP')}
      </text>
      <rect x="208" y="30" width="62" height="56" rx="6" className="pv-hot" />
      <line x1="150" y1="86" x2="270" y2="86" className="pv-axis" />
      <line x1="208" y1="26" x2="208" y2="146" className="pv-axis" />
      <circle cx="232" cy="46" r="4" className="pv-dot" />
      <circle cx="252" cy="62" r="4" className="pv-dot" />
      <circle cx="222" cy="70" r="4" className="pv-dot" />
      <circle cx="170" cy="118" r="4" className="pv-dim" />
      <text x="238" y="40" className="pv-small">
        {t('tutoring')}
      </text>
      <text x="178" y="130" className="pv-small">
        {t('cram class')}
      </text>
      <text x="208" y="160" className="pv-small" textAnchor="middle">
        {t('drains you')}
      </text>
    </svg>
  );
}

function Book(): ReactElement {
  const t = useCopy();
  const lines = Array.from({ length: 7 }, (_, i) => 52 + i * 15);
  return (
    <svg viewBox="0 0 280 170" className="pv-svg" aria-hidden="true">
      <rect x="10" y="12" width="260" height="146" rx="6" className="pv-book" />
      <line x1="140" y1="12" x2="140" y2="158" className="pv-spine" />
      <text x="22" y="32" className="pv-date">
        {t('Sat 15 Aug')}
      </text>
      <text x="152" y="32" className="pv-date">
        {t('Today')}
      </text>
      <line x1="22" y1="38" x2="128" y2="38" className="pv-rule" />
      <line x1="152" y1="38" x2="258" y2="38" className="pv-rule" />
      <text x="26" y="50" className="pv-time">
        4:10pm
      </text>
      {lines.map((y) => (
        <line key={`l${y}`} x1="22" y1={y + 4} x2="128" y2={y + 4} className="pv-dots" />
      ))}
      {lines.map((y) => (
        <line key={`r${y}`} x1="152" y1={y + 4} x2="258" y2={y + 4} className="pv-dots" />
      ))}
      <rect x="22" y="56" width="96" height="4" rx="2" className="pv-ink" />
      <rect x="22" y="71" width="82" height="4" rx="2" className="pv-ink" />
      <text x="26" y="96" className="pv-time">
        11:20pm
      </text>
      <rect x="22" y="101" width="100" height="4" rx="2" className="pv-ink" />
      <rect x="22" y="116" width="70" height="4" rx="2" className="pv-ink" />
      <text x="156" y="60" className="pv-write">
        {t('Write anything')}
      </text>
    </svg>
  );
}

export function AppPreviews(): ReactElement {
  const t = useCopy();
  return (
    <div className="previews">
      <figure className="preview" data-reveal="">
        <Constellation />
        <figcaption>
          <h3>{t('Who are you becoming')}</h3>
          <p>{t('Every bubble is a growing identity that keeps showing up in your journal.')}</p>
        </figcaption>
      </figure>
      <figure className="preview" data-reveal="">
        <Growth />
        <figcaption>
          <h3>{t('Where you come alive')}</h3>
          <p>
            {t('Your passion compass, and an energy map of what lifts you up and what drains you.')}
          </p>
        </figcaption>
      </figure>
      <figure className="preview" data-reveal="">
        <Book />
        <figcaption>
          <h3>{t('Your journal')}</h3>
          <p>{t('A book of your days you can flip back through, each night with its letter.')}</p>
        </figcaption>
      </figure>
    </div>
  );
}
