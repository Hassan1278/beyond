'use client';
/**
 * The marketing site, with hash routes so it works on any static host.
 *
 *   #/ #/problem #/how ...   short site pages
 *   /app                     the journal itself (its own page, real accounts)
 *
 * Old #/app links go straight to /app. The interactive pieces on the site
 * (one tonight, patterns) use clearly fictional demo content only.
 */
import { useEffect, type ReactElement } from 'react';
import { PAGES } from './data/site';
import { DemoProvider } from './demo/store';
import { SiteShell } from './site/SiteShell';
import { LandingPage } from './site/LandingPage';
import { HomePage } from './site/pages/HomePage';
import { ProblemPage } from './site/pages/ProblemPage';
import { HowPage } from './site/pages/HowPage';
import { WhyPage } from './site/pages/WhyPage';
import { PrivacyPage } from './site/pages/PrivacyPage';
import { InstitutionsPage } from './site/pages/InstitutionsPage';
import { BetaPage } from './site/pages/BetaPage';
import { useRoute } from './router';
import { useRouteTransition, useRevealOnScroll } from './site/motion';

const SITE: Record<string, () => ReactElement> = {
  '/': LandingPage,
  '/old': HomePage,
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

function Routes(): ReactElement | null {
  const path = useRoute();
  const isApp = path === '/app' || path.startsWith('/app/');
  const resolved = MOVED[path] ?? path;
  const { shown, leaving } = useRouteTransition(resolved, 220);
  useRevealOnScroll(shown);

  useEffect(() => {
    if (isApp) window.location.replace('/app');
    else document.body.dataset.mode = 'site';
  }, [isApp, path]);

  if (isApp) return null;
  const Page = SITE[shown] ?? HomePage;
  const navMeta = PAGES.find((p) => p.path === resolved) ?? PAGES[0];
  return (
    <SiteShell path={navMeta.path} time={navMeta.time}>
      <div className={`page${leaving ? ' is-leaving' : ''}`} key={shown}>
        <Page />
      </div>
    </SiteShell>
  );
}

export default function SiteApp(): ReactElement {
  return (
    <DemoProvider>
      <Routes />
    </DemoProvider>
  );
}
