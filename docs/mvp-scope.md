# MVP scope

The goal is one consistent flow on web, Android, and iOS: sign in, write a journal entry, receive a scheduled reflection, correct it, and control retained memories.

## Required

- Authentication and session recovery on web/mobile.
- Create, read, edit, and delete personal journal entries.
- Durable delayed reflection delivery with a visible pending/failed state.
- Read reflections and preserve user corrections separately.
- Explicitly approve and remove retained memories.
- Timezone and reflection schedule settings.
- Entry/account deletion that also handles outstanding jobs and retained data according to the documented rules.
- Loading, empty, validation, error, and expired-session states.
- Meaningful access-control tests, fictional AI evaluations, and an end-to-end demo.

The first usable vertical slice can process a reflection immediately in staging to validate the pipeline. The final MVP uses the durable schedule; production must not depend on a phone timer or request continuing after it has returned.

## Deferred

Social features, shared journals, billing, offline synchronization, complex notifications, attachments, multiple AI providers, and custom native platform modules. Store submission comes after beta validation. Docker packaging is optional after apps launch.

## Decisions to settle before implementation

Exact reflection schedule choices, text and memory limits, retention of memories after source deletion, AI provider/model, and the first beta platform. The draft API and build plan identify the owners who confirm these. No vendor subscription or app-store identifier has been registered.
