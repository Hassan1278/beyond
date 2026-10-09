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
import { SCREENS, screenById } from './data/content';
import { PAGES } from './data/site';
import { BeyondProvider, useBeyond } from './state/store';
import { Phone } from './components/Phone';
import { PresenterShell } from './presenter/PresenterShell';
import { SiteShell } from './site/SiteShell';
import { HomePage } from './site/pages/HomePage';
import { ProblemPage } from './site/pages/ProblemPage';
import { HowPage } from './site/pages/HowPage';
import { PatternsPage } from './site/pages/PatternsPage';
import { WhyPage } from './site/pages/WhyPage';
import { PrivacyPage } from './site/pages/PrivacyPage';
import { SchoolsPage } from './site/pages/SchoolsPage';
import { useRoute } from './router';

type Shell = 'app' | 'present';

const PHONE = '(max-width: 820px)';

const SITE: Record<string, () => ReactElement> = {
  '/': HomePage,
  '/problem': ProblemPage,
  '/how': HowPage,
  '/patterns': PatternsPage,
  '/why': WhyPage,
  '/privacy': PrivacyPage,
  '/schools': SchoolsPage,
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
  const { state, dispatch, go } = useBeyond();
  return (
    <Phone
      screen={screenById(state.screen)}
      state={state}
      live
      chrome="device"
      onGo={(tab) => go(tab)}
      onCloseSheet={() => dispatch({ type: 'sheet', open: false })}
    />
  );
}

/** #/app, and #/app/<screen> to open the demo on one screen. */
function Demo({ sub }: { sub: string }): ReactElement {
  const { go } = useBeyond();
  const [shell, setShell] = useState<Shell>(() => forcedShell() ?? naturalShell());

  useEffect(() => {
    const match = SCREENS.find((s) => s.id === sub);
    if (match) go(match.id);
    // Only on entry: afterwards the hash follows the screen, not the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forcedShell()) return;
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

  useEffect(() => {
    if (!isDemo) document.body.dataset.mode = 'site';
  }, [isDemo, path]);

  if (isDemo) return <Demo sub={path.slice('/app/'.length)} />;

  const Page = SITE[path] ?? HomePage;
  const meta = PAGES.find((p) => p.path === path) ?? PAGES[0];
  return (
    <SiteShell path={meta.path} time={meta.time}>
      <Page />
    </SiteShell>
  );
}

export default function App(): ReactElement {
  return (
    <BeyondProvider>
      <Routes />
    </BeyondProvider>
  );
}
