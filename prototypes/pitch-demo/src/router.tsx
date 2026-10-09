/**
 * Hash routing, by hand.
 *
 * Hash rather than history so the build works unchanged on Vercel, Netlify,
 * GitHub Pages and straight off disk - no rewrite rules, no 404 shims, nothing
 * to configure the morning of a pitch.
 *
 *   #/            the site
 *   #/how         a site page
 *   #/app         the phone demo
 *   #/app/write   the phone demo, opened on one screen
 */
import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';

const read = (): string => {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

export function navigate(path: string): void {
  const next = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

export function useRoute(): string {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onHash = (): void => setPath(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return path;
}

/** Replaces the current entry instead of pushing one, for in-page state. */
export function useReplace(): (path: string) => void {
  return useCallback((path: string) => {
    const next = `#${path.startsWith('/') ? path : `/${path}`}`;
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
  }, []);
}

export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}): ReactElement {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={() => {
        onClick?.();
        window.scrollTo({ top: 0 });
      }}
    >
      {children}
    </a>
  );
}
