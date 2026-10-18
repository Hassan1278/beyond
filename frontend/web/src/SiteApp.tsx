'use client';
import { useEffect, useState } from 'react';
import { SiteShell } from './site/SiteShell';
import { LandingPage } from './site/LandingPage';
import { useRoute } from './router';
import { MOVED } from './data/landing';
import { useAppHref } from './demo/theme';
import { CopyContext } from './site/copy';
import { useRevealOnScroll } from './site/motion';

export default function SiteApp() {
  const [lang, setLang] = useState<'en' | 'zh'>(() =>
    new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en',
  );
  const route = useRoute();
  const path = MOVED[route] ?? route;
  const app = useAppHref();
  useRevealOnScroll(path + lang);
  useEffect(() => {
    if (route.startsWith('/app')) {
      location.replace(app);
      return;
    }
    if (MOVED[route]) history.replaceState(history.state, '', `${location.search}#${path}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route, path, app]);
  useEffect(() => {
    document.body.dataset.mode = 'site';
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(history.state, '', url);
  }, [lang]);
  return (
    <CopyContext.Provider value={lang}>
      <SiteShell path={path} lang={lang} setLang={setLang}>
        <div className="page" key={path}>
          <LandingPage path={path} />
        </div>
      </SiteShell>
    </CopyContext.Provider>
  );
}
