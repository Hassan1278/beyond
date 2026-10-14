import type { ReactNode } from 'react';
import '../../styles/app/tokens.css';
import '../../styles/app/base.css';
import '../../styles/app/phone.css';
import '../../styles/presenter.css';
import '../../styles/site.css';
import '../../styles/pages.css';
import '../../styles/feed.css';
import '../../styles/motion.css';
import '../../styles/wrapped.css';
import '../../styles/app/themes.css';
import '../../styles/app/controls.css';
export const metadata = { title: 'Beyond', description: 'Say it tonight. Understand it tomorrow.' };
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15100e',
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
