# The landing page

`/` is the landing page. It is one component, `src/site/LandingPage.tsx`, which
renders `landing/markup.ts` in one piece and wires it up with `landing/page.js`
when the route mounts. The earlier React home page is still there at `/old`.

It was carried across whole rather than decomposed, which is the same shape as
`journal/app.js`: markup stays markup, behaviour stays imperative, and the two
can still be read against each other line by line.

## It shows the journal, not a picture of the journal

`scripts/lift-journal.mjs` reads `src/journal/app.js` and `src/journal/journal.css`
at build time and pulls out what the page needs — the chart, the letter's
section labels, the memory rows, the writing surface — into
`src/site/landing/lifted.css` and `lifted.js`. Change the chart in the app and
the chart on the landing page changes with it.

```
npm run lift --workspace=@beyond/web    # regenerate
npm run build --workspace=@beyond/web   # regenerates first, then builds
```

**Do not edit `landing/lifted.css` or `landing/lifted.js`.** They are generated,
and the header of each says so. Edit the app and run the lift.

Everything in `app.js` lives inside `startJournal()`, so none of it can be
imported. The lift works because the prototype's flat layout leaves the
declarations at column 0. It:

- follows the lifted code's dependencies transitively, so state like
  `lastSkyKey` and helpers like `sparkle` come across with it;
- brings the app's own `:root` tokens with them, rescoped, so the components
  keep their colours — `--cream`, `--amber`, `--dusk` and the rest;
- **throws if the app stops defining something the page is built from**, rather
  than shipping a blank section. If that happens, update `SHARED_JS` and the
  page together.

Everything lifted is scoped to `.bui`. That is what lets the app's `.letter`,
`.k` and `.mem` sit in the same document as the site's own classes.

## Why there is a reset at the top of `landing.css`

The page and the rest of the site share **92 class names** — `.eyebrow`,
`.hint`, `.btn`, `.post`, `.hero` and so on. The page was drawn as a page of its
own, with no other stylesheet in the document, and the site's rules were
reaching into it and supplying properties its own stylesheet never mentions.

`landing.css` is scoped to `.landing`, and the block at the top hands those
elements back the blank slate the page was drawn against. If either side adds a
class that the other already uses, regenerate it.

## The phone screenshots

The three phones in "Beyond, in your pocket" are **photographs of this app**,
taken at phone size with demo mode on, so they carry Kit's fictional sample and
nobody's real nights. They live in `public/shots/`.

They are the one part of the page that cannot keep itself in sync. **If the
app's design changes, retake them.**

## Where "Enter Beyond" goes

`/app`, in three places: the nav, the pocket section, and the beta line. Same
project, so nothing to configure.

## Known rough edges

- The small labels inside lifted components use the journal's caps monospace,
  which reads as dated beside the rest of the page. It is the app's own styling,
  so it is left alone rather than overridden here.
- The page renders on the client, like the rest of the site, so `/` serves a
  shell and fills in after hydration.
