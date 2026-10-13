import { useState, type ReactElement } from 'react';
import { takeSignupEmail } from '../signup-intent';
import { useBeyond } from '../state/store';

/** Functional controls reuse the existing typography, fields and buttons. */
export function AuthForm(): ReactElement {
  const { state, dispatch, auth, google } = useBeyond();
  const [email, setEmail] = useState(takeSignupEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const mode = state.product!.authMode;
  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void auth(mode, email.trim(), password).finally(() => {
          setPassword('');
          setBusy(false);
        });
      }}
    >
      <p className="k">
        {mode === 'recovery'
          ? 'Choose a new password'
          : mode === 'signup'
            ? 'Create your account'
            : 'Sign in to Beyond'}
      </p>
      {mode !== 'recovery' && (
        <label className="k">
          Email
          <input
            type="email"
            autoComplete="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      <label className="k">
        Password
        <input
          type="password"
          name="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          minLength={mode === 'signin' ? 1 : 8}
          maxLength={128}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="pb light" disabled={busy}>
        {busy
          ? 'Please wait…'
          : mode === 'recovery'
            ? 'Update password'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
      </button>
      {mode !== 'recovery' && (
        <>
          <button
            type="button"
            className="pb ghost"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void google().finally(() => setBusy(false));
            }}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="fine-btn"
            disabled={busy}
            onClick={() =>
              dispatch({ type: 'auth/mode', mode: mode === 'signin' ? 'signup' : 'signin' })
            }
          >
            {mode === 'signin' ? 'Create an account' : 'Already have an account? Sign in'}
          </button>
          <button
            type="button"
            className="fine-btn"
            disabled={busy || !email.trim()}
            onClick={() => {
              setBusy(true);
              void auth('reset', email.trim(), '').finally(() => setBusy(false));
            }}
          >
            Send password reset email
          </button>
        </>
      )}
      {state.product!.notice && (
        <p className="fine" role="status">
          {state.product!.notice}
        </p>
      )}
    </form>
  );
}
