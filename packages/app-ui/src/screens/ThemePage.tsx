/**
 * One theme, opened from a bubble.
 *
 * Two parts, in the order someone asks for them: what this theme is across
 * everything they have written, and then the actual lines, with dates. The
 * lines are the evidence for the summary sitting above them, which is the only
 * reason to trust it.
 */
import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { newestFirst, showDate, themeById, withExtract } from '../data/themes';
import { useActions } from '../state/store';

const DIR: Record<'up' | 'down' | 'flat', string> = {
  up: 'Rising',
  down: 'Fading',
  flat: 'Steady',
};

export function ThemePage({ state, live }: ScreenProps): ReactElement {
  const { go } = useActions(live);
  if (state.product)
    return (
      <div className="v pad">
        <button className="back" type="button" onClick={() => go('home')}>
          ← Journal
        </button>
        <div className="th-lines" />
        <p className="fine">No theme history yet.</p>
      </div>
    );
  // The presenter can open this screen with no bubble tapped, so it needs a
  // subject of its own rather than an empty page.
  const theme = withExtract(themeById(state.openTheme ?? 'behind'), state.extract.found);
  const lines = newestFirst(theme.lines);
  const popped = state.popped.includes(theme.id);

  return (
    <div className="v pad">
      <button type="button" className="back" onClick={() => go('home')}>
        &larr; Themes
      </button>

      <div>
        <div className="th-top">
          <h2>{theme.name}</h2>
          <span className={`tone ${theme.tone}`}>
            {theme.tone === 'good' ? 'Going well' : 'Hard'}
          </span>
        </div>
        <p className="k">
          {theme.mentions} entries &middot; {DIR[theme.dir]} &middot; since Oct 2024
        </p>
      </div>

      <p className="th-sum">{theme.summary}</p>
      <p className="fine">
        Fictional sample history. Lines marked New come from this demo entry in live mode.
      </p>

      {popped && (
        <p className="th-off">
          This theme is hidden on the home map. It is still here, and the entries are kept.
        </p>
      )}

      <div className="th-lines">
        <p className="k">Journal entries on {theme.name.toLowerCase()}</p>
        <ul>
          {lines.map((l) => (
            <li key={`${l.date}-${l.text}`} className={l.fresh ? 'fresh' : undefined}>
              <q>{l.text}</q>
              <time dateTime={l.date}>
                {showDate(l.date)}
                {l.fresh && <b>New</b>}
              </time>
            </li>
          ))}
        </ul>
        <p className="fine">
          {lines.length} of {theme.mentions}, pulled from your entries as they were written.
        </p>
      </div>
    </div>
  );
}
