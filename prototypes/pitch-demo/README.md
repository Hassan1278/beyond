# Beyond — site + app demo

Say it tonight. Understand it tomorrow.

A React + TypeScript build of Beyond, for the HK Inter-University GenAI Hackathon for SDGs
2026 (SDG 3). One build, two halves, sharing one deploy and one URL:

- **The site** — seven short pages instead of one long scroll. Hash routes, so it works on any
  host with no rewrite rules: `#/`, `#/problem`, `#/how`, `#/patterns`, `#/why`, `#/privacy`,
  `#/schools`.
- **The app demo** at `#/app`. On a phone it fills the screen and behaves like the app; add it
  to the home screen and it launches without browser chrome. On a laptop it opens inside the
  phone frame, with the flow list on the left and the notes you pitch from on the right, plus an
  **All screens** gallery. Force either with `?mode=app` or `?mode=present`.

The site and the app share one store, so an entry typed on **How it works** is the entry waiting
in the app demo, and live AI letters work in both.

## Where this sits in the monorepo

This is a **prototype for the pitch**, not production code. It lives in `prototypes/` rather than
`apps/`, deliberately:

- It is outside the `apps/*` and `packages/*` workspace globs, so it has its own
  `package-lock.json` and never touches the root lockfile. Run `npm install` **in this folder**,
  not from the repository root.
- `apps/mobile` is Expo / React Native and `apps/web` is Next.js. This is a Vite single-page app,
  so it does not belong in either and does not replace them.
- Nothing here imports from `packages/shared` or calls the real API. The letter endpoint in
  `api/letter.ts` is self-contained and exists so the demo can show a real generated letter.

Treat the screens and copy as the reference the production UI is built towards.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173, also on your LAN for phone testing
```

| Command           | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Dev server, including the `/api/letter` function        |
| `npm run build`   | Typecheck, then build to `dist/`                        |
| `npm run preview` | Serve the built `dist/` (no API; letters stay scripted) |
| `npm run smoke`   | Render all nine screens in both shells and check them   |
| `npm run icons`   | Regenerate the home-screen icons                        |

## The pages

| Route        | Page         | What it carries                                                                    |
| ------------ | ------------ | ---------------------------------------------------------------------------------- |
| `#/`         | Home         | The noise (every word is a button), the three beats, one headline stat             |
| `#/problem`  | The problem  | The Great Distraction, the symptoms, all four survey stats                         |
| `#/how`      | How it works | The three beats, then **Try one night** — write an entry, seal it, read the letter |
| `#/patterns` | Patterns     | Monthly review, Life Film, and the memory controls                                 |
| `#/why`      | Why Beyond   | The four-way comparison against chatbots, therapy and journaling apps              |
| `#/privacy`  | Privacy      | What is kept, what is sent, what Beyond is not, and the helplines                  |
| `#/schools`  | For schools  | Institutions, and the beta sign-up                                                 |

Each page carries its own time, and the clock in the nav runs from night to morning as you move
through them — the scroll-driven clock from the single-page version, kept.

Copy lives in `src/data/site.ts`. The beta form validates the address and says plainly that
nothing is sent; wire it to an endpoint if you want real sign-ups.

## The nine screens

`src/data/content.ts` holds every word of the app, in flow order:

1. **Welcome** — the noise, then quiet
2. **Choose a letter voice** — Friend, Mentor, Future you, Plain diary, and the delivery time
3. **Tonight** — one action, no feed, no streaks
4. **Night entry** — write or speak; nothing replies
5. **Sealed** — the entry waits until morning (and, with live AI on, the letter is written here)
6. **Morning letter** — what you said, what keeps coming back, one small step
7. **Patterns & Life Film** — monthly themes, one film frame per month
8. **Memory & settings** — see, forget or pause everything Beyond keeps
9. **Safety check** — a branch, shown instead of Sealed when an entry sounds urgent

The safety branch triggers on the entry text (`src/lib/safety.ts`), so you can type something
heavy on stage and watch it fire. There is also a button for it in the presenter notes.

## Letters: scripted or live

**Scripted** is the default and needs nothing: four fixed letters, no network, no key, no risk
on stage. **Live AI** sends the entry actually typed on the phone to Claude and shows the letter
it writes back. Switch between them in the app under **You → Letter writer**, or from the
presenter notes on the entry, sealed and letter screens.

The key never reaches the browser. `api/letter.ts` reads `ANTHROPIC_API_KEY` from the server
environment; the client only ever talks to `/api/letter`. If the key is missing, the host has no
functions, the request fails or the model declines, the app falls back to a scripted letter
without showing an error — someone who has just written about a hard night should not be shown
a stack trace where their letter was meant to be.

```bash
cp .env.example .env.local      # then put your key in it
npm run dev
```

Defaults: `claude-opus-5-5`, effort `low` (letters are a writing task, and the demo wants them
back in seconds), structured JSON output so the five parts of the letter always parse. Override
with `BEYOND_MODEL` / `BEYOND_EFFORT`. The endpoint throttles to 30 letters per IP per hour
(`BEYOND_RATE_LIMIT`) — the demo link is public during a pitch, so also set a spend limit on the
key.

## Deploy, then show it on a phone

**Vercel** (the function works as-is):

```bash
npx vercel            # first run links the project
npx vercel --prod
```

Then add `ANTHROPIC_API_KEY` under Project → Settings → Environment Variables and redeploy.

**Netlify** uses `netlify/functions/letter.mts`, wired to the same path by `netlify.toml`:

```bash
npx netlify deploy --prod
```

**GitHub Pages** works for the app itself but has no serverless functions, so letters stay
scripted. Build with the repo path as the base:

```bash
BEYOND_BASE=/your-repo-name/ npm run build
```

Once it is live, open the app demo on a laptop and click **Open on a phone** in the header: that
shows a QR code pointing at `?mode=app#/app`. Judges scan it and get the app full-screen on their
own phone.

## Notes on the build

- **Styling** is the original CSS from `mobile.html` and `index.html`, kept as written:
  `src/styles/tokens.css` holds the design tokens, `phone.css` the app, `presenter.css` the pitch
  view, `site.css` the site. No utility framework, so the type and spacing are exactly as designed.
- **Routing** is ~50 lines of hash routing in `src/router.tsx`. Hash rather than history so the
  same build runs on Vercel, Netlify, GitHub Pages and straight off disk, with nothing to
  configure the morning of a pitch.
- **State** is one reducer in `src/state/store.tsx`. The presenter's step list and the app's own
  buttons move the same `screen`, so both shells always agree.
- **Persistence** is localStorage, guarded everywhere (it throws in private windows). Restart
  from **You → Restart this demo**, or the presenter's **Restart the prototype**.
- **Dates** are live — tonight and tomorrow morning — rather than a frozen date.
- **Offline**: the service worker caches the shell, so scripted letters work with no network.
  Live AI needs one.
- **Helplines** are the Hong Kong services from the original design (18111, Open Up, 999). They
  are in `HELPLINES` in `src/data/content.ts` if the audience changes.

## What this demo is not

Beyond does not diagnose or treat anything, and the morning letter is never emergency support.
The safety check exists because a letter that arrives at 07:30 is the wrong answer to a night
that needs help now.
