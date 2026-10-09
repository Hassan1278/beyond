/** Every screen in flow order. Tap one to open it in the live prototype. */
import type { ReactElement } from 'react';
import { SCREENS } from '../data/content';
import { freshState } from '../state/store';
import { Phone } from '../components/Phone';
import type { ScreenId } from '../types';

const noop = (): void => undefined;

export function Gallery({ onOpen }: { onOpen: (id: ScreenId) => void }): ReactElement {
  const still = freshState();
  return (
    <section className="all" aria-label="All screens">
      <p className="intro">
        Every screen in the Beyond app, in flow order. Tap a phone to open it in the clickable
        prototype.
      </p>
      <div className="grid">
        {SCREENS.map((sc, i) => (
          <figure className="g-item" key={sc.id}>
            <button
              type="button"
              className="g-open"
              aria-label={`Open ${sc.title} in the prototype`}
              onClick={() => onOpen(sc.id)}
            >
              <Phone
                screen={sc}
                state={{ ...still, screen: sc.id }}
                live={false}
                chrome="frame"
                onGo={noop}
                onCloseSheet={noop}
              />
            </button>
            <figcaption>
              <span className="n">
                {String(i + 1).padStart(2, '0')}
                {sc.branch ? ' · branch' : ''}
              </span>
              <b>{sc.title}</b>
              <span>{sc.short}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
