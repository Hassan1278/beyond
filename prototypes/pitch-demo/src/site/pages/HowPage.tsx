import type { ReactElement } from 'react';
import { Beats } from '../Beats';
import { TryOneNight } from '../TryOneNight';

export function HowPage(): ReactElement {
  return (
    <>
      <section className="sec day">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">How Beyond works</p>
            <h2>Say it tonight. Understand it tomorrow.</h2>
            <p className="sub">
              Beyond keeps expressing and reflecting apart. You get to finish a thought before
              anything answers it.
            </p>
          </div>
          <Beats />
        </div>
      </section>

      <section className="sec day-2">
        <div className="wrap">
          <div className="sec-head" data-reveal="lead">
            <p className="eyebrow">Try one night</p>
            <h2>Leave it for the night. Read it in the morning.</h2>
            <p className="sub">
              Edit the entry if you like, then leave it for the night. Switch voices to see how the
              same night reads from a friend, a mentor, or your future self.
            </p>
          </div>
          <div data-reveal="">
            <TryOneNight />
          </div>
        </div>
      </section>
    </>
  );
}
