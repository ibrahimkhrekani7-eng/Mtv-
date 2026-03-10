// ناوی کەشەکە (هەر کاتێک گۆڕانکاریت کرد ئەم ناوە بگۆڕە بۆ نوێبوونەوە)
const CACHE_NAME = 'iptv-v1-final';

// لیستێکی زۆر ورد - تەنها ئەو فایلانەی لە تەنیشت index.html هەن
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192x192.png'
];

// ١. قۆناغی Install: داگرتنی فایلەکان بۆ ناو مۆبایلەکە
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('فایلەکان پاشەکەوت دەکرێن لە مۆبایلدا...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch((error) => {
        console.error('ئاگاداری: فایلێک نەدۆزرایەوە، دڵنیابە ناوی فایلەکانت ڕاستە!', error);
      })
  );
  self.skipWaiting();
});

// ٢. قۆناغی Activate: سڕینەوەی داتا کۆنەکان بۆ ئەوەی ئەپەکە قورس نەبێت
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('کەشی کۆن سڕایەوە:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// ٣. قۆناغی Fetch: وەرگرتنی داتا تەنانەت کاتێک نێت نییە
self.addEventListener('fetch', (event) => {
  // تەنها بۆ وەرگرتنی فایلەکان
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // ئەگەر فایلەکە لە مۆبایلەکەدا هەبوو (Offline)، ئەوەی بدەرێ
      if (response) {
        return response;
      }

      // ئەگەر لە مۆبایل نەبوو، بڕۆ لە ئینتەرنێت بیهێنە
      return fetch(event.request).then((networkResponse) => {
        // ئەگەر شتێکی نوێ بوو (وەک لۆگۆی کەناڵ)، کۆپییەکی بگرە بۆ جاری داهاتوو
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // ئەگەر نێت نەبوو و فایلەکەش پاشەکەوت نەکرابوو، لاپەڕەی سەرەکی نیشان بدە
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
