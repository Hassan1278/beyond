'use client';
import { useEffect, type ReactElement } from 'react';
import type { AppRuntime } from './runtime';
import { screenById } from './data/content';
import { Phone } from './components/Phone';
import { BeyondProvider, useBeyond } from './state/store';
export { BeyondProvider, useBeyond } from './state/store';
export type { AppRuntime, AuthAdapter, Identity } from './runtime';
export type { BeyondState } from './types';

export function AppPhone({ chrome = 'device' }: { chrome?: 'device' | 'frame' }): ReactElement {
  const { state, go, dispatch, refresh } = useBeyond();
  const unavailable = state.product && state.product.status !== 'ready';
  return (
    <>
      <Phone
        screen={screenById(unavailable ? 'welcome' : state.screen)}
        state={state}
        live
        chrome={chrome}
        onGo={go}
        onCloseSheet={() => dispatch({ type: 'sheet', open: false })}
      />
      {state.product?.status === 'error' && (
        <button className="pb ghost" type="button" onClick={() => void refresh()}>
          Retry connection
        </button>
      )}
      {state.product?.notice && state.screen !== 'welcome' && (
        <p className="app-notice" role="status">
          {state.product.notice}
        </p>
      )}
    </>
  );
}
export function AppRoot({
  runtime,
  demo = false,
}: {
  runtime?: AppRuntime;
  demo?: boolean;
}): ReactElement {
  useEffect(() => {
    document.body.dataset.mode = 'app';
  }, []);
  return (
    <BeyondProvider runtime={runtime} demo={demo}>
      <AppPhone />
    </BeyondProvider>
  );
}
