const CACHE_NAME = 'iptv-v1-final-fix';

// لێرەدا خاڵ (.) پێش ناوەکان زۆر گرنگە بۆ گیتھەب
const urlsToCache = [

  "index.html",
  "admin.html",
  "style.css",
  "app.js",
  "firebase-config.js",
  "admin.js",
  "manifest.json"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // بەکارهێنانی map بۆ ئەوەی ئەگەر فایلێک نەبوو هەموو پڕۆسەکە شکست نەهێنێت
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME && caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ١. چارەسەری وەستانی پەخش: ڕێگری لە پاشەکەوتکردنی ڤیدیۆ
  if (
    event.request.destination === 'video' || 
    url.includes('.m3u8') || 
    url.includes('.ts') || 
    url.includes('stream')
  ) {
    return event.respondWith(fetch(event.request));
  }

  // ٢. چارەسەری ئیرۆری گیتھەب: ستراتیژی Network-First بۆ فایلەکان
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        if (response) return response;
        
        // ئەگەر بە تەواوی ئۆفلاین بوو، لاپەڕەی سەرەکی نیشان بدە
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
