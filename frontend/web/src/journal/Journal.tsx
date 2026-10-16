'use client';
import { useEffect, type ReactElement } from 'react';
import { journalBackend } from './backend';
import { demoBackend } from './demo-backend';

/**
 * Mounts the journal app. Its views render themselves into these three
 * elements; React only provides the page around them. The app runs on the
 * live backend, or on the in-memory demo when someone picks the demo.
 */
export function Journal(): ReactElement {
  useEffect(() => {
    void import('./app.js').then(({ startJournal }) => startJournal(journalBackend(), demoBackend));
  }, []);
  return (
    <>
      <div className="ambient" id="ambient" aria-hidden="true" hidden />
      <div className="app" id="app" />
      <div id="layer" />
    </>
  );
}
