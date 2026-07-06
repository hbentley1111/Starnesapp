import type { ReactNode } from 'react';
import { Nav } from '../components/nav';
import { Providers } from '../components/providers';
import './globals.css';

// NOTE: swap the font-stack vars in globals.css for next/font/google
// (Instrument Sans + IBM Plex Mono) once building in a network-open
// environment — this sandbox blocks fonts.googleapis.com.
export const metadata = { title: 'Starnes RE Advisors' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <Providers>
        <div style={{ display: 'grid', gridTemplateColumns: '218px minmax(0,1fr)', minHeight: '100vh' }}>
          <Nav />
          <main style={{ padding: '26px 32px', maxWidth: 1080 }}>{children}</main>
        </div>
        </Providers>
      </body>
    </html>
  );
}
