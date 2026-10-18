# Data handling

See [API reference](api.md) and [AI service](ai-service.md) for exact bounds, routes and limits. The public summary is the site's Privacy page (`/#/privacy`).

- **Ownership.** Nights, letters, notes, memories, to-dos and settings are owner-scoped in Postgres through RLS and validated RPCs.
  - Server calls verify Auth and active profiles. Direct reads and RPCs require a live owned Auth session.
  - Original payloads, idempotency keys, job/lease metadata, note source ids, forgotten-memory hashes and AI quotas are private columns or tables.
- **The browser.**
  - Journal text, drafts and letters are held in page memory only, never in localStorage, sessionStorage or offline caches.
  - Unsealed words on today's journal page are also saved to the person's own account as a draft (`user_settings.draft`, a second after typing stops), so nothing is lost if they leave. The draft is never sent to the letter writer or used in any letter or note; sealing clears it. Until migration `20261019000000_drafts` is applied the draft stays in page memory only.
  - The Supabase session (tokens only) is in sessionStorage, so closing the tab signs out.
  - localStorage holds only display choices: write or speak, speech language, demo mode. Colour themes travel in URL parameters and are saved to signed-in accounts, never browser storage.
  - The site's fictional demo keeps what a visitor types in memory only, and clears the storage older versions used.
- **Sealing is consent.**
  - Saving a night alone sends nothing anywhere. Sealing it asks for one letter.
  - Writing again the same night (before 4am, the end of a journal day) adds to that night's entry, with a `[HH:MM]` line before each later part; the night's letter is then written again over everything, so the morning brings one letter.
  - The letter writer then receives only what [the contract](ai-service.md#post-v1letters) lists: that night's words, voice and language, visible memories unless paused, and outlines of up to four earlier letters kept in Patterns.
  - It never receives email, name, account or user ids, other nights, private letters, or forgotten memories.
  - The AI service has no database or admin credentials and stores nothing. Provider requests carry only the prompt.
- **Learned memory.**
  - A letter may learn at most two short things, only from that night's words, and none when it senses a safety concern. Health, mental-health, sexual, religious, political, financial and other people's private details are excluded by the rules.
  - Each memory shows its source and can be edited or forgotten. Forgotten text is kept only as a SHA-256 hash of its normalized form, so it is never relearned.
  - A learned memory is used only while a letter it came from is kept in Patterns.
- **Invalidation.**
  - Editing or deleting a night deletes its letter. Deleting a night also scrubs memories learned from it.
  - Changing, forgetting or pausing memory cancels any letter being written with the old context; it is picked up again with the new one.
  - Keeping a letter private deletes notes built on it.
- **Voice.** When transcription is on, a recording is sent once through the API to the AI service and the provider, and only the words come back. Nothing is stored. Otherwise the browser's own speech recognition or the keyboard's dictation is used.
- **Export, clearing, deletion.**
  - These require a sign-in within the last five minutes; the app asks for the password, or Google, again.
  - Export pages are current live records, not a snapshot.
  - Clearing removes letters, notes, jobs, memories, to-dos and nights, and resets settings.
  - Account deletion blocks the account, purges everything including AI usage counts, then deletes the Auth user.
- **Limits.**
  - Each person gets 6 letters, 10 notes and 40 transcriptions a day, plus the existing request budget.
  - Logs never contain journal text, credentials, provider output or upstream error bodies. Tests use fictional content only.

This is access isolation, not end-to-end encryption: the backend and the AI provider read what they process. Hosted backups, the provider's own retention, and copies a person downloads have lifecycles that deletion here cannot reach. Review the provider's retention terms before real users write.
