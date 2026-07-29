// 캐시 버전을 올려줍니다. (코드를 크게 수정할 때마다 v2, v3로 올려주면 좋습니다)
const CACHE_NAME = 'hgmr-cache-v4';
const urlsToCache = [
  './',
  './index.html',
  './words.json',
  './privacy.html',
  './terms.html'
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
          // 현재 버전이 아닌 옛날 캐시는 모두 지워버림
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. 🌟 네트워크 우선(Network-First) 전략 — 동일 출처 정적 자산에만 적용 🌟
//   ⚠️ 보안: Firebase/Firestore/인증 등 교차 출처·비-GET 요청은 절대 캐시하지 않음
//   (사용자 데이터·인증 토큰이 브라우저 캐시에 남는 것을 방지, POST 캐시 오류도 회피)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 이외(POST/PUT 등)는 SW가 손대지 않고 그대로 네트워크로 통과
  if (req.method !== 'GET') return;

  // 동일 출처 요청만 캐시 대상 (앱 자체 파일). 그 외(Firestore·gstatic·구글 등)는 통과
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        // 정상(200, basic) 응답만 캐시 — 오류·opaque 응답 캐시 금지
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});
