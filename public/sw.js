// Çevrimdışı oynama: kurulumda derlemedeki bütün dosyalar indirilir, sonra önbellekten verilir.
// Liste ve sürüm derlemede doldurulur (vite.config.ts); geliştirmede service worker kayıtlı değil.
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';
const CACHE = `kervan-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(Array.isArray(PRECACHE) ? PRECACHE : []))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Modül scriptleri Origin başlığıyla gelir; sunucunun Vary'si yüzünden eşleşme kaçmasın
      const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        // Çevrimdışıyken gezinme isteklerine ana sayfa
        if (req.mode === 'navigate') return (await cache.match('./')) ?? Response.error();
        throw err;
      }
    }),
  );
});
