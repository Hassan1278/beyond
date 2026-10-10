/**
 * Four dots in the nav. Each swatch is split so you can see both halves of the
 * palette it switches to - the night it sits on and the accent it carries.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { applyTheme, readTheme, type ThemeId } from '../lib/theme';

const THEMES: { id: ThemeId; name: string; note: string; swatch: string }[] = [
  {
    id: 'night',
    name: 'Night',
    note: 'Graphite, cream, a peach dawn',
    swatch: 'linear-gradient(135deg,#0b0c0e 50%,#e8b48a 50%)',
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Warm and grounded, amber dawn',
    swatch: 'linear-gradient(135deg,#0d0a08 50%,#e2863f 50%)',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    note: 'Plum night, blush paper, rose dawn',
    swatch: 'linear-gradient(135deg,#0c0910 50%,#e2799f 50%)',
  },
  {
    id: 'tide',
    name: 'Tide',
    note: 'Petrol night, seafoam dawn',
    swatch: 'linear-gradient(135deg,#060e10 50%,#4fc2a8 50%)',
  },
];

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
          style={{ '--sw': t.swatch } as CSSProperties}
          onClick={() => {
            applyTheme(t.id);
            setTheme(t.id);
          }}
        />
      ))}
    </div>
  );
}
