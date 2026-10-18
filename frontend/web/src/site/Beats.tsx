import { useCopy } from './copy';
/** Tonight, overnight, morning - the three beats of one Beyond day. */
import type { ReactElement } from 'react';
import { BEATS } from '../data/deployed';

export function Beats(): ReactElement {
  const t = useCopy();
  return (
    <ul className="band">
      {BEATS.map((b) => (
        <li className={b.cls} key={t(b.when)} data-reveal="">
          {b.cls === 'b1' && <span className="sky-moon" aria-hidden="true" />}
          {b.cls === 'b2' && <span className="sky-stars" aria-hidden="true" />}
          {b.cls === 'b3' && <span className="sky-sun" aria-hidden="true" />}
          <span className="when">{t(b.when)}</span>
          <h3>{t(b.title)}</h3>
          <p>{t(b.body)}</p>
        </li>
      ))}
    </ul>
  );
}
