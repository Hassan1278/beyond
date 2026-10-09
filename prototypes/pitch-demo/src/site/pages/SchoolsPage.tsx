import { useState, type ReactElement } from 'react';
import { SCHOOLS } from '../../data/site';

/**
 * Closes the site. The three audiences sit in a band divided by rules rather
 * than cut into cards, and the beta sign-up is set as the largest type on the
 * site, because leaving an address is the only thing this page asks for.
 */
export function SchoolsPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <>
      <section className="sec night">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">For institutions</p>
            <h2>Somewhere to put it down, provided by the people who look after you.</h2>
            <p className="sub">
              Universities, schools and employers can offer Beyond to their students and staff. Each
              person gets their own private space, and the institution never sees inside it.
            </p>
          </div>

          <div className="audiences">
            {SCHOOLS.map((s) => (
              <section key={s.big}>
                <p className="big">{s.big}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="sec night join">
        <div className="wrap">
          <p className="eyebrow">Beta</p>
          <h2>Tonight, write without an audience.</h2>
          <p className="sub">
            We&rsquo;re opening a small beta for students. Tell us where to reach you, and help
            shape what Beyond becomes.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                  ? 'Thanks! This is a demo page, so nothing was sent yet.'
                  : 'Enter an email address like you@university.edu.',
              );
            }}
          >
            <label className="sr" htmlFor="betaEmail">
              Email
            </label>
            <input
              id="betaEmail"
              type="email"
              value={email}
              placeholder="you@university.edu"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-light">
              Join the beta
            </button>
          </form>
          <p className="msg" aria-live="polite">
            {msg}
          </p>
        </div>
      </section>
    </>
  );
}
