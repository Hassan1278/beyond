/**
 * Two dots in the nav: Gold and Blue, the same two palettes as the journal app.
 * Each swatch is a three-band slice of the palette it switches to.
 */
import { useCopy } from './copy';
import { useState, type CSSProperties, type ReactElement } from 'react';
import { applyTheme, readTheme, type ThemeId } from '../demo/theme';

const THEMES: { id: ThemeId; name: string; bands: [string, string, string] }[] = [
  { id: 'candle', name: 'Gold', bands: ['#15100e', '#f3c68e', '#f6ecdf'] },
  { id: 'night', name: 'Blue', bands: ['#0b0d17', '#b3b8ff', '#e9ebf7'] },
];

const swatch = ([a, b, c]: [string, string, string]): string =>
  `linear-gradient(135deg, ${a} 0 36%, ${b} 36% 64%, ${c} 64% 100%)`;

export function ThemePicker({ onChange }: { onChange?: (id: ThemeId) => void }): ReactElement {
  const translate = useCopy();
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  return (
    <div className="themes" role="group" aria-label={translate('Colour theme')}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          aria-label={translate(`${t.name} theme`)}
          title={translate(t.name)}
          style={{ '--sw': swatch(t.bands) } as CSSProperties}
          onClick={() => {
            applyTheme(t.id);
            setTheme(t.id);
            onChange?.(t.id);
          }}
        />
      ))}
    </div>
  );
}
