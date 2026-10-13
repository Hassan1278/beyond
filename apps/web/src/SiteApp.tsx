'use client';
/**
 * The site and the app demo, in one build.
 *
 *   #/ #/problem #/how ...   short site pages
 *   #/app                    the phone demo
 *
 * Inside #/app there are two shells. On a phone (or an installed PWA) Beyond
 * fills the screen and behaves like the app; on a laptop it opens inside the
 * phone frame with the flow list and the notes you pitch from. `?mode=app` or
 * `?mode=present` forces either one.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { SCREENS } from '@beyond/app-ui/data/content';
import { PAGES } from './data/site';
import { BeyondProvider, useBeyond } from '@beyond/app-ui/state/store';
import { PresenterShell } from './presenter/PresenterShell';
import { SiteShell } from './site/SiteShell';
import { HomePage } from './site/pages/HomePage';
import { ProblemPage } from './site/pages/ProblemPage';
import { HowPage } from './site/pages/HowPage';
import { WhyPage } from './site/pages/WhyPage';
import { PrivacyPage } from './site/pages/PrivacyPage';
import { InstitutionsPage } from './site/pages/InstitutionsPage';
import { BetaPage } from './site/pages/BetaPage';
import { useRoute } from './router';
import { AppPhone } from '@beyond/app-ui';
import { webRuntime } from './runtime';
import { useRouteTransition, useRevealOnScroll } from './site/motion';

type Shell = 'app' | 'present';

const PHONE = '(max-width: 820px)';

const SITE: Record<string, () => ReactElement> = {
  '/': HomePage,
  '/problem': ProblemPage,
  '/how': HowPage,
  '/why': WhyPage,
  '/privacy': PrivacyPage,
  '/institutions': InstitutionsPage,
  '/beta': BetaPage,
};

/** Old links keep working after the restructure. */
const MOVED: Record<string, string> = {
  '/patterns': '/how',
  '/schools': '/institutions',
};

function forcedShell(): Shell | null {
  const p = new URLSearchParams(window.location.search).get('mode');
  return p === 'app' || p === 'present' ? p : null;
}

function naturalShell(): Shell {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && Boolean(window.navigator.standalone));
  return standalone || window.matchMedia(PHONE).matches ? 'app' : 'present';
}

/** The app as the phone sees it: no bezel, no notes, nothing around it. */
function AppShell(): ReactElement {
  return <AppPhone />;
}

/** #/app, and #/app/<screen> to open the demo on one screen. */
function Demo({ sub }: { sub: string }): ReactElement {
  const { go } = useBeyond();
  const [shell, setShell] = useState<Shell>(() =>
    new URLSearchParams(window.location.search).get('demo') === '1'
      ? (forcedShell() ?? naturalShell())
      : 'app',
  );

  useEffect(() => {
    const match = SCREENS.find((s) => s.id === sub);
    if (match) go(match.id);
    // Only on entry: afterwards the hash follows the screen, not the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forcedShell() || new URLSearchParams(window.location.search).get('demo') !== '1') return;
    const mq = window.matchMedia(PHONE);
    const onChange = (): void => setShell(naturalShell());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.body.dataset.mode = shell;
  }, [shell]);

  return shell === 'app' ? (
    <AppShell />
  ) : (
    <PresenterShell
      onOpenApp={() => {
        setShell('app');
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

function Routes(): ReactElement {
  const path = useRoute();
  const isDemo = path === '/app' || path.startsWith('/app/');

  // The visible page lags the URL just long enough for the old one to leave.
  const resolved = MOVED[path] ?? path;
  const { shown, leaving } = useRouteTransition(resolved, 220);
  const visible = isDemo ? path : shown;
  useRevealOnScroll(visible);

  useEffect(() => {
    if (!isDemo) document.body.dataset.mode = 'site';
  }, [isDemo, path]);

  if (isDemo) return <Demo sub={path.slice('/app/'.length)} />;

  const Page = SITE[visible] ?? HomePage;
  const navMeta = PAGES.find((p) => p.path === resolved) ?? PAGES[0];
  return (
    <SiteShell path={navMeta.path} time={navMeta.time}>
      <div className={`page${leaving ? ' is-leaving' : ''}`} key={visible}>
        <Page />
      </div>
    </SiteShell>
  );
}

export default function SiteApp(): ReactElement {
  const path = useRoute();
  const isApp = path === '/app' || path.startsWith('/app/');
  const demo = !isApp || new URLSearchParams(window.location.search).get('demo') === '1';
  return (
    <BeyondProvider
      key={demo ? 'demo' : 'product'}
      demo={demo}
      runtime={demo ? undefined : webRuntime()}
    >
      <Routes />
    </BeyondProvider>
  );
}
