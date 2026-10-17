/**
 * The journal's own wording in Chinese (Simplified, written for Mandarin readers).
 *
 * The app is written in English. When Chinese is on, this swaps the app's fixed
 * wording on the page as it appears: text, placeholders and labels. It never
 * touches what a person writes, their letters, or anything inside a text field.
 * The choice is a display setting, kept in this browser only.
 */
import { ZH, ZH_PATTERNS } from './zh';

export type UiLang = 'en' | 'zh';

const KEY = 'beyond.ui-lang';
const ATTRS = ['placeholder', 'aria-label', 'title', 'data-tip'];
/* Never translated: anything typed, and the parts of the page that hold a person's own words. */
const SKIP = [
  'textarea, script, style, [data-i18n-skip], [contenteditable]',
  // letters, quotes, search snippets and memories: someone's words, never the app's
  '.greet, .headline, .ls-body > p:not(.cause), .insight, .quote, .issue, .cause span, .words, .remembers li, .signoff',
  '.snip, mark, .mem > p, .todo > p, .ev-list .link, .lt-body, .lt-q, .lt-s',
].join(', ');
const LATIN = /[A-Za-z]/;

let lang: UiLang = 'en';
try {
  lang = localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en';
} catch {
  /* storage blocked: English */
}

export const uiLang = (): UiLang => lang;

export function setUiLang(next: UiLang): void {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* still switches for this visit */
  }
  syncDocumentLang();
}

function syncDocumentLang(): void {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
  document.documentElement.dataset.ui = lang;
}

/** The Chinese for one piece of the app's wording, or null when it isn't the app's. */
export function translate(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // a few prompts are written in Cantonese; those have exact entries too
  const hit = ZH[t] ?? (LATIN.test(t) ? fromPattern(t) : null);
  return hit === null ? null : text.replace(t, hit);
}

function fromPattern(t: string): string | null {
  for (const [re, to] of ZH_PATTERNS) {
    const m = t.match(re);
    if (m) return to(...m.slice(1));
  }
  return null;
}

function skipped(el: Element | null): boolean {
  return !el || !!el.closest(SKIP);
}

function translateText(node: Text): void {
  if (skipped(node.parentElement)) return;
  const zh = translate(node.nodeValue ?? '');
  if (zh !== null && zh !== node.nodeValue) node.nodeValue = zh;
}

/* Labels and placeholders are the app's own, even on a text field. */
function translateAttrs(el: Element): void {
  if (el.closest('[data-i18n-skip]')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const zh = translate(v);
    if (zh !== null && zh !== v) el.setAttribute(a, zh);
  }
}

function translateTree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  translateAttrs(el);
  el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach(translateAttrs);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) translateText(n as Text);
}

let observer: MutationObserver | null = null;

/** Watches the page and translates the app's wording as it renders. Call once. */
export function startTranslating(): void {
  syncDocumentLang();
  if (observer) return;
  observer = new MutationObserver((records) => {
    if (lang !== 'zh') return;
    for (const r of records) {
      if (r.type === 'characterData') translateText(r.target as Text);
      else if (r.type === 'attributes') translateAttrs(r.target as Element);
      else r.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
  if (lang === 'zh') translateTree(document.body);
}
