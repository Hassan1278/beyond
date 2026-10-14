import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import '../../journal/journal.css';

export const metadata: Metadata = {
  title: 'Beyond',
  description: 'Write tonight. Nothing replies. A letter arrives in the morning.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-180.png' },
  appleWebApp: { capable: true, title: 'Beyond', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15100e',
};

/** The journal app has its own page shell, separate from the marketing site. */
export default function JournalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
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
