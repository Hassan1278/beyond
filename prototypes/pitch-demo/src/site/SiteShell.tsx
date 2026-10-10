/**
 * Nav, clock and footer around every site page.
 *
 * The long single-page version ran a clock from night to morning as you
 * scrolled. Here each page carries its own time and the clock tweens to it when
 * you move, so the journey survives the split.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from '../router';
import { CREDIT, PAGES } from '../data/site';
import { ThemePicker } from './ThemePicker';

const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const fmt = (mins: number): string => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function Clock({ time }: { time: string }): ReactElement {
  const [mins, setMins] = useState(() => toMin(time));
  const raf = useRef(0);
  const from = useRef(toMin(time));

  useEffect(() => {
    const target = toMin(time);
    const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 0 : 700;
    let diff = (((target - from.current) % 1440) + 1440) % 1440;
    if (diff > 720) diff -= 1440;
    const base = from.current;

    const step = (now: number): void => {
      const k = dur ? Math.min(1, (now - start) / dur) : 1;
      const eased = 1 - Math.pow(1 - k, 3);
      const value = base + diff * eased;
      setMins(value);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [time]);

  const hour = Math.floor((((Math.round(mins) % 1440) + 1440) % 1440) / 60);
  return (
    <span
      className={`clock${hour >= 6 && hour < 19 ? ' sun' : ''}`}
      title="The site runs from night to morning"
    >
      <i />
      <span>{fmt(mins)}</span>
    </span>
  );
}

export function SiteShell({
  path,
  time,
  children,
}: {
  path: string;
  time: string;
  children: ReactNode;
}): ReactElement {
  const links = PAGES.filter((p) => p.nav);
  const i = links.findIndex((p) => p.path === path);
  const next = i >= 0 && i < links.length - 1 ? links[i + 1] : null;

  return (
    <>
      <nav className="nav" aria-label="Main">
        <div className="nav-in">
          <Link to="/" className="logo">
            beyond.
          </Link>
          <div className="nav-links">
            {links.map((p) => (
              <Link key={p.path} to={p.path} className={p.path === path ? 'on' : undefined}>
                {p.nav}
              </Link>
            ))}
          </div>
          <ThemePicker />
          <Clock time={time} />
          <Link to="/app" className="btn btn-light btn-sm">
            Open the app
          </Link>
        </div>
      </nav>

      <main>{children}</main>

      {next && (
        <section className="sec night" style={{ paddingBlock: 0 }}>
          <div className="next">
            <span>
              <span className="label">Next</span>
              <Link to={next.path}>{next.title} &rarr;</Link>
            </span>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="foot-in">
          <Link to="/" className="logo">
            beyond.
          </Link>
          <p>{CREDIT}</p>
        </div>
      </footer>
    </>
  );
}
