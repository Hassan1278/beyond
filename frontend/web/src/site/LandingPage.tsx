'use client';

/**
 * The landing page.
 *
 * Carried across whole from the standalone page rather than decomposed into
 * components, the same way the journal app was carried into `journal/app.js`:
 * the markup stays markup and the behaviour stays imperative, so changes on
 * either side can still be read against each other line by line.
 *
 * What it shows of the app is not a drawing of it. `scripts/lift-journal.mjs`
 * takes the chart, the letter and the memory rows out of `journal/app.js` and
 * `journal.css` at build time into `landing/lifted.*`, so editing the app edits
 * the landing page with it. Everything lifted is scoped to `.bui`, which is why
 * the app's class names can sit beside this page's own.
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { LANDING_MARKUP } from './landing/markup';
import { runLanding } from './landing/page';

export function LandingPage(): ReactElement {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // the markup is in the document by now, so the page can be wired up
    const stop = runLanding();
    return () => { stop(); };
  }, []);

  return (
    <div
      className="landing"
      ref={root}
      // The markup is this repo's own file, not anything a visitor supplied.
      dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }}
    />
  );
}
