// 운명 관측소 PWA 서비스 워커 — scope: /destiny.html (NEXUS 본체에는 관여하지 않음).
// 페이지는 network-first(새 배포 즉시 반영, 오프라인 시 캐시 폴백),
// 해시 파일명 에셋·폰트는 cache-first.
const CACHE = "destiny-obs-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add("/destiny.html")).then(() => self.skipWaiting())
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
          caches.open(CACHE).then((c) => c.put("/destiny.html", copy));
          return res;
        })
        .catch(() => caches.match("/destiny.html"))
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
