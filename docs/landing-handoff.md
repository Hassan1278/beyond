# Landing page and app handoff

The marketing site keeps separate Home, Problem, How it works, Privacy and Institutions pages. The glass navigation and footer next-page links follow that order. Old Why/Beta links resolve to How it works.

Home has a glowing “Remove all noise” control and a click-anywhere shortcut. Both run the same whoosh; reduced-motion users get the quiet state without animation. Open Beyond App remains in the top-right.

How it works retains the deployed page’s night-to-morning cards and editable overnight demo. Its default entry and Mentor letter come directly from the app’s fictional Kit night (`l_d13`). Other voices are labelled scripted variations. Editing the sample never sends or saves text and does not generate a personalised letter. No Wrapped, invented growth counters or institutional management/billing features are advertised.

## Shared sources

- `frontend/web/src/copy/shared.ts`: privacy, voice names, delivery default (08:00), theme mapping.
- `frontend/web/src/copy/zh.ts`: Traditional Chinese for shared and landing copy.
- `shared/src/copy/crisis.ts`: the three crisis contacts used by the web app. The independent AI service has a matching list.
- `frontend/web/src/data/kit.ts`: sample references and scripted voice variants.

Gold maps to Candle, Blue to Midnight, and Ink falls back to Blue on the site. Themes travel through URL parameters and account settings, not browser storage.

## Before production rollout

Apply new migrations in order through the normal deployment process, including `20261020000000_direction_labels.sql` from the earlier app work and `20261021000000_journal_theme.sql`. Run the database tests first. Without the theme migration, URL themes still work for the visit but account persistence is unavailable.

Validation in this continuation: 701 unit tests passed, workspace type checks passed, lint passed with three existing warnings, all production builds passed, and palette checks passed. In-app browser checks covered responsive layouts, page links, both themes, Traditional Chinese, the overnight demo and the quiet-state animation. The shell browser runner was blocked by a macOS process restriction; database tests were blocked by the CLI trying to write outside allowed directories. CI must complete those checks.

## Local sign-in

Use `http://localhost:3000/app` with the API running on `http://127.0.0.1:3002`. Existing `.env.local` files supply the real public Supabase configuration. Google sign-in was verified through the callback and into the signed-in app on port 3000.

Earlier previews on ports 3102/3103 were compiled with fictional authentication endpoints for test runs. Do not use those builds for account sign-in. `NEXT_PUBLIC_*` settings are baked into a Next.js build: rebuild with the real local configuration or use the development server. API CORS and Supabase redirect URLs must allow the chosen local origin. No local environment files or credentials belong in Git.
