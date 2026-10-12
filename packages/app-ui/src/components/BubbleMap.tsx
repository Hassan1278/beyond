/**
 * The theme map on the home screen.
 *
 * Seven bubbles, area proportional to how many entries mention each theme,
 * warm ones for what is going well and grey ones for what is not. Tapping a
 * bubble opens its page.
 *
 * Popping is two deliberate acts, because it changes what Beyond will say to
 * someone for weeks afterwards: you turn on pop mode, then hold a bubble until
 * it fills. Either one alone does nothing. A keyboard has no hold, so in pop
 * mode Enter pops immediately - the hold guards against a mis-tap, it is not a
 * confirmation the product needs.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { JournalTheme, ThemeId } from '../types';
import { BOX, pack } from '../lib/bubbles';

/** How long a hold has to last. Matches the fill transition in phone.css. */
const HOLD_MS = 560;
/** Long enough for the burst to be seen, short enough not to feel like a wait. */
const BURST_MS = 300;

export function BubbleMap({
  themes,
  popMode,
  live,
  onOpen,
  onPop,
}: {
  themes: JournalTheme[];
  popMode: boolean;
  live: boolean;
  onOpen: (id: ThemeId) => void;
  onPop: (id: ThemeId) => void;
}): ReactElement {
  const [holding, setHolding] = useState<ThemeId | null>(null);
  const [bursting, setBursting] = useState<ThemeId | null>(null);
  /** The hold in progress, readable from inside a timeout. */
  const held = useRef<ThemeId | null>(null);
  const holdTimer = useRef(0);
  const burstTimer = useRef(0);

  useEffect(() => {
    if (popMode) return;
    held.current = null;
    window.clearTimeout(holdTimer.current);
    window.clearTimeout(burstTimer.current);
    setHolding(null);
    setBursting(null);
  }, [popMode]);

  // Nothing half-finished should outlive the screen.
  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(burstTimer.current);
    },
    [],
  );

  /** Burst first, then tell the store, so the map re-settles into the gap. */
  const burst = (id: ThemeId): void => {
    if (!live || !popMode || bursting) return;
    window.clearTimeout(burstTimer.current);
    held.current = null;
    setHolding(null);
    setBursting(id);
    burstTimer.current = window.setTimeout(() => {
      setBursting(null);
      onPop(id);
    }, BURST_MS);
  };

  const startHold = (id: ThemeId): void => {
    if (!live || !popMode || bursting) return;
    held.current = id;
    setHolding(id);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      if (held.current === id) burst(id);
    }, HOLD_MS);
  };

  const endHold = (): void => {
    held.current = null;
    window.clearTimeout(holdTimer.current);
    setHolding(null);
  };

  // The map is laid out from whatever is left, so popping moves the rest.
  const placed = pack(themes, (t) => t.mentions);

  return (
    <div
      className={`bubbles${popMode ? ' popping' : ''}`}
      style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}
      role="group"
      aria-label={popMode ? 'Themes, pop mode' : 'Recurring themes'}
    >
      {placed.map(({ item, x, y, r }) => {
        const cls = [
          'bub',
          item.tone === 'good' ? 'good' : 'hard',
          holding === item.id ? 'holding' : '',
          bursting === item.id ? 'burst' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={item.id}
            type="button"
            className={cls}
            tabIndex={live ? 0 : -1}
            aria-label={
              popMode
                ? `Pop ${item.name}. ${item.mentions} entries. Hold, or press Enter.`
                : `${item.name}, ${item.mentions} entries`
            }
            style={
              {
                left: `${x}%`,
                top: `${y / (BOX.h / 100)}%`,
                width: `${r * 2}%`,
                '--hold': `${HOLD_MS}ms`,
              } as CSSProperties
            }
            onClick={() => {
              if (!live) return;
              // In pop mode a tap is not enough, and must not open the page.
              if (!popMode) onOpen(item.id);
            }}
            onKeyDown={(e) => {
              if (!live || !popMode || bursting) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                burst(item.id);
              }
            }}
            onPointerDown={() => startHold(item.id)}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
          >
            <span className="fill" aria-hidden="true" />
            <span className="bub-t">
              <b>{item.name}</b>
              <i>{item.mentions}</i>
            </span>
          </button>
        );
      })}
    </div>
  );
}
