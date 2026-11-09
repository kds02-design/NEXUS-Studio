// 운명 관측소 PWA 서비스 워커.
// 배포 형태별 scope 는 등록부(destiny-main.jsx)가 결정:
//   NEXUS 동거 배포 → /destiny.html (본체에 관여하지 않음) / 전용 도메인 → /
// 페이지는 network-first(새 배포 즉시 반영, 오프라인 시 캐시 폴백),
// 해시 파일명 에셋·폰트는 cache-first.
const CACHE = "destiny-obs-v2";
// 캐시할 페이지 경로 — 등록 scope 에서 유도 ("/" 또는 "/destiny.html")
const PAGE = new URL(self.registration.scope).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(PAGE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("destiny-obs") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 페이지 내비게이션 — network-first
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(PAGE, copy));
          return res;
        })
        .catch(() => caches.match(PAGE))
    );
    return;
  }

  // 에셋·폰트 — cache-first (같은 오리진 + 구글 폰트만)
  const cacheable = url.origin === self.location.origin
    || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!cacheable) return;

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (res.type === "basic" || res.type === "cors")) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
