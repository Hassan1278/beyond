import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { NOISE } from '../data/content';
import { useActions } from '../state/store';

export function Welcome({ live }: ScreenProps): ReactElement {
  const { go } = useActions(live);
  return (
    <div className="v v-welcome">
      <div className="wn" aria-hidden="true">
        {NOISE.map((n) => (
          <span key={n.text} style={n.style}>
            {n.text}
          </span>
        ))}
      </div>
      <div className="w-body">
        <div className="w-logo">beyond.</div>
        <h1>Everyone is telling you who to become.</h1>
        <p>Say what&rsquo;s on your mind tonight. Understand it tomorrow.</p>
        <button type="button" className="pb light" onClick={() => go('voice')}>
          Step beyond
        </button>
        <p className="fine">Beyond is not therapy or emergency support.</p>
      </div>
    </div>
  );
}
