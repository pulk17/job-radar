import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Radar',
  description: 'Internships and new-grad software roles at 200+ top-paying companies across India & Singapore, with instant alerts.',
  robots: 'noindex',
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Job Radar', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  colorScheme: 'dark',
  viewportFit: 'cover',  // lets the bottom nav sit above the home indicator via safe-area insets
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
