// Service worker: офлайн-работа.
// Стратегия «сначала кэш, обновление в фоне»: приложение открывается мгновенно
// и без сети, а новая версия с GitHub Pages подхватывается при следующем запуске.
const CACHE = 'budget-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Ключ кэша без ?параметров, чтобы ./?today=... тоже работал офлайн
  const key = url.origin + url.pathname;

  const network = fetch(key, { cache: 'no-cache' })
    .then(async (res) => {
      if (res && res.ok && !res.redirected) {
        const c = await caches.open(CACHE);
        await c.put(key, res.clone());
      }
      return res;
    })
    .catch(() => null);

  e.waitUntil(network);
  e.respondWith(
    caches.open(CACHE)
      .then((c) => c.match(key))
      .then((cached) => cached || network.then((res) => {
        if (res) return res;
        if (req.mode === 'navigate') return caches.match(new URL('./index.html', self.registration.scope).href);
        return Response.error();
      }))
  );
});
