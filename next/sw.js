// Offline start for the new app (scope: this folder). Network first; cloud requests are never cached.
const V = 'abi2-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './moon.jpg', './fil.jpg'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('abi2-') === 0 && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
});
