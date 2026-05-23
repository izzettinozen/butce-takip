/*
 * Bütçe Takip — Service Worker
 *
 * Strateji:
 *  - Supabase API çağrıları: network-only (cache yok — taze veri önemli)
 *  - HTML gezinme (navigate): network-first, çevrimdışı → offline.html
 *  - Aynı kökenli statikler (JS/CSS/ikon/font): cache-first + opportunistik runtime cache
 *  - Diğer cross-origin istekler: passthrough (SW araya girmez)
 *
 * Sürümü değiştirdiğinizde eski cache'ler temizlenir.
 */

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const ON_YUKLE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(ON_YUKLE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Supabase: network-only (kimlik doğrulama / RLS için cache uygunsuz).
  if (url.hostname.endsWith(".supabase.co")) {
    return; // varsayılan tarayıcı davranışı
  }

  // HTML gezinme: network-first, başarısızsa offline sayfası.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((r) => r ?? new Response("offline", { status: 503 })),
      ),
    );
    return;
  }

  // Aynı köken statikler: cache-first, gerekirse ağdan al ve cache'le.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            // Sadece başarılı, basic yanıtları cache'le.
            if (res.ok && res.type === "basic") {
              const clone = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
      }),
    );
  }
});
