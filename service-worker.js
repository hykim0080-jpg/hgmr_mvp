// 캐시 버전을 올려줍니다. (코드를 크게 수정할 때마다 v2, v3로 올려주면 좋습니다)
const CACHE_NAME = 'hgmr-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './words.json'
];

// 1. 설치 및 캐시 저장 (새 서비스 워커가 즉시 대기열을 통과하도록 설정)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 즉시 활성화
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// 2. 활성화 및 예전 쓰레기 캐시 청소
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 현재 버전(v2)이 아닌 옛날 캐시(v1)는 모두 지워버림
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. 🌟 네트워크 우선(Network-First) 전략 🌟
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 일단 무조건 인터넷(서버)에서 최신 파일을 가져오려고 시도함
    fetch(event.request)
      .then((response) => {
        // 성공하면 캐시에도 최신 버전을 슬쩍 덮어씌움
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // 인터넷이 끊겨서 에러가 나면, 그때 캐시(오프라인 저장소)에서 꺼내줌
        return caches.match(event.request);
      })
  );
});