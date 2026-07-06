import type { ReactNode } from 'react';
import { Nav } from '../components/nav';
import { Providers } from '../components/providers';
import './globals.css';

export const metadata = { title: 'Starnes Real Estate Advisors' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,550;9..144,600&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div style={{ display: 'grid', gridTemplateColumns: '224px minmax(0,1fr)', minHeight: '100vh' }}>
            <Nav />
            <main style={{ padding: '30px 40px 48px', maxWidth: 1160, width: '100%' }}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
