const CACHE_NAME = 'iptv-v1-2026';

// لێرەدا تەنها ئەو فایلانە بنووسە کە ڕاستەوخۆ لە فۆڵدەری سەرەکی پڕۆژەکەتدان
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192x192.png' // دڵنیابە ئەم وێنەیە لە تەنیشت index.html هەیە
];

// قۆناغی دامەزراندن
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('پاراستنی فایلە بنەڕەتییەکان لە کەشدا...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// قۆناغی چالاککردن و سڕینەوەی کەشی کۆن
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
    }).then(() => self.clients.claim())
  );
});

// وەرگرتنی داتا و کارکردن بە شێوازی ئۆفلاین
self.addEventListener('fetch', event => {
  // تەنها بۆ داواکارییەکانی وەرگرتنی فایل (GET)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // ئەگەر فایلەکە لە مۆبایلەکە پاشەکەوت کرابوو، ئەوە نیشان بدە
      if (cachedResponse) {
        return cachedResponse;
      }

      // ئەگەر لە کەشدا نەبوو، لە ئینتەرنێت بیهێنە
      return fetch(event.request).then(networkResponse => {
        // ئەگەر وێنەی کەناڵێک یان داتایەکی نوێ بوو، کۆپییەکی بگرە بۆ جاری داهاتوو
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // ئەگەر نێت نەبوو، لاپەڕەی سەرەکی نیشان بدە
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
