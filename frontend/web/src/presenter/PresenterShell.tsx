/**
 * The pitch view. Same app as the phone sees, with the flow on the left and the
 * notes you talk from on the right.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ScreenId } from '@beyond/app-ui/types';
import { SCREENS, screenById, screenIndex } from '@beyond/app-ui/data/content';
import { useBeyond } from '@beyond/app-ui/state/store';
import { Phone } from '@beyond/app-ui/components/Phone';
import { QrPanel } from '../components/QrPanel';
import { Link } from '../router';
import { ThemePicker } from '../site/ThemePicker';
import { DemoControls } from './DemoControls';
import { Gallery } from './Gallery';

type Mode = 'proto' | 'all';

export function PresenterShell({ onOpenApp }: { onOpenApp: () => void }): ReactElement {
  const { state, dispatch, go } = useBeyond();
  const [mode, setMode] = useState<Mode>(() =>
    window.location.hash.endsWith('/all') ? 'all' : 'proto',
  );
  const [qr, setQr] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const screen = screenById(state.screen);
  const i = Math.max(0, screenIndex(state.screen));

  // Keep the address bar pointing at the current screen, so a reload lands back.
  useEffect(() => {
    const hash = mode === 'all' ? '#/app/all' : `#/app/${state.screen}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [mode, state.screen]);

  // When the flow collapses to a scrolling strip, keep the current step visible.
  useEffect(() => {
    const ol = listRef.current;
    if (!ol || ol.scrollWidth <= ol.clientWidth) return;
    const active = ol.querySelector<HTMLElement>('[aria-current="step"]');
    const li = active?.parentElement;
    if (!li) return;
    ol.scrollTo({
      left: li.offsetLeft - ol.offsetLeft - (ol.clientWidth - li.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [state.screen]);

  const openInProto = (id: ScreenId): void => {
    setMode('proto');
    go(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <header className="top">
        <Link to="/" className="logo">
          beyond.
        </Link>
        <span className="tag">App preview</span>
        <div className="modes" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'proto'}
            onClick={() => setMode('proto')}
          >
            Prototype
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'all'}
            onClick={() => setMode('all')}
          >
            All screens
          </button>
        </div>
        <ThemePicker />
        <button type="button" className="link" onClick={() => setQr(true)}>
          Open on a phone
        </button>
        <button type="button" className="link" onClick={onOpenApp}>
          Full-screen app &rarr;
        </button>
        <Link to="/" className="link">
          &larr; Website
        </Link>
      </header>

      <main>
        {mode === 'proto' ? (
          <section className="proto" aria-label="Clickable prototype">
            <nav className="steps" aria-label="Screens">
              <p className="eyebrow">The flow</p>
              <ol ref={listRef}>
                {SCREENS.map((sc, n) => (
                  <li key={sc.id}>
                    <button
                      type="button"
                      aria-current={n === i ? 'step' : undefined}
                      onClick={() => go(sc.id)}
                    >
                      <span className="n">{String(n + 1).padStart(2, '0')}</span>
                      <span>
                        {sc.title}
                        {sc.branch && <span className="branch">Branch</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="stage">
              <Phone
                screen={screen}
                state={state}
                live
                chrome="frame"
                onGo={(tab) => go(tab)}
                onCloseSheet={() => dispatch({ type: 'sheet', open: false })}
              />
              <div className="pager">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => go(SCREENS[Math.max(0, i - 1)].id)}
                >
                  &larr; Back
                </button>
                <span className="pos">
                  {String(i + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  disabled={i === SCREENS.length - 1}
                  onClick={() => go(SCREENS[Math.min(SCREENS.length - 1, i + 1)].id)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            <aside className="info" aria-live="polite">
              <p className="eyebrow">
                Screen {String(i + 1).padStart(2, '0')}
                {screen.branch ? ' · branch' : ''}
              </p>
              <h2>{screen.title}</h2>
              <p className="lead">{screen.lead}</p>
              <ul>
                {screen.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <DemoControls screen={screen} />
            </aside>
          </section>
        ) : (
          <Gallery onOpen={openInProto} />
        )}
      </main>

      {qr && <QrPanel onClose={() => setQr(false)} />}
    </>
  );
}
