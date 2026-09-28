import type { MetadataRoute } from 'next';

// Installable PWA: needed for push on iOS (Home Screen apps only) and gives
// Android a standalone app window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Job Radar',
    short_name: 'Job Radar',
    description: 'Internships and new-grad software roles across India & Singapore.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
