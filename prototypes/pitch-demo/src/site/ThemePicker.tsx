/**
 * Four dots in the nav. Each swatch is a three-band slice of the palette it
 * switches to - the night it sits on, the accent it carries, the paper it
 * reads on - so the dot previews the page rather than hinting at it.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { applyTheme, readTheme, type ThemeId } from '../lib/theme';

/** night, dawn, paper. Kept in step with themes.css by scripts/contrast.mjs. */
const THEMES: { id: ThemeId; name: string; note: string; bands: [string, string, string] }[] = [
  {
    id: 'night',
    name: 'Night',
    note: 'Graphite, cream, a peach dawn',
    bands: ['#0b0c0e', '#e8b48a', '#f4f3ee'],
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Espresso, sand, a loud amber dawn',
    bands: ['#26150a', '#ff9e3d', '#f7e3c4'],
  },
  {
    id: 'bloom',
    name: 'Bloom',
    note: 'Aubergine, blush, a hot rose dawn',
    bands: ['#27102f', '#ff6fa5', '#fae2ee'],
  },
  {
    id: 'tide',
    name: 'Tide',
    note: 'Petrol, mint, a bright seafoam dawn',
    bands: ['#072630', '#2fe0bb', '#cfe9e4'],
  },
];

const swatch = ([a, b, c]: [string, string, string]): string =>
  `linear-gradient(135deg, ${a} 0 36%, ${b} 36% 64%, ${c} 64% 100%)`;

export function ThemePicker(): ReactElement {
  const [theme, setTheme] = useState<ThemeId>(readTheme);

  return (
    <div className="themes" role="group" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          aria-label={`${t.name} theme`}
          title={`${t.name} — ${t.note}`}
          style={{ '--sw': swatch(t.bands) } as CSSProperties}
          onClick={() => {
            applyTheme(t.id);
            setTheme(t.id);
          }}
        />
      ))}
    </div>
  );
}
