// Service worker. Файл-шаблон: версию и список файлов подставляет vite.config.js при сборке.
const VERSION = '916a0d7a5473';
const SHELL_CACHE = `tartil-shell-${VERSION}`;
const PRECACHE = ["./","./assets/amiri-quran-KGeJaptg.woff2","./assets/index-D7y85lpN.js","./assets/index-zsgnFmkH.css","./assets/inter-cyrillic-DqGufNeO.woff2","./assets/inter-latin-Dx4kXJAl.woff2","./data/reciters.json","./data/surah/001.json","./data/surah/078.json","./data/surah/079.json","./data/surah/080.json","./data/surah/081.json","./data/surah/082.json","./data/surah/083.json","./data/surah/084.json","./data/surah/085.json","./data/surah/086.json","./data/surah/087.json","./data/surah/088.json","./data/surah/089.json","./data/surah/090.json","./data/surah/091.json","./data/surah/092.json","./data/surah/093.json","./data/surah/094.json","./data/surah/095.json","./data/surah/096.json","./data/surah/097.json","./data/surah/098.json","./data/surah/099.json","./data/surah/100.json","./data/surah/101.json","./data/surah/102.json","./data/surah/103.json","./data/surah/104.json","./data/surah/105.json","./data/surah/106.json","./data/surah/107.json","./data/surah/108.json","./data/surah/109.json","./data/surah/110.json","./data/surah/111.json","./data/surah/112.json","./data/surah/113.json","./data/surah/114.json","./data/surahs.json","./data/tajweed-rules.json","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/icon-maskable.svg","./icons/icon.svg","./index.html","./manifest.webmanifest"];

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
