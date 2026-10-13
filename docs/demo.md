# Demo and connected app

Run `npm run dev:web` from the root. The marketing site is `/#/`; the real private app is `/#/app` with configured Supabase/API environments. The real app never substitutes demo accounts/history if configuration fails.

The existing pitch presentation is `/?demo=1#/app`, with `mode=present` or `mode=app` to choose the shell. Its letters/themes/history are explicitly fictional and have no provider calls. The original typography, palette, CSS, marketing SVG feed, QR/presenter and screens are retained after moving source into web/shared workspaces. Run `npm run test:design` and `npm run test:palette` to render/check those original designs.

Product demonstrations use fictional fixture accounts on local Supabase and the real backend: login, writing/editing/reload, approved memories, tasks, export/content clear/logout/owner isolation. While production AI is deferred, real letter/pattern/Wrapped areas stay empty. Do not imply model results, voice recording or deployment are working. Speak remains disabled for the current text MVP.

The old pitch offline cache is retired. An installed old worker deletes only Beyond-owned cache entries and unregisters; product content is never cached offline. [Connected app milestone](connected-app.md) contains remaining release/AI/native work.
