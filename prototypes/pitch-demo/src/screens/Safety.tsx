/**
 * Shown instead of Sealed when an entry sounds urgent. A letter that arrives in
 * the morning is not emergency help, and this screen says so before sealing.
 */
import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { HELPLINES } from '../data/content';
import { useActions } from '../state/store';

export function Safety({
  live,
  onSeal,
  onBack,
}: ScreenProps & {
  onSeal?: () => void;
  onBack?: () => void;
}): ReactElement {
  const { go } = useActions(live);
  return (
    <div className="v pad v-safety">
      <p className="k">Before you seal this</p>
      <h2>That sounded heavy.</h2>
      <p className="muted">
        Letters arrive in the morning. If you&rsquo;re not safe right now, that&rsquo;s too long to
        wait. People are available tonight.
      </p>
      {HELPLINES.map((h) => (
        <div className="help" key={h.label}>
          <b>{h.label}</b>
          <span>{h.note}</span>
        </div>
      ))}
      <button type="button" className="pb light mt-auto" onClick={onSeal ?? (() => go('sealed'))}>
        I&rsquo;m okay, seal my entry
      </button>
      <button
        type="button"
        className="linkish"
        style={{ alignSelf: 'center', color: 'var(--mist)' }}
        onClick={onBack ?? (() => go('write'))}
      >
        Back to my entry
      </button>
    </div>
  );
}
