const CACHE = "tallyflow-shell-v3";
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const appPath = path => `${BASE_PATH}${path}`;
const APP_SHELL = [appPath("/"), appPath("/manifest.webmanifest"), appPath("/offline.html"), appPath("/icons/icon-192.png"), appPath("/icons/icon-512.png")];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(appPath("/"), copy)); return response;
    }).catch(async () => (await caches.match(req)) || (await caches.match(appPath("/"))) || (await caches.match(appPath("/offline.html"))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
    return response;
  })));
});
