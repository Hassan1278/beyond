import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { NOISE } from '../data/content';
import { useActions } from '../state/store';
import { AuthForm } from '../components/AuthForm';

export function Welcome({ state, live }: ScreenProps): ReactElement {
  const { go, dispatch } = useActions(live);
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
        {state.product?.authOpen ? (
          <AuthForm />
        ) : (
          <button
            type="button"
            className="pb light"
            disabled={state.product?.status === 'setup' || state.product?.status === 'loading'}
            onClick={() => (state.product ? dispatch({ type: 'auth/open' }) : go('voice'))}
          >
            Step beyond
          </button>
        )}
        {state.product?.status === 'setup' && (
          <p className="fine">Account connection is not configured on this host yet.</p>
        )}
        {state.product?.status === 'loading' && (
          <p className="fine" role="status">
            Opening your journal…
          </p>
        )}
        <p className="fine">Beyond is not therapy or emergency support.</p>
      </div>
    </div>
  );
}
