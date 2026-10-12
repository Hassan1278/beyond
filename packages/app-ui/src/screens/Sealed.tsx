/**
 * Sealed for the night. With live AI on, this is also where the letter is
 * actually written: overnight in the product, in a few seconds here.
 */
import { useEffect, type ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { useActions } from '../state/store';

export function Sealed({ state, live }: ScreenProps): ReactElement {
  const { go, generate, requestReflection, cancelReflection } = useActions(live);
  const wantsAi = state.source === 'ai';
  const status = state.ai.status;

  // Start writing as soon as the entry is sealed, once.
  useEffect(() => {
    if (live && wantsAi && status === 'idle') void generate();
  }, [live, wantsAi, status, generate]);
  if (state.product)
    return (
      <div className="v v-sealed">
        <div className="stars" />
        <div className="moon" />
        <div className="sl-body">
          <p className="k">Saved privately</p>
          <h2>Sealed for the night.</h2>
          <p>Your entry is saved. Nothing needs solving tonight.</p>
          {state.product.account?.capabilities.reflections ? (
            <>
              <button
                type="button"
                className="pb light sm"
                onClick={() => void requestReflection()}
              >
                {state.paused
                  ? 'Allow only this entry for a morning letter'
                  : 'Allow this entry, approved memory and past corrections for a morning letter'}
              </button>
              <button
                type="button"
                className="fine-btn"
                onClick={() => {
                  if (state.product?.editing) void cancelReflection(state.product.editing.id);
                }}
              >
                Cancel reflection permission
              </button>
            </>
          ) : (
            <p>AI letters are not connected yet.</p>
          )}
        </div>
        <button type="button" className="pb ghost" onClick={() => go('home')}>
          Back to your journal
        </button>
      </div>
    );

  const writing = wantsAi && status === 'writing';
  const label = writing
    ? 'Reading between the nights…'
    : wantsAi && status === 'ready'
      ? 'Read this morning’s letter'
      : 'Skip to morning (demo)';

  return (
    <div className="v v-sealed">
      <div className="stars" />
      <div className="moon" />
      <div className="sl-body">
        <p className="k">Sealed &middot; 23:59</p>
        <h2>Sealed for the night.</h2>
        <p>
          Your letter arrives at <b>{state.time}</b>. Nothing needs solving tonight.
        </p>
        {writing && (
          <p className="writing" aria-live="polite">
            <i />
            <i />
            <i />
            Beyond is reading tonight&rsquo;s entry next to what it remembers.
          </p>
        )}
        {wantsAi && status === 'error' && state.ai.error && (
          <p className="writing" aria-live="polite" style={{ color: 'var(--dawn)' }}>
            {state.ai.error}
          </p>
        )}
      </div>
      <button
        type="button"
        className={wantsAi && status === 'ready' ? 'pb light' : 'pb ghost'}
        disabled={writing}
        onClick={() => go('letter')}
      >
        {label}
      </button>
    </div>
  );
}
