// Service worker. Файл-шаблон: версию и список файлов подставляет vite.config.js при сборке.
const VERSION = '__VERSION__';
const SHELL_CACHE = `tartil-shell-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((u) => new Request(new URL(u, self.registration.scope), { cache: 'reload' }))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Старые версии оболочки удаляем; кэш аудио (tartil-audio-*) не трогаем.
      for (const name of await caches.keys()) {
        if (name.startsWith('tartil-shell-') && name !== SHELL_CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // аудио и прочее внешнее — забота приложения
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === 'navigate') {
          const index = await cache.match(new URL('./', self.registration.scope).href);
          if (index) return index;
        }
        throw err;
      }
    })(),
  );
});
