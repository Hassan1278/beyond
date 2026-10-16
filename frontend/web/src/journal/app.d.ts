import type { JournalBackend } from './backend';

/**
 * Starts the journal app in #app, #ambient and #layer. Safe to call twice.
 * `demo` makes a fresh in-memory backend for the demo (no account, no AI).
 */
export function startJournal(backend: JournalBackend, demo: () => JournalBackend): void;
