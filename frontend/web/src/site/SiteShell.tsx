import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CREDIT, SECTIONS } from '../data/landing';
import { readTheme } from '../demo/theme';
import { ThemePicker } from './ThemePicker';
import { useCopy } from './copy';

export function SiteShell({
  children,
  path,
  lang,
  setLang,
}: {
  children: ReactNode;
  path: string;
  lang: 'en' | 'zh';
  setLang: (lang: 'en' | 'zh') => void;
}) {
  const t = useCopy();
  const active = path.slice(1);
  const pages = [{ path: '/', nav: 'Home' }, ...SECTIONS];
  const next =
    pages[
      (Math.max(
        0,
        pages.findIndex((p) => p.path === path),
      ) +
        1) %
        pages.length
    ];
  const [theme, setTheme] = useState(readTheme);
  const pill = useRef<HTMLDivElement>(null);
  const app = `/app?theme=${theme === 'candle' ? 'gold' : 'blue'}`;
  useEffect(() => {
    const el = pill.current;
    if (!el) return;
    const position = () => {
      const link = el.querySelector<HTMLElement>('[aria-current="page"]');
      el.style.setProperty('--highlight-x', `${link?.offsetLeft ?? 0}px`);
      el.style.setProperty('--highlight-w', `${link?.offsetWidth ?? 0}px`);
      if (link && el.parentElement)
        el.parentElement.scrollTo({
          left: Math.max(
            0,
            link.offsetLeft - el.parentElement.clientWidth / 2 + link.offsetWidth / 2,
          ),
          behavior: 'instant',
        });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, lang]);
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('Skip to content')}
      </a>
      <nav className="landing-nav" aria-label={t('Main navigation')}>
        <div className="landing-nav-inner">
          <a href="#/" className="logo">
            beyond.
          </a>
          <div className="glass-scroll">
            <div className="glass-nav" ref={pill}>
              <span className="glass-highlight" aria-hidden="true" />
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.path}`}
                  aria-current={active === s.id ? 'page' : undefined}
                >
                  {t(s.nav)}
                </a>
              ))}
            </div>
          </div>
          <div className="landing-tools">
            <ThemePicker onChange={setTheme} />
            <button
              className="language-toggle"
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              aria-label={lang === 'en' ? '切換至繁體中文' : 'Switch to English'}
            >
              {lang === 'en' ? '繁中' : 'EN'}
            </button>
            <a href={app} className="btn btn-light btn-sm">
              {t('Open Beyond App')}
            </a>
          </div>
        </div>
      </nav>
      <main tabIndex={-1} id="main" data-app-href={app}>
        {children}
      </main>
      <nav className="page-next" aria-label={t('Next page')}>
        <a href={`#${next.path}`}>
          <span>
            <small>{t('Next')}</small>
            <strong>{t(next.nav)}</strong>
          </span>
          <svg aria-hidden="true" viewBox="0 0 64 32">
            <path d="M2 16h57M44 3l15 13-15 13" />
          </svg>
        </a>
      </nav>
      <footer className="site-footer">
        <div className="foot-in">
          <a href="#/" className="logo">
            beyond.
          </a>
          <p>{t(CREDIT)}</p>
        </div>
      </footer>
    </>
  );
}
