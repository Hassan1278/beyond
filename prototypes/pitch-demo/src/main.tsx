import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/phone.css';
import './styles/presenter.css';
import './styles/site.css';
import './styles/pages.css';
import './styles/feed.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline shell, so a venue with bad wifi cannot take the demo down. Scripted
// letters work with no network at all; live AI needs one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = new URL('sw.js', document.baseURI);
    void navigator.serviceWorker.register(url, { scope: './' }).catch(() => {
      /* offline support is a bonus, never a requirement */
    });
  });
}
