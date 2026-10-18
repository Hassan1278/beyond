import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from './LandingPage';
import { CopyContext } from './copy';
import { AI_SENT, AI_NEVER, PRIVACY_POINTS, appToSite, DELIVERY_DEFAULT } from '../copy/shared';
import { SHARED_ZH } from '../copy/zh';
import { MOVED } from '../data/landing';
import SAMPLE from '../journal/sample.json';

function page(lang: 'en' | 'zh', path = '/') {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(
    <CopyContext.Provider value={lang}>
      <LandingPage path={path} />
    </CopyContext.Provider>,
  );
  return root;
}
describe('landing page contract', () => {
  it('uses Kit’s exact demo night and mentor letter', () => {
    const root = page('en', '/how');
    const night = SAMPLE.find((n) => n.id === 'l_d13')!;
    expect(root.querySelector('textarea')?.textContent).toBe(
      night.entries.map((e) => `${e.t} · ${e.text}`).join('\n\n'),
    );
    expect(
      [...root.querySelectorAll('.sample-letter-paragraph')].map((p) => p.textContent).join('\n\n'),
    ).toBe(night.content.body);
    expect(root.querySelector('.sample-question')?.textContent).toBe(
      night.content.reflection_question,
    );
    expect(root.querySelectorAll('.step .what')[1]?.textContent).toBe(
      night.content.small_step.text,
    );
    expect(root.querySelector('.letter-head .meta')?.textContent).toContain(DELIVERY_DEFAULT);
  });
  it('renders the shared privacy manifest and no retired content', () => {
    const root = page('en', '/privacy');
    expect([...root.querySelectorAll('.privacy-manifest li')].map((p) => p.textContent)).toEqual([
      ...AI_SENT,
      ...AI_NEVER,
    ]);
    expect(root.textContent).not.toMatch(
      /Join the beta|Quarterly Wrapped|Great Depression|Sample Growth|1,200 calories/,
    );
    expect(PRIVACY_POINTS).toHaveLength(3);
    expect(MOVED['/why']).toBe('/how');
    expect(MOVED['/beta']).toBe('/how');
    expect(appToSite('candle')).toBe('gold');
    expect(appToSite('ink')).toBe('blue');
  });
  it('translates all landing copy and shared onboarding privacy into Traditional Chinese', () => {
    const root = document.createElement('div');
    for (const path of ['/', '/problem', '/how', '/privacy', '/institutions'])
      root.append(page('zh', path));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const untranslated = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim() ?? '';
      if (/[A-Za-z]{3}/.test(text) && !/[\u3400-\u9fff]/.test(text) && text !== 'beyond.')
        untranslated.push(text);
    }
    expect(untranslated).toEqual([]);
    for (const point of PRIVACY_POINTS) {
      expect(SHARED_ZH[point.title]).toBeTruthy();
      expect(SHARED_ZH[point.text]).toBeTruthy();
    }
  });
});
