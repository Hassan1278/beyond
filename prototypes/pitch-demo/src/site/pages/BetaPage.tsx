import { useState, type ReactElement } from 'react';
import { Link } from '../../router';

/**
 * The last page, and the only one that asks for anything. Two ways to go: try
 * the app now, or leave an address. The demo button lives here because this is
 * the point where someone actually wants to see it.
 */
export function BetaPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <section className="sec night join">
      <div className="wrap">
        <p className="eyebrow">Beta</p>
        <h2>Tonight, write without an audience.</h2>
        <p className="sub">
          Beyond is opening a small beta for young people who want somewhere to think that is not
          competing for their attention. Try the app first, then tell us where to reach you.
        </p>

        <div className="ctas beta-ctas" data-reveal="">
          <Link to="/app" className="btn btn-light">
            Open the app demo
          </Link>
          <Link to="/how" className="btn btn-ghost">
            See how it works
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                ? 'Thanks! This is a demo page, so nothing was sent yet.'
                : 'Enter an email address like you@example.com.',
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
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-dark">
            Join the beta
          </button>
        </form>
        <p className="msg" aria-live="polite">
          {msg}
        </p>
      </div>
    </section>
  );
}
