const CACHE_NAME = 'iptv-cache-v1';
// تەنها فایلە جێگیرەکان پاشەکەوت دەکەین
const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './admin.js',
  './manifest.json'
];

// قۆناغی دامەزراندن
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('فایلە جێگیرەکان پاشەکەوت کران');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// سڕینەوەی کەشی کۆن
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// بەڕێوەبردنی داواکارییەکان (Fetch)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // --- زۆر گرنگ: ڕێگری لە پاشەکەوتکردنی ڤیدیۆ و ستریم ---
  // ئەگەر داواکارییەکە بۆ ڤیدیۆ، فایلە بێژەرەکان (.m3u8, .ts) یان ڤیدیۆ بوو
  if (
    event.request.destination === 'video' || 
    url.includes('.m3u8') || 
    url.includes('.ts') || 
    url.includes('stream')
  ) {
    // ڕاستەوخۆ لە ئینتەرنێتەوە بیهێنە و مەچۆ ناو کەش (Network Only)
    return event.respondWith(fetch(event.request));
  }

  // بۆ فایلەکانی تر (Style, JS, HTML)
  event.respondWith(
    caches.match(event.request).then(response => {
      // ئەگەر لە مۆبایلەکە هەبوو بیدەرێ، ئەگەر نا لە نێت بیهێنە
      return response || fetch(event.request).then(fetchResponse => {
        // ئەگەر فایلێکی نوێ بوو (بۆ نموونە لۆگۆی کەناڵ) پاشەکەوتی بکە
        return caches.open(CACHE_NAME).then(cache => {
          if (event.request.method === 'GET' && fetchResponse.status === 200) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // ئەگەر نێت نەبوو، لاپەڕەی سەرەکی نیشان بدە
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
