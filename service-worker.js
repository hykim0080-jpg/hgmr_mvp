const CACHE_NAME = 'hgmr-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './words.json' // 단어 데이터 오프라인 저장
];

// 1. 파일들을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 2. 오프라인일 때 캐시에서 파일 꺼내주기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시 파일 반환, 없으면 인터넷에서 가져오기
        return response || fetch(event.request);
      })
  );
});