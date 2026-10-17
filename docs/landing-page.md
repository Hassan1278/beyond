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


## Why some of it is copied rather than lifted

The page was drawn against the standalone prototype, and the journal has moved
on from it: a lantern with no night side, a different display face, its own
chart furniture. Lifting alone gave a page that was *nearly* the prototype,
which reads worse than either.

So the end of `landing.css` carries a block of the prototype's own rules,
copied once from the standalone build. The star map is deliberately left out:
the chart is still the journal's, drawing the journal's sample, and still
tracks it. Everything else in `#try` and under the chart is the prototype's.

**That block is not generated.** Editing the journal will not change it. If the
app's letter or chart furniture is redesigned and the page should follow, the
rules have to be brought across again.

One thing it cannot carry is behaviour: the journal's `lanternVars` returns the
brightness pair but not the terminator pair, because its lantern has no night
side. `page.js` adds the missing two off the same curve, or the planet draws as
a sliver.

## Two resets, and why they are `:where()`

`landing.css` opens with two blocks that look like dead weight and are not.

The first hands the page's own elements back their defaults, because the page
and the site share 92 class names.

The second does the same one level in: **110 of the class names the app's
components use are also the site's**. The site's `.qcard` is a 142px flex card;
the app's is a ledger row. Elements leak too - `.sec h2` was sizing the letter's
section labels at 68px.

Both use `:where()`, which contributes nothing to specificity. That is the whole
trick: the blocks weigh exactly `.landing` and `.landing .bui`, heavy enough to
block the site's rules and no heavier than the components' own, which still win
on source order. **Raising their specificity breaks the components**, and an
earlier attempt at this with a plain selector flattened every heading inside
every component.

## The landing page does not go through SiteShell

`/` returns `<LandingPage />` on its own. The shell would wrap it in a second
nav and a second footer, and the shell's nav sits on top of the page's own tabs.

It skips the route-transition wrapper for a second reason: that div is
transformed, which makes it the containing block for anything `position: fixed`,
and the page's star layer would stretch to the height of the document instead of
the window - the same 260 stars spread thin enough to look like a bug.

## The phone screenshots

The three phones in "Beyond, in your pocket" are **photographs of this app**,
taken at phone size with demo mode on, so they carry Kit's fictional sample and
nobody's real nights. They live in `public/shots/`.

They are the one part of the page that cannot keep itself in sync. **If the
app's design changes, retake them.**

## Where "Enter Beyond" goes

`/app`, in three places: the nav, the pocket section, and the beta line. Same
project, so nothing to configure.

## Beyond for you, and the prices that are not there yet

`#for-you` holds three tiers — Personal, Team, Enterprise. It replaced the
schools-and-teams section so that one person has a place in it too, and the nav
tab is "For you".

The tiers are **display only**. Nothing links out, because there is nowhere
honest to link yet: the app is free to open and no plan is priced. Each card
carries a placeholder instead:

```html
<p class="price is-soon">Pricing soon</p>
```

When a price exists, swap that one line for the shape the stylesheet already
holds, and drop `is-soon`:

```html
<p class="price"><b>HK$38</b><span>per month</span></p>
```

Each tier lists what it covers directly. There is no disclosure to open: three
short lists read faster than three buttons, and nothing is hidden behind a
click.

Two things in there are load-bearing rather than decorative:

- `.tier-grid` uses `repeat(3,minmax(0,1fr))`, not `repeat(3,1fr)`. Plain `1fr`
  is `minmax(auto,1fr)`, so "Enterprise" at full size widened its own column and
  the three stopped matching at around 830px.
- `.tier .big` is `clamp(30px,3.4vw,42px)`. At 42px the word is 196px wide, which
  is more than a third-width card has to give once the gutters close in.

The copy claims only what the privacy section already claims — whoever pays for
access cannot read what someone writes. Keep those two in step.

## Known rough edges

- The small labels inside lifted components use the journal's caps monospace,
  which reads as dated beside the rest of the page. It is the app's own styling,
  so it is left alone rather than overridden here.
- The page renders on the client, like the rest of the site, so `/` serves a
  shell and fills in after hydration.
