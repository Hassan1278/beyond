import type { ReactElement } from 'react';
import { INSTITUTIONS } from '../../data/site';

/**
 * The three audiences sit in a band divided by rules rather than cut into
 * cards. The beta sign-up used to close this page; it now has one of its own,
 * so this page can be about the institution rather than the individual.
 */
export function InstitutionsPage(): ReactElement {
  return (
    <section className="sec night">
      <div className="wrap">
        <div className="sec-head" data-reveal="lead">
          <p className="eyebrow">For institutions</p>
          <h2>Somewhere to put it down, provided by the people who look after you.</h2>
          <p className="sub">
            Universities, schools and employers can offer Beyond to the people in their care. Each
            person gets their own private space, and the institution never sees inside it.
          </p>
        </div>

        <div className="audiences">
          {INSTITUTIONS.map((s) => (
            <section key={s.big} data-reveal="">
              <p className="big">{s.big}</p>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
