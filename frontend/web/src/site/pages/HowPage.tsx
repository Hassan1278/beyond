import type { ReactElement } from 'react';
import { Beats } from '../Beats';
import { TryOneNight } from '../TryOneNight';
import { PatternsSection } from '../PatternsSection';

/**
 * The whole product in one page: the three beats, a night you can actually
 * try, and what it adds up to over months. Patterns used to be its own page,
 * but it is the back half of this story rather than a separate feature.
 */
export function HowPage(): ReactElement {
  return (
    <>
      <section className="sec day">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">How Beyond works</p>
            <h2>Say it whenever. Understand it tomorrow.</h2>
            <p className="sub">
              Beyond keeps expressing and reflecting apart. Write as often as you like, whenever it
              hits &mdash; you get to finish a thought before anything answers it.
            </p>
          </div>
          <Beats />
          <p className="beats-note" data-reveal="">
            Most people write at night, but nothing here is locked to it. Everything you write in a
            day is read together, and one letter arrives the next morning.
          </p>
        </div>
      </section>

      <section className="sec day-2">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">Try one night</p>
            <h2>Leave it for the night. Read it in the morning.</h2>
            <p className="sub">
              Edit the entry if you like, then leave it. Switch voices to see how the same night
              reads from a friend, a mentor, or your future self.
            </p>
          </div>
          <div data-reveal="">
            <TryOneNight />
          </div>
        </div>
      </section>

      <PatternsSection />
    </>
  );
}
