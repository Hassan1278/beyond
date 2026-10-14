import type { JournalBackend } from './backend';

/** Starts the journal app in #app, #ambient and #layer. Safe to call twice. */
export function startJournal(backend: JournalBackend): void;
