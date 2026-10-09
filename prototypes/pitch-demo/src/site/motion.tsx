/**
 * Motion primitives for the site.
 *
 * Three jobs, deliberately small:
 *   useRouteTransition - the old page leaves before the new one arrives
 *   useRevealOnScroll  - elements marked [data-reveal] enter as they come up
 *   Presence           - content that toggles gets an exit, not just an entrance
 *
 * Everything collapses to zero duration under prefers-reduced-motion, and the
 * reveal has a timeout fallback so content can never be left invisible if an
 * observer never fires.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

const reduced = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------ page change */

/**
 * Holds the outgoing page on screen while it animates away, then swaps. The
 * page is chosen by `shown`, so the previous one stays mounted for `ms`
 * without any need to stash its elements.
 */
export function useRouteTransition(path: string, ms = 220): { shown: string; leaving: boolean } {
  const [shown, setShown] = useState(path);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (path === shown) return;
    if (reduced()) {
      setShown(path);
      window.scrollTo({ top: 0 });
      return;
    }
    setLeaving(true);
    const t = window.setTimeout(() => {
      setShown(path);
      setLeaving(false);
      window.scrollTo({ top: 0 });
    }, ms);
    return () => window.clearTimeout(t);
  }, [path, shown, ms]);

  return { shown, leaving };
}

/* ---------------------------------------------------------------- reveals */

/**
 * One observer for every [data-reveal] element on the page, re-scanned when
 * `key` changes. Elements reveal in document order with a small stagger, so a
 * section arrives as one gesture rather than each child fading independently.
 */
export function useRevealOnScroll(key: string): void {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!nodes.length) return;

    const show = (el: HTMLElement, i = 0): void => {
      el.style.transitionDelay = `${Math.min(i, 6) * 55}ms`;
      el.classList.add('in');
    };

    if (reduced() || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('in'));
      return;
    }

    // Groups share a stagger: siblings under one parent arrive together.
    const order = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const parent = el.parentElement ?? document.body;
          const i = order.get(parent) ?? 0;
          order.set(parent, i + 1);
          show(el, i);
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    nodes.forEach((n) => io.observe(n));

    // Never leave content hidden because an observer did not fire.
    const safety = window.setTimeout(() => {
      nodes.forEach((n) => n.classList.add('in'));
    }, 2500);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [key]);
}

/* --------------------------------------------------------------- presence */

/**
 * Keeps `children` mounted long enough to animate out. Use where something
 * genuinely appears and disappears, so the exit shows what changed.
 */
export function Presence({
  show,
  ms = 260,
  className = '',
  children,
}: {
  show: boolean;
  ms?: number;
  className?: string;
  children: ReactNode;
}): ReactElement | null {
  const [mounted, setMounted] = useState(show);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (show) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    if (reduced()) {
      setMounted(false);
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, ms);
    return () => window.clearTimeout(timer.current);
  }, [show, ms, mounted]);

  if (!mounted) return null;
  return <div className={`${className} swap ${leaving ? 'swap-out' : 'swap-in'}`}>{children}</div>;
}
