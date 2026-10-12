/**
 * Where the bubbles sit.
 *
 * Deliberately deterministic: no randomness anywhere, so the map renders
 * identically on the server, on a reload, and on the second run-through of a
 * pitch. Same themes in, same picture out.
 *
 * Circles start on a golden-angle spiral from the middle, biggest first, then
 * a short relaxation pushes overlapping pairs apart and pulls everything back
 * toward the centre. Popping a theme re-runs it with one fewer circle, which
 * is what makes the rest drift into the gap.
 */

/** The coordinate space the layout works in; the component scales it to %. */
export const BOX = { w: 100, h: 104 };

/** How much of the box the circles should cover. */
const FILL = 0.46;
const GAP = 2.2;
const STEPS = 180;
/** 2pi / phi^2: the angle that spaces a spiral most evenly. */
const GOLDEN = 2.399963229728653;

export interface Placed<T> {
  item: T;
  /** Centre and radius, in BOX units. */
  x: number;
  y: number;
  r: number;
}

/**
 * @param items  anything, heaviest drawn largest
 * @param weight the number that sets the area of each circle
 */
export function pack<T>(items: T[], weight: (t: T) => number): Placed<T>[] {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => weight(b) - weight(a));
  const total = sorted.reduce((sum, t) => sum + Math.max(weight(t), 0.5), 0);
  const k = Math.sqrt((FILL * BOX.w * BOX.h) / (Math.PI * total));

  const cx = BOX.w / 2;
  const cy = BOX.h / 2;
  const out: Placed<T>[] = sorted.map((item, i) => {
    const r = k * Math.sqrt(Math.max(weight(item), 0.5));
    // The spiral's first point is the centre, so the largest circle lands there.
    const a = i * GOLDEN;
    const d = Math.sqrt(i) * (BOX.w / 7.2);
    return { item, r, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
  });

  for (let step = 0; step < STEPS; step++) {
    // Separate: any overlapping pair gives way equally.
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const [a, b] = [out[i], out[j]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const want = a.r + b.r + GAP;
        // Two circles exactly on top of each other have no direction to move
        // in, so nudge along x and let the next pass sort it out.
        const d = Math.hypot(dx, dy) || 0.001;
        if (d >= want) continue;
        const push = (want - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    // Gather, so the map stays a cluster rather than spreading to the corners.
    for (const c of out) {
      c.x += (cx - c.x) * 0.045;
      c.y += (cy - c.y) * 0.045;
      c.x = Math.min(BOX.w - c.r, Math.max(c.r, c.x));
      c.y = Math.min(BOX.h - c.r, Math.max(c.r, c.y));
    }
  }

  return out;
}
