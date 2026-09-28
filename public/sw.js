// Job Radar service worker: shows push alerts and opens the right page on tap.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = { title: 'Job Radar', body: 'New matching roles', url: '/' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch { /* plain-text payload */ }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    tag: d.tag || 'jobs',
    renotify: true,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    // Postings open in a new window; the app itself reuses an open tab.
    if (!url.startsWith(self.location.origin)) return self.clients.openWindow(url);
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => c.url.startsWith(self.location.origin));
    if (w) { await w.navigate(url); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
